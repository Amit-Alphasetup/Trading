// ledger.js — OWNS: gates, trial clock, regression rule, capital block, wind-down.
// May import db + schema. MUST NOT touch the DOM.

import * as db from './db.js';
import * as S from './schema.js';

export async function profile() {
  let p = await db.get('profile', null);
  if (!p) { p = S.blankProfile(); await db.set('profile', p); }
  return p;
}
export const saveProfile = p => db.set('profile', p);

const days = (a, b) => Math.floor((b - a) / 86400000);
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;

// ---------- risk sizing ----------
export async function riskPct(p) {
  const r = await S.rules();
  const band = S.riskBand(p.capital);
  // Trial risk always wins; ceiling is a cap, never a target.
  const active = p.stage === 'live' && p.trial;
  return active ? Math.min(r.trialRiskPct, band.ceiling) : band.ceiling;
}

export async function positionSize(p, entry, stop) {
  const risk = Math.abs(entry - stop);
  if (!risk || !p.capital) return { qty: 0, riskRupees: 0, pct: 0 };
  const pct = await riskPct(p);
  const riskRupees = p.capital * pct / 100;
  return { qty: Math.floor(riskRupees / risk), riskRupees: Math.round(riskRupees), pct };
}

// ---------- backtest evidence (manual mode, ships now) ----------
export async function patternEvidence() {
  const rows = await db.all('backtests');
  const r = await S.rules();
  const map = {};
  for (const b of rows) {
    const m = map[b.pattern] || (map[b.pattern] = { n: 0, sumR: 0, wins: 0 });
    m.n++; m.sumR += (+b.rMultiple || 0); if (+b.rMultiple > 0) m.wins++;
  }
  for (const k in map) {
    const m = map[k];
    m.expectancy = m.sumR / m.n;
    m.winRate = Math.round(m.wins / m.n * 100);
    m.trustworthy = m.n >= r.btTrust;
    m.paperOK = m.n >= r.btPaper;
    m.liveOK = m.n >= r.btLive && m.expectancy > 0;
  }
  return map;
}

// Only patterns HE proved may be traded (plan B5).
export async function approvedSetups(stage) {
  const ev = await patternEvidence();
  return Object.keys(ev).filter(k => (stage === 'live' ? ev[k].liveOK : ev[k].paperOK));
}

// ---------- adherence ----------
export async function adherence(lastN = 20) {
  const t = (await db.all('trades')).filter(x => x.mode === 'live' && x.closed);
  const slice = t.slice(-lastN);
  if (!slice.length) return { pct: null, n: 0 };
  const ok = slice.filter(x => x.adherent).length;
  return { pct: Math.round(ok / slice.length * 100), n: slice.length };
}

export async function drawdownPct(p) {
  const peak = Math.max(p.peakEquity || 0, p.capital || 0);
  if (!peak) return 0;
  return +(((peak - p.capital) / peak) * 100).toFixed(1);
}

// ---------- the regression rule (B4) ----------
export async function checkRegression() {
  const p = await profile();
  if (p.stage !== 'live') return null;
  const r = await S.rules();
  const a = await adherence(20);
  const dd = await drawdownPct(p);
  const offPlan = (await db.all('violations'))
    .filter(v => v.type === 'off-plan' && !v.consumed).length;

  let reason = null;
  if (a.pct !== null && a.n >= 20 && a.pct < r.regressionFloor)
    reason = `rule-following ${a.pct}% is below ${r.regressionFloor}%`;
  else if (offPlan >= r.offPlanTrades)
    reason = `${offPlan} trades outside the approved setup list`;
  else if (dd >= r.drawdownTrigger)
    reason = `drawdown ${dd}% passed ${r.drawdownTrigger}%`;
  if (!reason) return null;

  // Regression PAUSES a trial, never resets it.
  p.stage = 'locked';
  p.lockedUntil = new Date(Date.now() + r.regressionLock * 86400000).toISOString();
  if (p.trial) {
    p.trial.regressions = (p.trial.regressions || 0) + 1;
    p.trial.pausedAt = new Date().toISOString();
  }
  await db.add('violations', { type: 'regression', reason, at: new Date().toISOString() });
  const failed = p.trial && p.trial.regressions >= r.regressionsToFail;
  if (failed) {
    p.stage = 'cooldown';
    p.lockedUntil = new Date(Date.now() + r.cooldownDays * 86400000).toISOString();
    p.trial = null;
    p.resets = (p.resets || 0) + 1;
  }
  await saveProfile(p);
  return { reason, failed };
}

// ---------- trial clock (C4) ----------
// Weekends, holidays, paused days and blocked days do not advance the clock.
export async function tickTrialDay({ blocked = false, holiday = false } = {}) {
  const p = await profile();
  if (!p.trial || p.stage !== 'live') return p;
  const now = new Date();
  if (isWeekend(now) || holiday) return p;
  const today = now.toISOString().slice(0, 10);
  if (p.trial.lastDay === today) return p;
  p.trial.lastDay = today;
  p.trial.dayCount = (p.trial.dayCount || 0) + 1; // blocked days still count on calendar
  if (blocked) p.trial.blockedDays = (p.trial.blockedDays || 0) + 1;
  await saveProfile(p);
  return p;
}

export async function trialStatus() {
  const p = await profile();
  if (!p.trial) return null;
  const ph = S.phase(p.phase);
  const r = await S.rules();
  const a = await adherence(9999);
  const d = p.trial.dayCount || 0, n = p.trial.tradeCount || 0;
  const daysLeft = Math.max(0, ph.calendarDays - d);
  const tradesLeft = Math.max(0, ph.minTrades - n);
  // Never fail for trading too little — extend instead.
  const extending = daysLeft === 0 && tradesLeft > 0;
  const canPass = tradesLeft === 0 && daysLeft === 0 &&
    a.pct !== null && a.pct >= r.adherencePass;
  return { days: d, daysLeft, trades: n, tradesLeft, extending, canPass,
    adherence: a.pct, need: r.adherencePass,
    regressions: (p.trial.regressions || 0), profitRequired: ph.profitRequired };
}

// ---------- the master gate ----------
// Returns every reason live trading is blocked right now. Empty = allowed.
export async function gate() {
  const p = await profile();
  const ph = S.phase(p.phase);
  const blocks = [];

  if (p.stage === 'paused')
    blocks.push({ code: 'paused', msg: 'Wind-down mode is on. Nothing decays while paused.' });

  if (p.capitalIsClean === false)
    blocks.push({ code: 'borrowed', msg: 'Capital is borrowed or already committed elsewhere. Live trading stays blocked.' });
  if (p.capitalIsClean === null)
    blocks.push({ code: 'unasked', msg: 'Answer the capital-source question before trading.' });

  if (p.capital < ph.minCapital) {
    const short = ph.minCapital - p.capital;
    blocks.push({ code: 'capital',
      msg: `Blocked — needs ₹${ph.minCapital.toLocaleString('en-IN')}, short ₹${short.toLocaleString('en-IN')}.` });
  }

  if (p.lockedUntil && new Date(p.lockedUntil) > new Date()) {
    blocks.push({ code: 'locked',
      msg: `Locked until ${new Date(p.lockedUntil).toLocaleDateString('en-IN')} after a regression.` });
  }

  const live = await approvedSetups('live');
  if (!live.length)
    blocks.push({ code: 'evidence', msg: 'No pattern has enough marked examples with positive expectancy yet.' });

  return { blocks, allowed: blocks.length === 0, stage: p.stage, phase: ph };
}

// ---------- wind-down (G6) ----------
export async function pause() {
  const p = await profile();
  p.pausedSince = new Date().toISOString();
  p.prevStage = p.stage;
  p.stage = 'paused';
  await saveProfile(p);
}
export async function resume() {
  const p = await profile();
  if (p.stage !== 'paused') return;
  const held = days(new Date(p.pausedSince), new Date());
  if (p.lockedUntil) // locks freeze too, they don't run down while paused
    p.lockedUntil = new Date(new Date(p.lockedUntil).getTime() + held * 86400000).toISOString();
  p.stage = p.prevStage || 'learning';
  p.pausedSince = null;
  await saveProfile(p);
}

// ---------- honest projection (C1) ----------
export async function projection() {
  const t = (await db.all('trades')).filter(x => x.mode === 'live' && x.closed);
  if (t.length < 30) {
    return { known: false, text:
      "We don't know how long this takes. No reliable data exists. Any estimate here comes from our own rules, not from studying real traders. After 30 of your own trades, we'll replace this with a projection built from your actual pace." };
  }
  const first = new Date(t[0].closedAt), last = new Date(t[t.length - 1].closedAt);
  const span = Math.max(1, days(first, last));
  const perDay = t.length / span;
  const p = await profile();
  const ph = S.phase(p.phase);
  const remaining = Math.max(0, ph.minTrades - (p.trial ? p.trial.tradeCount : 0));
  const est = Math.ceil(remaining / perDay);
  return { known: true, perDay: +perDay.toFixed(2), resets: p.resets || 0, text:
    `At your actual pace (${perDay.toFixed(2)} trades/day) this trial needs about ${est} more calendar days. Resets so far: ${p.resets || 0}.` };
}
