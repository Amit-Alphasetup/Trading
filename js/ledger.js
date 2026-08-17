// ledger.js — OWNS: gates, phases, trials, the regression rule, position
// sizing, projection, and the marked-example (backtest) evidence that drives
// every unlock.
import * as store from './store.js';
const { get, set, all, add, put, del } = store;
import * as R from './rules.js';
const { phase, riskBand, SETUPS, blankProfile, marketSizeFactor } = R;
import * as mind from './mind.js';
const { sizeFactor, tilt } = mind;
import * as learn from './learn.js';
const { patternLocked, unlockedPatterns, readiness } = learn;
// ledger.js — OWNS: gates, trial clock, regression rule, capital block, wind-down.
// May import db + schema. MUST NOT touch the DOM.






export async function profile() {
  let p = await get('profile', null);
  if (!p) { p = blankProfile(); await set('profile', p); }
  return p;
}
export const saveProfile = p => set('profile', p);

const days = (a, b) => Math.floor((b - a) / 86400000);
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;

// ---------- risk sizing ----------
export async function riskPct(p) {
  const r = await R.rules();
  const band = riskBand(p.capital);
  // Trial risk always wins; ceiling is a cap, never a target.
  const active = p.stage === 'live' && p.trial;
  return active ? Math.min(r.trialRiskPct, band.ceiling) : band.ceiling;
}

export async function positionSize(p, entry, stop) {
  const risk = Math.abs(entry - stop);
  if (!risk || !p.capital) return { qty: 0, riskRupees: 0, pct: 0, capped: false };
  const pct = await riskPct(p);
  // Two independent reducers. They must stay separate: the journal consumes the
  // winning-streak cap after a trade, and a VIX-driven cut must never burn it.
  const streakFactor = await sizeFactor();
  const marketFactor = await marketSizeFactor();
  const factor = streakFactor * marketFactor;
  const riskRupees = p.capital * pct / 100 * factor;
  return { qty: Math.floor(riskRupees / risk), riskRupees: Math.round(riskRupees),
    pct: +(pct * factor).toFixed(3),
    streakCapped: streakFactor < 1, marketCapped: marketFactor < 1,
    capped: factor < 1 };
}

// ---------- backtest evidence (manual mode, ships now) ----------
export async function patternEvidence() {
  const rows = await all('backtests');
  const r = await R.rules();
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
  const proved = Object.keys(ev).filter(k => (stage === 'live' ? ev[k].liveOK : ev[k].paperOK));
  // Evidence is not enough: the unit that teaches the pattern must be passed too.
  return await unlockedPatterns(proved);
}

// ---------- adherence ----------
export async function adherence(lastN = 20) {
  const t = (await all('trades')).filter(x => x.mode === 'live' && x.closed);
  const slice = t.slice(-lastN);
  if (!slice.length) return { pct: null, n: 0 };
  const ok = slice.filter(x => x.adherent).length;
  return { pct: Math.round(ok / slice.length * 100), n: slice.length };
}

// Drawdown must be measured on trading performance alone. Capital includes
// deposits; a ₹50,000 deposit would otherwise raise the peak and make an
// ordinary dip look like a 12% drawdown, firing a false regression.
export async function drawdownPct(p) {
  const rows = (await all('trades'))
    .filter(t => t.mode === 'live' && t.closed)
    .sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt));
  if (!rows.length) return 0;
  const base = p.tradingBase || p.capital || 1;
  let eq = base, peak = base, worst = 0;
  for (const t of rows) {
    eq += (+t.pnl || 0);
    peak = Math.max(peak, eq);
    worst = Math.max(worst, (peak - eq) / peak * 100);
  }
  return +worst.toFixed(1);
}

// ---------- the regression rule (B4) ----------
export async function checkRegression() {
  const p = await profile();
  if (p.stage !== 'live') return null;
  const r = await R.rules();
  const a = await adherence(20);
  const dd = await drawdownPct(p);
  const offPlanRows = (await all('violations'))
    .filter(v => v.type === 'off-plan' && !v.consumed);
  const offPlan = offPlanRows.length;

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
  p.lockedAt = new Date().toISOString();
  p.lockedUntil = new Date(Date.now() + r.regressionLock * 86400000).toISOString();
  if (p.trial) {
    p.trial.regressions = (p.trial.regressions || 0) + 1;
    p.trial.pausedAt = new Date().toISOString();
  }
  await add('violations', { type: 'regression', reason, at: new Date().toISOString() });
  // Consume the off-plan trades that caused this. Without it the same two rows
  // would trigger a fresh regression on every single app open, forever.
  for (const v of offPlanRows) { v.consumed = true; await put('violations', v); }
  const failed = p.trial && p.trial.regressions >= r.regressionsToFail;
  if (failed) {
    p.stage = 'cooldown';
    p.lockedUntil = new Date(Date.now() + r.cooldownDays * 86400000).toISOString();
    // Archive rather than delete: attempt counts and failure patterns are the
    // most useful thing a failed trial produces.
    const tr = p.activeTrack || 'swing';
    p.trialHistory = [...(p.trialHistory || []), {
      ...p.trial, track: tr, passed: false, endedAt: new Date().toISOString(), reason }];
    if (p.trials) delete p.trials[tr];
    p.activeTrack = null;
    p.trial = null;
    p.resets = (p.resets || 0) + 1;
  }
  await saveProfile(p);
  return { reason, failed };
}

// ---------- trial clock (C4) ----------
// Weekends, holidays, paused days and blocked days do not advance the clock.
// Counts every weekday elapsed since the last tick, not just today. Otherwise
// a week without opening the app is a week the trial never lived through.
export async function tickTrialDay({ blocked = false, holiday = false } = {}) {
  const p = await profile();
  if (!p.trial || p.stage !== 'live') return p;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (p.trial.lastDay === today) return p;

  const from = p.trial.lastDay ? new Date(p.trial.lastDay + 'T00:00:00')
                               : new Date(p.trial.startedISO);
  let added = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + 1);
  while (cur.toISOString().slice(0, 10) <= today && added < 400) {
    if (!isWeekend(cur)) added++;
    cur.setDate(cur.getDate() + 1);
  }
  if (isWeekend(now) && added === 0) return p;
  if (holiday && added > 0) added--;

  p.trial.lastDay = today;
  p.trial.dayCount = (p.trial.dayCount || 0) + added;
  if (blocked) p.trial.blockedDays = (p.trial.blockedDays || 0) + 1;
  await saveProfile(p);
  return p;
}

export async function trialStatus(track) {
  const p = await profile();
  const tr = track || p.activeTrack || 'swing';
  const t = (p.trials || {})[tr] || (tr === (p.activeTrack || 'swing') ? p.trial : null);
  if (!t) return null;
  const ph = phase(p.phase);
  const r = await R.rules();
  const spec = TRACKS[tr] || { days: ph.calendarDays, trades: ph.minTrades };
  // Adherence measured on this track's trades only.
  const rows = (await all('trades')).filter(x => x.mode === 'live' && x.closed
    && trackOf(x.setup) === tr && new Date(x.closedAt) >= new Date(t.startedISO));
  const a = rows.length ? { pct: Math.round(rows.filter(x => x.adherent).length / rows.length * 100), n: rows.length }
                        : { pct: null, n: 0 };
  const d = t.dayCount || 0, n = rows.length;
  const daysLeft = Math.max(0, spec.days - d);
  const tradesLeft = Math.max(0, spec.trades - n);
  // Never fail for trading too little — extend instead.
  const extending = daysLeft === 0 && tradesLeft > 0;
  const canPass = tradesLeft === 0 && daysLeft === 0 &&
    a.pct !== null && a.pct >= r.adherencePass;
  return { track: tr, label: (TRACKS[tr] || {}).label || tr,
    days: d, daysLeft, trades: n, tradesLeft, extending, canPass,
    adherence: a.pct, need: r.adherencePass, attempt: t.attempt || 1,
    regressions: (t.regressions || 0), profitRequired: ph.profitRequired };
}

// ---------- the master gate ----------
// Returns every reason live trading is blocked right now. Empty = allowed.
export async function gate() {
  const p = await profile();
  const ph = phase(p.phase);
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

// ---------- regression recovery ----------
// The old design dropped him to `locked` and let the lock expire. That restores
// permission without restoring anything else. Coming back should require
// demonstrating the thing that was lost.
export const RECOVERY_PAPER_TRADES = 10;

export async function recoveryStatus() {
  const p = await profile();
  if (p.stage !== 'locked' && p.stage !== 'recovering') return null;
  const r = await R.rules();
  const since = p.lockedAt || p.lockedUntil;
  const lockExpired = !p.lockedUntil || new Date(p.lockedUntil) <= new Date();

  const papers = (await all('trades')).filter(t => t.mode === 'paper' && t.closed
    && since && new Date(t.closedAt) > new Date(since));
  const clean = papers.filter(t => t.adherent).length;
  const reviewDone = !!(await get('reviews', {}))[Object.keys(await get('reviews', {})).slice(-1)[0]];

  const checks = [
    { ok: lockExpired, t: p.lockedUntil
        ? `15-day lock expires ${new Date(p.lockedUntil).toLocaleDateString('en-IN')}`
        : 'Lock expired' },
    { ok: clean >= RECOVERY_PAPER_TRADES,
      t: `${RECOVERY_PAPER_TRADES} paper trades with full rule-following since the regression (${clean})` },
    { ok: !!p.regressionNote, t: 'Written account of what went wrong' }
  ];
  return { checks, ok: checks.every(c => c.ok), clean, need: RECOVERY_PAPER_TRADES };
}

export async function writeRegressionNote(text) {
  if (!text || text.trim().length < 60)
    throw new Error('At least 60 characters. What actually happened matters more than that it happened.');
  const p = await profile();
  p.regressionNote = { text: text.trim(), at: new Date().toISOString() };
  await saveProfile(p);
  await add('amendments', { from: 'regression', to: 'recovery note',
    reason: text.trim().slice(0, 200), at: new Date().toISOString() });
}

export async function restoreFromRegression() {
  const s = await recoveryStatus();
  if (!s || !s.ok) throw new Error('Recovery requirements are not met.');
  const p = await profile();
  p.stage = 'live';
  p.lockedUntil = null;
  p.regressionNote = null;
  p.recoveries = (p.recoveries || 0) + 1;
  await saveProfile(p);
  return p;
}

// ---------- failed trial ----------
// A failed trial is a restart of that track, not of the whole system. What he
// learned does not evaporate; the evidence of live discipline does.
export async function failedTrialStatus() {
  const p = await profile();
  if (p.stage !== 'cooldown') return null;
  const over = !p.lockedUntil || new Date(p.lockedUntil) <= new Date();
  const hist = (p.trialHistory || []).filter(h => !h.passed);
  return {
    cooldownOver: over,
    until: p.lockedUntil,
    attempts: hist.length,
    // Repeated failures are information, not just a counter.
    pattern: hist.length >= 2
      ? 'Two or more failed trials. The honest question is whether the rules are wrong for you, or whether live money is the problem. Both are answerable; neither is answered by trying again immediately.'
      : null
  };
}

export async function restartTrial(track = 'swing') {
  const p = await profile();
  if (p.stage === 'cooldown' && p.lockedUntil && new Date(p.lockedUntil) > new Date())
    throw new Error('The cooldown is still running.');
  // Clear the failed track's record. It is already archived in trialHistory,
  // and leaving it here would make startTrial refuse.
  if (p.trials && p.trials[track]) {
    if (!p.trials[track].endedAt) {
      p.trialHistory = [...(p.trialHistory || []), {
        ...p.trials[track], track, passed: false, endedAt: new Date().toISOString(),
        reason: 'restarted after cooldown' }];
    }
    delete p.trials[track];
  }
  p.stage = 'learning';
  p.lockedUntil = null;
  p.trial = null;
  await saveProfile(p);
  return await startTrial(track);
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
  const t = (await all('trades')).filter(x => x.mode === 'live' && x.closed);
  if (t.length < 30) {
    return { known: false, text:
      "We don't know how long this takes. No reliable data exists. Any estimate here comes from our own rules, not from studying real traders. After 30 of your own trades, we'll replace this with a projection built from your actual pace." };
  }
  const first = new Date(t[0].closedAt), last = new Date(t[t.length - 1].closedAt);
  const span = Math.max(1, days(first, last));
  const perDay = t.length / span;
  const p = await profile();
  const ph = phase(p.phase);
  const remaining = Math.max(0, ph.minTrades - (p.trial ? p.trial.tradeCount : 0));
  const est = Math.ceil(remaining / perDay);
  return { known: true, perDay: +perDay.toFixed(2), resets: p.resets || 0, text:
    `At your actual pace (${perDay.toFixed(2)} trades/day) this trial needs about ${est} more calendar days. Resets so far: ${p.resets || 0}.` };
}

// ---------- trial lifecycle (was missing: nothing ever created a trial) ----------
// Swing and intraday are different games with different frequencies. Mixing
// them into one trial makes the statistics meaningless and lets fast intraday
// volume satisfy a trade minimum meant for slow swing evidence.
export const TRACKS = {
  swing:    { label: 'Equity swing', days: 90,  trades: 40 },
  intraday: { label: 'Equity intraday', days: 45, trades: 40 },
  options:  { label: 'Options', days: 120, trades: 60 }
};

export function trackOf(setup) {
  if (SETUPS.intraday.includes(setup)) return 'intraday';
  if (SETUPS.options.includes(setup)) return 'options';
  return 'swing';
}

export async function canStartTrial(track = 'swing') {
  const p = await profile();
  const ph = phase(p.phase);
  const why = [];
  const trials = p.trials || {};
  if (trials[track] && !trials[track].endedAt) why.push(`A ${track} trial is already running.`);
  if (p.stage === 'paused') why.push('Wind-down mode is on.');
  if (p.stage === 'cooldown') why.push('Cooldown after a failed trial is still running.');
  if (p.lockedUntil && new Date(p.lockedUntil) > new Date()) why.push('Still locked after a regression.');
  if (p.capital < ph.minCapital) why.push(`Needs ₹${ph.minCapital.toLocaleString('en-IN')} minimum capital.`);
  if (p.capitalIsClean !== true) why.push('The capital-source question must be answered "all mine".');
  const live = await approvedSetups('live');
  if (!live.length) why.push('No pattern has 60 marked examples with positive expectancy yet.');
  if (p.phase === 1) why.push('Phase 1 has no live trial. Pass it to reach the Equity Trial.');
  if (track === 'options' && p.phase < 3) why.push('The options trial belongs to Phase 3.');
  if (track !== 'options' && p.phase > 2 && !(trials.swing && trials.swing.passed))
    why.push('Pass the swing trial before returning to it.');
  return { ok: why.length === 0, why, phase: ph, track, spec: TRACKS[track] };
}

export async function startTrial(track = 'swing') {
  const c = await canStartTrial(track);
  if (!c.ok) throw new Error(c.why[0]);
  const p = await profile();
  p.trials = p.trials || {};
  p.trials[track] = { track, startedISO: new Date().toISOString(), tradeCount: 0,
    dayCount: 0, regressions: 0, blockedDays: 0, lastDay: null, attempt:
      ((p.trialHistory || []).filter(h => h.track === track).length + 1) };
  // `trial` remains the active-track pointer so existing logic keeps working.
  p.trial = p.trials[track];
  p.activeTrack = track;
  p.stage = 'live';
  await saveProfile(p);
  return p;
}

// Phase 1 has no live trial. It passes on evidence, drills and units.
export async function phase1Status() {
  const r = await R.rules();
  const ev = await patternEvidence();
  const papers = (await all('trades')).filter(t => t.mode === 'paper' && t.closed).length;
  const rd = await readiness(r, ev, papers);
  return {
    bars: rd.bars, ok: rd.ok,
    checks: rd.bars.map(b => ({ ok: b.ok, t: `${b.label}: ${b.now}/${b.need}` }))
  };
}

// The only way profile.phase ever changes.
export async function advancePhase() {
  const p = await profile();
  if (p.phase === 1) {
    const s = await phase1Status();
    if (!s.ok) throw new Error('Phase 1 requirements are not met.');
    p.phase = 2; p.stage = 'learning'; p.trial = null;
    await saveProfile(p);
    return p;
  }
  const t = await trialStatus();
  if (!t) throw new Error('No trial has run for this phase.');
  if (!t.canPass) throw new Error('The trial has not met its behaviour bar.');
  if (t.profitRequired) {
    const rows = (await all('trades')).filter(x => x.mode === 'live' && x.closed);
    const exp = rows.reduce((a, x) => a + (+x.rMultiple || 0), 0) / (rows.length || 1);
    if (exp <= 0) throw new Error(
      `Behaviour passed but expectancy is ${exp.toFixed(2)}R. This phase requires a real edge. The honest recommendation is to return to equity rather than retry indefinitely.`);
  }
  const tr = p.activeTrack || 'swing';
  p.trialHistory = [...(p.trialHistory || []), {
    ...p.trial, track: tr, passed: true, endedAt: new Date().toISOString() }];
  if (p.trials && p.trials[tr]) p.trials[tr].passed = true, p.trials[tr].endedAt = new Date().toISOString();
  p.phase = Math.min(4, p.phase + 1);
  p.stage = 'learning';
  p.trial = null;
  await saveProfile(p);
  return p;
}


// ===== MARKED EXAMPLES (BACKTEST) =====
// backtest.js — OWNS: marked historical examples, duplicate detection, the
// two-step marking discipline. Imports db + schema + learn.
// This is the most trusted input in the app: every expectancy number, every
// unlock and the Monte Carlo all rest on these rows being honest.




// Step 1: commit to the trade BEFORE revealing the outcome.
// Unit 4's discipline, enforced rather than suggested.
export async function stage(f) {
  const need = ['pattern', 'symbol', 'date', 'entry', 'stop', 'target'];
  for (const k of need) if (f[k] === '' || f[k] == null) throw new Error(`Missing: ${k}`);

  const locked = await patternLocked(f.pattern);
  if (locked) throw new Error(`Locked — pass the "${locked.title}" unit in Learn first.`);

  const entry = +f.entry, stop = +f.stop, target = +f.target;
  if (!(entry > 0) || !(stop > 0) || !(target > 0)) throw new Error('Entry, stop and target must be positive.');
  const risk = Math.abs(entry - stop);
  if (!risk) throw new Error('Stop cannot equal entry.');
  const dir = stop < entry ? 1 : -1;
  if ((target - entry) * dir <= 0) throw new Error('Target is on the wrong side of entry.');

  const dup = await findDuplicate(f.symbol, f.date, f.pattern);
  if (dup) throw new Error(`Already marked: ${dup.symbol} on ${dup.date} as ${dup.pattern}.`);

  const pending = {
    pattern: f.pattern, symbol: String(f.symbol).trim().toUpperCase(),
    date: f.date, entry, stop, target, dir,
    rr: +(Math.abs(target - entry) / risk).toFixed(2),
    note: f.note || '', stagedAt: new Date().toISOString()
  };
  await set('btPending', pending);
  return pending;
}

export const pending = () => get('btPending', null);
export const discard = () => set('btPending', null);

// Step 2: reveal what happened and record it. Entry, stop and target are taken
// from the staged record and cannot be edited now — that is the whole point.
export async function commit(exitPrice, outcome) {
  const p = await pending();
  if (!p) throw new Error('Nothing staged.');
  const exit = +exitPrice;
  if (!(exit > 0)) throw new Error('Exit price required.');

  const risk = Math.abs(p.entry - p.stop);
  const row = {
    ...p,
    exit,
    rMultiple: +(((exit - p.entry) * p.dir) / risk).toFixed(2),
    outcome: outcome || 'other',      // target | stop | other
    at: new Date().toISOString(),
    // How long he sat between committing and revealing. Near-zero repeatedly
    // suggests the outcome was already known when the entry was written.
    revealGapMs: Date.now() - new Date(p.stagedAt).getTime()
  };
  const id = await add('backtests', row);
  await set('btPending', null);
  return { ...row, id };
}

// ---------- duplicate detection ----------
// Same symbol + same date + same pattern is the same example. Without this,
// thirty entries of one good trade look like thirty examples.
export async function findDuplicate(symbol, date, pattern) {
  if (!symbol || !date) return null;
  const sym = String(symbol).trim().toUpperCase();
  const rows = await all('backtests');
  return rows.find(r => r.symbol === sym && r.date === date && r.pattern === pattern) || null;
}

export async function integrity() {
  const rows = await all('backtests');
  const seen = new Map();
  const dupes = [], undated = [];
  for (const r of rows) {
    if (!r.symbol || !r.date) { undated.push(r); continue; }
    const k = r.symbol + '|' + r.date + '|' + r.pattern;
    if (seen.has(k)) dupes.push(r); else seen.set(k, r);
  }
  // Examples committed within 10 seconds of staging: the outcome was probably
  // already on screen. Not proof, but worth surfacing to him.
  const instant = rows.filter(r => r.revealGapMs != null && r.revealGapMs < 10000);
  const winRate = rows.length
    ? Math.round(rows.filter(r => r.rMultiple > 0).length / rows.length * 100) : 0;
  return {
    total: rows.length, dupes: dupes.length, undated: undated.length,
    instant: instant.length, winRate,
    // A backtest win rate this high almost always means inconvenient examples
    // were quietly excluded, not that the pattern is exceptional.
    suspiciousWinRate: rows.length >= 20 && winRate >= 80
  };
}

// ---------- browsing and correcting ----------
export async function list(pattern) {
  const rows = await all('backtests');
  const f = pattern ? rows.filter(r => r.pattern === pattern) : rows;
  return f.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

export const remove = id => del('backtests', id);

export async function patterns() {
  const rows = await all('backtests');
  const names = [...new Set([...SETUPS.swing, ...SETUPS.intraday, ...SETUPS.options,
    ...rows.map(r => r.pattern)])];
  return await unlockedPatterns(names);
}
