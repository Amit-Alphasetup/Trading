// mind.js — OWNS: pre-market state gate, tilt interrupts, the Trading
// Constitution, the seven drills, blackout mode, and the weekly review.
// Imports store only — nothing above it, so nothing can create a cycle.
import * as store from './store.js';
const { get, set, all, add } = store;
// psych.js — OWNS: pre-market state gate, tilt interrupts, the Constitution.
// Imports db + schema ONLY. Must not import ledger or journal (they import this).


const MIN = 60000;
const today = () => new Date().toISOString().slice(0, 10);

// ---------- E2: pre-market state gate ----------
export async function todayState() {
  const log = await get('stateLog', {});
  return log[today()] || null;
}

export async function logState(f) {
  const s = {
    sleep: +f.sleep, stress: +f.stress, physical: f.physical || '',
    stressors: f.stressors || '', needMoney: !!f.needMoney,
    at: new Date().toISOString(), override: null
  };
  const reasons = [];
  if (s.sleep < 5) reasons.push(`sleep ${s.sleep}h is under 5`);
  if (s.stress >= 4) reasons.push(`stress ${s.stress}/5`);
  if (s.needMoney) reasons.push('you need money from this account this month');
  s.blocked = reasons.length > 0;
  s.reasons = reasons;

  const log = await get('stateLog', {});
  log[today()] = s;
  await set('stateLog', log);
  return s;
}

export async function override(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 100) throw new Error(`${words}/100 words. Write the full justification.`);
  const log = await get('stateLog', {});
  const s = log[today()];
  if (!s) throw new Error('Log your state first.');
  s.override = { text, at: new Date().toISOString(), words };
  s.blocked = false;
  await set('stateLog', log);
  await add('violations', { type: 'gate-override', reason: text.slice(0, 200), at: s.override.at });
  return s;
}

export async function overrideHistory() {
  const log = await get('stateLog', {});
  return Object.entries(log).filter(([, s]) => s.override).map(([d, s]) => ({ date: d, ...s.override }));
}

// ---------- E3: tilt interrupts ----------
// Returns [] when clear, otherwise a list of blocks/warnings.
export async function tilt() {
  const t = (await all('trades')).filter(x => x.closed).sort(
    (a, b) => new Date(a.closedAt) - new Date(b.closedAt));
  const now = Date.now();
  const out = [];
  if (!t.length) return out;

  const recent = t.filter(x => now - new Date(x.closedAt).getTime() < 45 * MIN);
  const losses = recent.filter(x => x.rMultiple < 0);
  if (losses.length >= 2) {
    const last = new Date(losses[losses.length - 1].closedAt).getTime();
    const until = last + 30 * MIN;
    if (now < until) out.push({ hard: true, code: 'cooldown',
      msg: `Two losses inside 45 minutes. Trading locked for ${Math.ceil((until - now) / MIN)} more minutes.` });
  }

  const last3 = t.slice(-3);
  if (last3.length === 3 && last3.every(x => x.rMultiple > 0)) {
    const since = t.length - (await get('winCapAnchor', 0));
    if (since < 3) out.push({ hard: false, code: 'overconfidence',
      msg: 'Three wins in a row. Size capped at half for the next 3 trades. Winning streaks kill more accounts than losing ones.' });
  }

  const lastExit = new Date(t[t.length - 1].closedAt).getTime();
  if (now - lastExit < 5 * MIN) out.push({ hard: false, code: 'rapid',
    msg: 'Under 5 minutes since your last exit. Is this a setup, or are you still in the last trade?' });

  return out;
}

// Applied inside position sizing. 0.5 = half size.
export async function sizeFactor() {
  const flags = await tilt();
  return flags.some(f => f.code === 'overconfidence') ? 0.5 : 1;
}

export async function markWinCapUsed() {
  const n = (await all('trades')).filter(x => x.closed).length;
  await set('winCapAnchor', n);
}

// ---------- E1: the Trading Constitution ----------
// Amendable only on Sundays, never mid-drawdown. Every change logged with a reason.
export async function constitution() {
  return await get('constitution', { text: '', updated: null });
}

export async function amend(text, reason, inDrawdown) {
  if (new Date().getDay() !== 0)
    throw new Error('The Constitution can only be amended on a Sunday. Not today.');
  if (inDrawdown)
    throw new Error('You are in drawdown. Rules cannot be loosened while losing.');
  if (!reason || reason.trim().length < 20)
    throw new Error('Write a real reason — at least 20 characters. The amendment history is a diagnostic.');
  const prev = await constitution();
  await add('amendments', {
    from: prev.text, to: text, reason: reason.trim(), at: new Date().toISOString()
  });
  await set('constitution', { text, updated: new Date().toISOString() });
}

export const amendments = () => all('amendments');


// ===== DRILLS, BLACKOUT, WEEKLY REVIEW =====
// drills.js — OWNS: the seven psychology drills and the enforced review.
// Imports db only.


export const DRILLS = [
  { id: 'drawdown', name: 'Drawdown Endurance', tests: 'Executing through pain',
    target: 8, unit: 'forced losses at correct size',
    how: 'Take 8 consecutive planned losses in paper trading. Any size deviation on any one of them resets the count to zero.' },
  { id: 'patience', name: 'Patience Test', tests: 'Not forcing trades',
    target: 10, unit: 'clean sessions',
    how: 'A 6-hour session where exactly 3 valid setups appear and you take only those 3. A 4th trade fails the session.' },
  { id: 'fomo', name: 'Missed-Move Discipline', tests: 'FOMO',
    target: 20, unit: 'reps not chased',
    how: 'A setup you identified runs 5% without you. Log the rep only if you did not chase it.' },
  { id: 'hold', name: 'Winner-Holding', tests: 'Cutting winners early',
    target: 10, unit: 'targets held',
    how: 'Hold to your written target through a 50% giveback of open profit. Log only if you held.' },
  { id: 'recover', name: 'Rule-Break Recovery', tests: 'Behaviour after an error',
    target: 5, unit: 'flawless trades after a break',
    how: 'After any rule violation, the next 5 trades must be flawless. One slip resets to zero.' },
  { id: 'blackout', name: 'Blackout Test', tests: 'Detachment from money',
    target: 30, unit: 'sessions with P&L hidden',
    how: 'Trade a full session without looking at P&L once. Turn on Blackout mode below.' },
  { id: 'gap', name: 'Gap Shock', tests: 'Overnight risk',
    target: 5, unit: 'correct responses',
    how: 'Wake to a −2R gap against a swing position. Log only if you followed your written gap rule instead of improvising.' }
];

export async function drillsState() {
  return await get('drills', {});
}

export async function logRep(id, pass) {
  const s = await drillsState();
  const d = s[id] || (s[id] = { count: 0, attempts: 0, passedOn: null });
  d.attempts++;
  // These drills are about streaks. A failure resets, it does not decrement.
  d.count = pass ? d.count + 1 : 0;
  const def = DRILLS.find(x => x.id === id);
  if (pass && d.count >= def.target && !d.passedOn) d.passedOn = new Date().toISOString();
  await set('drills', s);
  return d;
}

export const blackout = () => get('blackout', false);
export const setBlackout = v => set('blackout', !!v);

// ---------- F4: enforced review ----------
// Monday trading stays locked until Sunday's review is submitted.
function weekKey(d = new Date()) {
  const t = new Date(d);
  t.setDate(t.getDate() - t.getDay()); // back to Sunday
  return t.toISOString().slice(0, 10);
}

export async function reviews() { return await get('reviews', {}); }

export async function submitWeekly(f) {
  if (!f.violations || !f.best || !f.worst || !f.fix)
    throw new Error('All four fields are required. A blank review is not a review.');
  const all = await reviews();
  all[weekKey()] = { ...f, at: new Date().toISOString() };
  await set('reviews', all);
}

// Returns a blocking reason, or null.
export async function reviewBlock() {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return null;      // weekend, nothing to block
  const all = await reviews();
  // The week that just ended.
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - day);
  const key = lastSunday.toISOString().slice(0, 10);
  if (all[key]) return null;
  return `Last week's review is not submitted. Trading is locked until it is.`;
}

