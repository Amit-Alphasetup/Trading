// journal.js — OWNS: trade records, the timestamp lock, adherence scoring.
// Imports db + schema + ledger. Never touches the DOM.

import * as db from './db.js';
import * as S from './schema.js';
import * as L from './ledger.js';

// The rules he is scored against on every trade.
export const CHECKLIST = [
  'Entry matched the planned trigger',
  'Position size was the calculated size',
  'Stop was placed before or at entry',
  'Stop was never widened',
  'Exit followed the plan (target, stop or written trail)',
  'Setup was on the approved list',
  'No revenge or boredom trade'
];

export const REGIMES = ['Trending', 'Rangebound', 'Event', 'High-IV', 'Low-IV', 'Expiry'];
export const EXITS = ['target', 'stop', 'trailed', 'discretionary'];

// ---------- pre-trade card: locked and timestamped on save ----------
export async function openTrade(f) {
  const p = await L.profile();
  const need = ['setup', 'thesis', 'entry', 'stop', 'target', 'regime', 'invalidation'];
  for (const k of need) if (f[k] === '' || f[k] == null) throw new Error(`Missing: ${k}`);

  const entry = +f.entry, stop = +f.stop, target = +f.target;
  if (!(entry > 0) || !(stop > 0) || !(target > 0)) throw new Error('Entry, stop and target must be positive.');
  const risk = Math.abs(entry - stop);
  if (!risk) throw new Error('Stop cannot equal entry.');
  const dir = stop < entry ? 1 : -1;
  if ((target - entry) * dir <= 0) throw new Error('Target is on the wrong side of entry.');

  const mode = f.mode === 'live' ? 'live' : 'paper';
  if (mode === 'live') {
    const g = await L.gate();
    if (!g.allowed) throw new Error('Live trading is blocked: ' + g.blocks[0].msg);
  }
  const approved = await L.approvedSetups(mode);
  if (!approved.includes(f.setup)) {
    await db.add('violations', { type: 'off-plan', setup: f.setup, at: new Date().toISOString() });
    throw new Error(`"${f.setup}" is not on your approved list. Logged as an off-plan attempt.`);
  }

  const size = await L.positionSize(p, entry, stop);
  const rr = +(Math.abs(target - entry) / risk).toFixed(2);

  const trade = {
    mode, setup: f.setup, thesis: f.thesis, entry, stop, target,
    regime: f.regime, confidence: +f.confidence || 3, emotionPre: +f.emotionPre || 3,
    invalidation: f.invalidation, qty: size.qty, riskRupees: size.riskRupees,
    riskPct: size.pct, rr,
    // THE LOCK. Written once, never editable, compared against the broker fill time.
    lockedAt: new Date().toISOString(),
    closed: false, adherent: null, shots: []
  };
  const id = await db.add('trades', trade);
  return { ...trade, id };
}

export async function openTrades() {
  return (await db.all('trades')).filter(t => !t.closed);
}

// ---------- the anti-fraud check (B6 layer 2) ----------
// If the card was written AFTER the order hit the exchange, it is not a plan.
export function timestampVerdict(trade) {
  if (!trade.exchangeAt) return { state: 'unverified', msg: 'No broker timestamp yet (Sprint 4).' };
  const late = new Date(trade.lockedAt) > new Date(trade.exchangeAt);
  return late
    ? { state: 'violation', msg: 'Card was written after the order. Marked non-adherent automatically.' }
    : { state: 'clean', msg: 'Card was written before the order.' };
}

// ---------- post-trade card ----------
export async function closeTrade(id, f) {
  const rows = await db.all('trades');
  const t = rows.find(x => x.id === id);
  if (!t) throw new Error('Trade not found');
  if (t.closed) throw new Error('Already closed');

  const exit = +f.exit;
  if (!(exit > 0)) throw new Error('Exit price required.');
  const risk = Math.abs(t.entry - t.stop);
  const dir = t.stop < t.entry ? 1 : -1;

  t.exit = exit;
  t.rMultiple = +(((exit - t.entry) * dir) / risk).toFixed(2);
  t.pnl = Math.round((exit - t.entry) * dir * (t.qty || 0));
  t.exitReason = f.exitReason;
  t.emotionDuring = +f.emotionDuring || 3;
  t.lesson = f.lesson || '';
  t.checks = f.checks || [];          // array of booleans, one per CHECKLIST item
  t.closed = true;
  t.closedAt = new Date().toISOString();

  const allChecked = t.checks.length === CHECKLIST.length && t.checks.every(Boolean);
  const stamp = timestampVerdict(t);
  // A discretionary exit is flagged but is not by itself a violation.
  t.adherent = allChecked && stamp.state !== 'violation';
  t.flags = [];
  if (f.exitReason === 'discretionary') t.flags.push('discretionary exit');
  if (stamp.state === 'violation') t.flags.push('late journal entry');

  await db.put('trades', t);

  if (t.mode === 'live') {
    const p = await L.profile();
    p.capital = Math.max(0, (p.capital || 0) + t.pnl);
    p.peakEquity = Math.max(p.peakEquity || 0, p.capital);
    if (p.trial) p.trial.tradeCount = (p.trial.tradeCount || 0) + 1;
    await L.saveProfile(p);
    await L.checkRegression();
  }
  return t;
}

// ---------- summary used by the status screen ----------
export async function stats(mode) {
  const t = (await db.all('trades')).filter(x => x.closed && (!mode || x.mode === mode));
  if (!t.length) return { n: 0 };
  const r = await S.rules();
  const wins = t.filter(x => x.rMultiple > 0).length;
  const sumR = t.reduce((a, x) => a + x.rMultiple, 0);
  const ok = t.filter(x => x.adherent).length;
  return {
    n: t.length,
    winRate: Math.round(wins / t.length * 100),
    expectancy: t.length >= r.minTagSample ? +(sumR / t.length).toFixed(2) : null,
    adherence: Math.round(ok / t.length * 100),
    needForNumber: Math.max(0, r.minTagSample - t.length)
  };
}
