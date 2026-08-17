// specialise.js — OWNS: the four-axis setup ranking, core-setup selection,
// exploration budgeting, and quarterly re-validation.
// Imports store + rules + ledger. Never touches the DOM.
//
// The premise, which is not mine: profitable traders end up running one or two
// setups, not twelve. The job here is to find WHICH ones are his — using his own
// data — and then make trading outside them deliberate rather than casual.

import * as store from './store.js';
const { get, set, all, add } = store;
import * as R from './rules.js';
import { profile } from './ledger.js';

// Two different bars, and conflating them was a real bug.
//
// RANKING is informational: eight trades is enough to put a setup on the board
// so you can see it exists and how thin it is.
//
// CHOOSING is a commitment, and it uses the same 30-trades-per-tag bar that the
// Edge Finder uses before it will print a number at all. Anything less and you
// would be narrowing your whole career onto a sample the rest of the app openly
// refuses to trust. If setup A has 35 of your 40 trades and setup B has 5, B
// cannot become core no matter how good those five look.
export const MIN_PER_SETUP = 8;      // enough to RANK
export const MIN_SETUPS_TRIED = 5;
export const MIN_TOTAL = 40;
export const EXPLORATION_BUDGET = 0.15;   // share of trades allowed off-core
export const REVALIDATE_DAYS = 90;

const liveClosed = async () =>
  (await all('trades')).filter(t => t.mode === 'live' && t.closed);

// ---------- the four axes ----------
// Profit alone is the wrong measure. A setup can make money and still be wrong
// for you if the only way you trade it is by breaking your own rules.
export async function axes() {
  const rows = await liveClosed();
  const groups = {};
  for (const t of rows) {
    if (!t.setup) continue;
    (groups[t.setup] || (groups[t.setup] = [])).push(t);
  }

  const out = [];
  for (const [setup, g] of Object.entries(groups)) {
    const n = g.length;
    const expectancy = g.reduce((a, t) => a + (+t.rMultiple || 0), 0) / n;
    const adherence = g.filter(t => t.adherent).length / n * 100;

    // Emotional cost: how far your own confidence and emotion ratings sit from
    // calm-and-correct. High confidence that loses, or wins taken at 5/5 stress,
    // both count against a setup.
    const emo = g.reduce((a, t) => {
      const strain = Math.abs((+t.emotionDuring || 3) - 3);
      const overconf = (+t.confidence || 3) >= 4 && (+t.rMultiple || 0) < 0 ? 1 : 0;
      return a + strain + overconf;
    }, 0) / n;

    // Drawdown contribution: worst cumulative run this setup produced on its own.
    let eq = 0, peak = 0, worst = 0;
    for (const t of g.sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt))) {
      eq += (+t.rMultiple || 0);
      peak = Math.max(peak, eq);
      worst = Math.max(worst, peak - eq);
    }

    out.push({
      setup, n,
      expectancy: +expectancy.toFixed(2),
      adherence: Math.round(adherence),
      emotionalCost: +emo.toFixed(2),
      worstRunR: +worst.toFixed(1),
      winRate: Math.round(g.filter(t => t.rMultiple > 0).length / n * 100),
      enough: n >= MIN_PER_SETUP
    });
  }
  return out.sort((a, b) => b.n - a.n);
}

// A single comparable score. Weighted so that adherence matters nearly as much
// as profit — a setup you cannot execute cleanly is not an edge you own.
export function score(a) {
  const exp = Math.max(-2, Math.min(3, a.expectancy)) / 3;        // -0.67..1
  const adh = (a.adherence - 50) / 50;                            // -1..1
  const emo = -Math.min(2, a.emotionalCost) / 2;                  // -1..0
  const dd = -Math.min(10, a.worstRunR) / 10;                     // -1..0
  return +(exp * 0.40 + adh * 0.35 + emo * 0.10 + dd * 0.15).toFixed(3);
}

// ---------- readiness for a verdict ----------
// The bar for choosing a core setup, read from the same setting the Edge Finder
// uses. One number, one place, so the two can never drift apart again.
export async function coreMin() {
  return (await R.rules()).minTagSample;
}

export async function verdictReady() {
  const a = await axes();
  const rows = await liveClosed();
  const need = await coreMin();
  const covered = a.filter(x => x.enough).length;
  const choosable = a.filter(x => x.n >= need);
  return {
    ready: rows.length >= MIN_TOTAL && covered >= MIN_SETUPS_TRIED,
    total: rows.length, needTotal: MIN_TOTAL,
    covered, needCovered: MIN_SETUPS_TRIED,
    perSetup: MIN_PER_SETUP,
    coreMin: need,
    choosable: choosable.map(x => x.setup),
    // How far the nearest candidate is from being choosable, so the screen can
    // say something more useful than "not yet".
    nearest: a.filter(x => x.n < need).sort((x, y) => y.n - x.n)
      .slice(0, 3).map(x => ({ setup: x.setup, n: x.n, short: need - x.n })),
    thin: a.filter(x => !x.enough).map(x => ({ setup: x.setup, n: x.n }))
  };
}

// The ranking the app offers. It is a recommendation, never an instruction.
export async function verdict() {
  const rdy = await verdictReady();
  const a = await axes();
  const need = await coreMin();
  const ranked = a.filter(x => x.enough)
    .map(x => ({ ...x, score: score(x), choosable: x.n >= need, shortBy: Math.max(0, need - x.n) }))
    .sort((a, b) => b.score - a.score);

  const notes = {};
  for (const x of ranked) {
    const n = [];
    if (x.expectancy > 0 && x.adherence < 80)
      n.push('Profitable, but you break your own rules trading it. That is a warning, not a recommendation — the profit may be coming from the rule breaks, and those do not survive.');
    if (x.expectancy <= 0 && x.adherence >= 88)
      n.push('You execute this cleanly and it still loses. Clean execution of a losing setup is the clearest evidence there is: the setup is the problem, not you.');
    if (x.worstRunR >= 6)
      n.push(`Produced a ${x.worstRunR}R run against you on its own. Survivable, but it will test you.`);
    if (x.emotionalCost >= 1.2)
      n.push('Costs you the most emotionally of anything you trade. Sustainable for a month, rarely for a year.');
    if (!x.choosable)
      n.push(`Ranked on ${x.n} trades, which is below the ${need} this app requires before it will trust a number. It cannot be made core yet — a high score on a small sample is usually luck, and narrowing onto luck is the exact mistake specialisation exists to prevent.`);
    if (n.length) notes[x.setup] = n;
  }
  return { ...rdy, ranked, notes };
}

// ---------- the choice ----------
export async function core() {
  return await get('coreSetups', null);   // {setups:[], chosenAt, overrode, reason}
}

export async function chooseCore(setups, reason) {
  if (!Array.isArray(setups) || !setups.length) throw new Error('Choose at least one setup.');
  if (setups.length > 3) throw new Error('Three is the maximum. Specialists beat generalists — that is the whole point of this screen.');

  const v = await verdict();
  const need = await coreMin();

  // The gate that was missing. Certification in Phase 2 covers behaviour across
  // whatever you traded; it does not certify a setup you happened to take five
  // times inside that trial.
  const evidence = {};
  for (const x of await axes()) evidence[x.setup] = x.n;
  const short = setups.filter(s => (evidence[s] || 0) < need);
  if (short.length)
    throw new Error(`${short.map(s => `${s} (${evidence[s] || 0} trades)`).join(', ')} — ${need} live trades on a setup are required before it can become core. The Edge Finder will not print a number below that, so this screen will not let you bet your career on one either. Keep trading it inside your exploration budget until the evidence exists.`);

  // Compare only against setups he is actually allowed to choose. Ranking a
  // thin setup above a proven one must not make the proven one look like a
  // defiance of the data — it is the only legal choice.
  const eligible = v.ranked.filter(x => x.choosable);
  const top = eligible.slice(0, setups.length).map(x => x.setup);
  const overrode = setups.some(s => !top.includes(s));
  if (overrode && (!reason || reason.trim().length < 20))
    throw new Error('You are choosing against your own data. That is allowed, but write down why — at least 20 characters, and it goes on the record.');

  // What the data says you are giving up, recorded at the moment you chose.
  const chosenScores = eligible.filter(x => setups.includes(x.setup));
  const rejectedBetter = eligible.filter(x => !setups.includes(x.setup) &&
    chosenScores.length && x.score > Math.min(...chosenScores.map(c => c.score)));

  const rec = {
    setups, chosenAt: new Date().toISOString(),
    overrode, reason: (reason || '').trim(),
    snapshot: v.ranked.map(x => ({ setup: x.setup, score: x.score, expectancy: x.expectancy, adherence: x.adherence, n: x.n })),
    evidenceAtChoice: setups.map(s => ({ setup: s, n: evidence[s] || 0 })),
    passedOver: rejectedBetter.map(x => ({ setup: x.setup, score: x.score }))
  };
  await set('coreSetups', rec);
  await add('amendments', {
    from: 'core setups', to: setups.join(', '),
    reason: overrode ? `OVERRODE the ranking: ${rec.reason}` : 'followed the ranking',
    at: rec.chosenAt
  });
  return rec;
}

// ---------- enforcement ----------
// Non-core trades are not banned. They are budgeted, tagged, and kept out of
// your core statistics so one experiment cannot pollute the thing you are good at.
export async function explorationStatus() {
  const c = await core();
  if (!c) return { active: false };
  const rows = (await liveClosed()).filter(t => new Date(t.closedAt) > new Date(c.chosenAt));
  const off = rows.filter(t => !c.setups.includes(t.setup));
  const allowed = Math.max(1, Math.floor(rows.length * EXPLORATION_BUDGET));
  return {
    active: true, core: c.setups,
    total: rows.length, used: off.length, allowed,
    remaining: Math.max(0, allowed - off.length),
    overBudget: off.length > allowed
  };
}

// Returns a blocking reason for an off-core setup, or null.
export async function checkSetup(setup) {
  const c = await core();
  if (!c) return null;
  if (c.setups.includes(setup)) return null;
  const e = await explorationStatus();
  if (e.overBudget)
    return `${setup} is outside your core setups and your exploration budget is used up (${e.used}/${e.allowed}). Trade your core, or re-choose your core deliberately on the Focus screen.`;
  return null;
}

export async function isExploration(setup) {
  const c = await core();
  return !!(c && !c.setups.includes(setup));
}

// ---------- mastery: deeper analytics, core setups only ----------
// Narrow data beats broad data. Twenty trades on one setup tells you more than
// twenty trades spread across six.
export async function mastery(setup) {
  const rows = (await liveClosed()).filter(t => t.setup === setup);
  if (rows.length < MIN_PER_SETUP) return { ready: false, n: rows.length, need: MIN_PER_SETUP };

  const slice = (keyFn) => {
    const g = {};
    for (const t of rows) {
      const k = keyFn(t);
      if (k == null) continue;
      (g[k] || (g[k] = [])).push(t);
    }
    return Object.entries(g).map(([k, v]) => ({
      key: k, n: v.length,
      expectancy: +(v.reduce((a, t) => a + (+t.rMultiple || 0), 0) / v.length).toFixed(2)
    })).sort((a, b) => b.expectancy - a.expectancy);
  };

  const wins = rows.filter(t => t.rMultiple > 0);
  const losses = rows.filter(t => t.rMultiple <= 0);
  const hold = rows.filter(t => t.closedAt && t.lockedAt)
    .map(t => (new Date(t.closedAt) - new Date(t.lockedAt)) / 3600000);

  return {
    ready: true, n: rows.length, setup,
    byRegime: slice(t => t.regime),
    byDay: slice(t => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(t.closedAt).getDay()]),
    byHour: slice(t => String(new Date(t.lockedAt).getHours()).padStart(2, '0') + ':00'),
    byConfidence: slice(t => 'confidence ' + (t.confidence || 3)),
    avgWinR: wins.length ? +(wins.reduce((a, t) => a + t.rMultiple, 0) / wins.length).toFixed(2) : 0,
    avgLossR: losses.length ? +(losses.reduce((a, t) => a + t.rMultiple, 0) / losses.length).toFixed(2) : 0,
    // A cluster of exits just short of target means the stop is fine and the
    // exit discipline is not.
    stoppedOut: Math.round(rows.filter(t => t.exitReason === 'stop').length / rows.length * 100),
    discretionary: Math.round(rows.filter(t => t.exitReason === 'discretionary').length / rows.length * 100),
    avgHoldHours: hold.length ? +(hold.reduce((a, b) => a + b, 0) / hold.length).toFixed(1) : null
  };
}

// ---------- quarterly re-validation ----------
// Same principle as certification expiring: a core setup that stops working
// stops being core.
export async function revalidation() {
  const c = await core();
  if (!c) return null;
  const age = (Date.now() - new Date(c.chosenAt).getTime()) / 86400000;
  const due = age >= REVALIDATE_DAYS;
  const a = await axes();
  const now = {};
  for (const x of a) now[x.setup] = x;

  const drifted = [];
  for (const s of c.setups) {
    const then = (c.snapshot || []).find(x => x.setup === s);
    const cur = now[s];
    if (!cur || !then) continue;
    if (cur.n - then.n < MIN_PER_SETUP) continue;   // not enough new evidence
    if (cur.expectancy <= 0 && then.expectancy > 0)
      drifted.push({ setup: s, was: then.expectancy, now: cur.expectancy,
        why: 'expectancy has turned negative since you chose it' });
    else if (cur.adherence < 80 && then.adherence >= 80)
      drifted.push({ setup: s, was: then.adherence, now: cur.adherence,
        why: 'your rule-following on this setup has fallen below 80%' });
  }
  return { due, daysSince: Math.floor(age), drifted, core: c.setups };
}
