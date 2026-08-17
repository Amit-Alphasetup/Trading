// learn.js — OWNS: curriculum index, unit progress, spaced repetition,
// knowledge decay, and the Sizing Reflex drill.
import * as store from './store.js';
const { get, set, all, add } = store;
import { EQUITY_UNITS } from './content-equity.js';
import { OPTIONS_UNITS } from './content-options.js';
// content.js — OWNS: the lesson index. Deep units live in js/units/*.js
// Every unit is a full-depth module: sections + question bank. Order is the
// recommended sequence, not a lock — all units are open from day one.














export const UNITS = [...EQUITY_UNITS, ...OPTIONS_UNITS];

export const unitById = id => UNITS.find(u => u.id === id);
// A pattern cannot be marked or traded until the unit that teaches it is passed.
export function unitForPattern(pattern) {
  return UNITS.find(u => u.unlocks.includes(pattern)) || null;
}


// ===== ENGINE =====
// learn.js — OWNS: curriculum map, scenario tests, the Sizing Reflex drill.
// Imports db + schema only. We link OUT for reading; we own the testing.


// Reading is not our job. Varsity does it better and free.
// Our job is checking whether it stuck.
export const CURRICULUM = [
  { phase: 1, unit: 'Market literacy',
    topics: 'Exchanges, order types, settlement, circuits, corporate actions',
    link: 'https://zerodha.com/varsity/module/introduction-to-stock-markets/' },
  { phase: 1, unit: 'Charting and price action',
    topics: 'Market structure, support/resistance, trend, volume, relative strength',
    link: 'https://zerodha.com/varsity/module/technical-analysis/' },
  { phase: 1, unit: 'Candlesticks and patterns',
    topics: 'Including which ones do not work',
    link: 'https://zerodha.com/varsity/module/technical-analysis/' },
  { phase: 1, unit: 'Risk and position sizing',
    topics: 'The arithmetic, drilled to reflex — see the drill below',
    link: 'https://zerodha.com/varsity/module/risk-management/' },
  { phase: 2, unit: 'Market filters',
    topics: 'Nifty 50-EMA permission, breadth, India VIX regime sizing',
    link: 'https://zerodha.com/varsity/module/technical-analysis/' },
  { phase: 3, unit: 'Options foundation',
    topics: 'Calls, puts, Greeks operationally, IV percentile, IV crush, open interest',
    link: 'https://zerodha.com/varsity/module/option-theory/' },
  { phase: 3, unit: 'Option strategies',
    topics: 'Spreads before condors before ratios. In that order.',
    link: 'https://zerodha.com/varsity/module/option-strategies/' },
  { phase: 4, unit: 'Undefined risk and adjustment',
    topics: 'When to adjust vs when to just exit. Most adjustments are hope in disguise.',
    link: 'https://zerodha.com/varsity/module/option-strategies/' }
];

// ---------- the Sizing Reflex drill (Phase 1 gate) ----------
// 100 correct calculations, each under 10 seconds. Arithmetic must be automatic
// before real money, or you will size by feeling under stress.
export const DRILL_TARGET = 100;
export const DRILL_SECONDS = 10;

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

export function newQuestion() {
  const capital = rnd(1, 40) * 25000;
  const riskPct = [0.25, 0.5, 0.75, 1][rnd(0, 3)];
  const entry = rnd(50, 3000);
  const stopDist = Math.max(1, Math.round(entry * (rnd(5, 60) / 1000)));
  const answer = Math.floor((capital * riskPct / 100) / stopDist);
  return { capital, riskPct, entry, stop: entry - stopDist, stopDist, answer };
}

export async function drillState() {
  return await get('drill', { correct: 0, attempts: 0, streak: 0, best: 0, times: [] });
}

export async function drillAnswer(q, given, ms) {
  const s = await drillState();
  const ok = Number(given) === q.answer;
  const inTime = ms <= DRILL_SECONDS * 1000;
  s.attempts++;
  if (ok && inTime) {
    s.correct++; s.streak++;
    s.best = Math.max(s.best, s.streak);
    s.times.push(Math.round(ms));
    if (s.times.length > 100) s.times.shift();
  } else {
    // A streak is the point. One wrong or slow answer resets it.
    s.streak = 0;
  }
  await set('drill', s);
  return { ok, inTime, answer: q.answer, streak: s.streak, passed: s.streak >= DRILL_TARGET };
}

export async function resetDrill() {
  await set('drill', { correct: 0, attempts: 0, streak: 0, best: 0, times: [] });
}

// ---------- units, spaced repetition, and pattern unlocking ----------



const DAY = 86400000;
const INTERVALS = [3, 7, 21, 60];   // days: wrong answers come back, correct ones recede

export async function progress() {
  return await get('units', {});   // { unitId: {read:bool, passed:bool, best:int} }
}

export async function markRead(id) {
  const p = await progress();
  (p[id] || (p[id] = {})).read = true;
  await set('units', p);
}

export async function answerUnit(unitId, answers) {
  const u = unitById(unitId);
  const p = await progress();
  const st = p[unitId] || (p[unitId] = {});
  const wrong = [];
  u.qs.forEach((q, i) => { if (answers[i] !== q.a) wrong.push(i); });
  const pct = Math.round((u.qs.length - wrong.length) / u.qs.length * 100);
  st.best = Math.max(st.best || 0, pct);
  st.attempts = (st.attempts || 0) + 1;
  if (!wrong.length) st.passed = true;
  await set('units', p);
  await scheduleReviews(unitId, u.qs.length, wrong);
  return { pct, wrong, passed: !wrong.length };
}

// Wrong answers return in 3 days. Right ones recede: 7, 21, 60.
async function scheduleReviews(unitId, total, wrong) {
  const due = await get('srs', {});
  for (let i = 0; i < total; i++) {
    const key = unitId + ':' + i;
    const cur = due[key] || { step: -1 };
    if (wrong.includes(i)) cur.step = 0;
    else cur.step = Math.min(cur.step + 1, INTERVALS.length - 1);
    cur.due = Date.now() + INTERVALS[Math.max(0, cur.step)] * DAY;
    due[key] = cur;
  }
  await set('srs', due);
}

export async function dueReviews() {
  const due = await get('srs', {});
  const now = Date.now();
  return Object.entries(due).filter(([, v]) => v.due <= now).map(([k]) => {
    const [uid, i] = k.split(':');
    const u = unitById(uid);
    return u ? { key: k, unitId: uid, i: +i, q: u.qs[+i] } : null;
  }).filter(Boolean);
}

export async function answerReview(key, correct) {
  const due = await get('srs', {});
  const cur = due[key] || { step: 0 };
  cur.step = correct ? Math.min(cur.step + 1, INTERVALS.length - 1) : 0;
  cur.due = Date.now() + INTERVALS[cur.step] * DAY;
  due[key] = cur;
  await set('srs', due);
}

// The gate that makes learning unskippable: a pattern stays locked until its
// unit is passed. Reading without passing does nothing.
export async function patternLocked(pattern) {
  const u = unitForPattern(pattern);
  if (!u) return null;
  const p = await progress();
  return (p[u.id] && p[u.id].passed) ? null : u;
}

export async function unlockedPatterns(list) {
  const p = await progress();
  return list.filter(x => {
    const u = unitForPattern(x);
    return !u || (p[u.id] && p[u.id].passed);
  });
}

// ---------- knowledge decay: a pass is a lease, not a deed ----------
// A unit whose spaced-repetition questions have gone unanswered for STALE_DAYS
// loses its pass, and the patterns it unlocked lock again. Reading once is not
// knowing. Answering the reviews keeps it current — that is the whole cost.
export const STALE_DAYS = 60;

export async function unitFreshness(unitId) {
  const due = await get('srs', {});
  const keys = Object.keys(due).filter(k => k.startsWith(unitId + ':'));
  if (!keys.length) return { fresh: true, overdueDays: 0, dueNow: 0 };
  const now = Date.now();
  // The most overdue question decides the unit's freshness.
  let worst = 0, dueNow = 0;
  for (const k of keys) {
    const d = due[k];
    if (d.due <= now) {
      dueNow++;
      worst = Math.max(worst, Math.floor((now - d.due) / DAY));
    }
  }
  return { fresh: worst < STALE_DAYS, overdueDays: worst, dueNow };
}

// Called on load. Demotes stale units; does not delete their history.
export async function applyDecay() {
  const p = await progress();
  let changed = 0;
  for (const id of Object.keys(p)) {
    if (!p[id].passed) continue;
    const f = await unitFreshness(id);
    if (!f.fresh) {
      p[id].passed = false;
      p[id].decayedOn = new Date().toISOString();
      p[id].decayCount = (p[id].decayCount || 0) + 1;
      changed++;
    }
  }
  if (changed) await set('units', p);
  return changed;
}

// Everything standing between him and Phase 2, in one shape.
export async function readiness(rules, evidence, papersClosed) {
  const p = await progress();
  const drill = await drillState();
  const passed = Object.values(p).filter(u => u.passed).length;
  const marked = Object.values(evidence).filter(m => m.paperOK).length;
  const bars = [
    { label: 'Units passed', now: passed, need: 4 },
    { label: 'Sizing drill streak', now: drill.streak, need: DRILL_TARGET },
    { label: 'Patterns with enough examples', now: marked, need: 1 },
    { label: 'Paper trades closed', now: papersClosed, need: 20 }
  ];
  for (const b of bars) { b.pct = Math.min(100, Math.round(b.now / b.need * 100)); b.ok = b.now >= b.need; }
  return { bars, ok: bars.every(b => b.ok) };
}
