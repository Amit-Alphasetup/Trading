// analytics.js — OWNS: the Edge Finder, milestones, Monte Carlo, the income
// gate, and the monthly review. Reporting only — it reads, it never gates.
import * as store from './store.js';
const { get, set, all, add } = store;
import * as R from './rules.js';
import * as ledger from './ledger.js';
const { profile, projection, drawdownPct } = ledger;
import * as mind from './mind.js';
import * as spec from './specialise.js';
const { amendments, overrideHistory } = mind;
// analytics.js — OWNS: expectancy slicing, equity curve, milestones, Monte Carlo.
// Imports db + schema. Pure numbers, no DOM.



const closed = async mode =>
  (await all('trades'))
    .filter(t => t.closed && (!mode || t.mode === mode))
    .sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt));

function summarise(rows) {
  const n = rows.length;
  if (!n) return { n: 0 };
  const sumR = rows.reduce((a, t) => a + (+t.rMultiple || 0), 0);
  const wins = rows.filter(t => t.rMultiple > 0);
  const losses = rows.filter(t => t.rMultiple <= 0);
  return {
    n,
    expectancy: +(sumR / n).toFixed(2),
    winRate: Math.round(wins.length / n * 100),
    avgWin: wins.length ? +(wins.reduce((a, t) => a + t.rMultiple, 0) / wins.length).toFixed(2) : 0,
    avgLoss: losses.length ? +(losses.reduce((a, t) => a + t.rMultiple, 0) / losses.length).toFixed(2) : 0,
    adherence: Math.round(rows.filter(t => t.adherent).length / n * 100),
    pnl: Math.round(rows.reduce((a, t) => a + (+t.pnl || 0), 0))
  };
}

// Below the minimum sample we show nothing. Without this he deletes his best
// setup after four unlucky losses.
export async function bySlice(keyFn, mode) {
  const rows = await closed(mode);
  const r = await R.rules();
  const groups = {};
  for (const t of rows) {
    const k = keyFn(t);
    if (k == null) continue;
    (groups[k] || (groups[k] = [])).push(t);
  }
  return Object.entries(groups).map(([k, g]) => {
    const s = summarise(g);
    return { key: k, ...s, trusted: s.n >= r.minTagSample, need: Math.max(0, r.minTagSample - s.n) };
  }).sort((a, b) => b.n - a.n);
}

export const SLICES = {
  setup: t => t.setup,
  regime: t => t.regime,
  day: t => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(t.closedAt).getDay()],
  hour: t => String(new Date(t.lockedAt).getHours()).padStart(2, '0') + ':00',
  confidence: t => 'confidence ' + t.confidence,
  emotion: t => 'emotion ' + (t.emotionDuring || t.emotionPre),
  exit: t => t.exitReason
};

// Chart 2 — rule-following vs profit. The most persuasive chart in the app.
export async function adherenceVsProfit(mode) {
  const rows = await closed(mode);
  const yes = rows.filter(t => t.adherent), no = rows.filter(t => !t.adherent);
  return { adherent: summarise(yes), broken: summarise(no) };
}

// Chart 5 — R distribution. Shows if he cuts winners short.
export async function rDistribution(mode) {
  const rows = await closed(mode);
  const buckets = ['<-1R', '-1 to 0', '0 to 1R', '1 to 2R', '2 to 3R', '3R+'];
  const counts = new Array(6).fill(0);
  for (const t of rows) {
    const r = +t.rMultiple;
    const i = r < -1 ? 0 : r < 0 ? 1 : r < 1 ? 2 : r < 2 ? 3 : r < 3 ? 4 : 5;
    counts[i]++;
  }
  return { buckets, counts };
}

// Chart 6 — equity curve with deposits stripped out.
export async function equityCurve() {
  const rows = await closed('live');
  const deps = (await all('deposits')).sort((a, b) => new Date(a.at) - new Date(b.at));
  const depTotal = deps.reduce((a, d) => a + (+d.amount || 0), 0);
  // Two lines, deliberately: what trading produced, and what the balance did.
  // Most retail traders believe they are profitable because the balance grew.
  // It grew from salary.
  let eq = 0, di = 0, paid = 0;
  const curve = rows.map(t => {
    eq += (+t.pnl || 0);
    while (di < deps.length && new Date(deps[di].at) <= new Date(t.closedAt))
      paid += (+deps[di++].amount || 0);
    return { at: t.closedAt, eq, tradingOnly: eq, withDeposits: eq + paid };
  });
  return { curve, tradingPnl: Math.round(eq), deposited: Math.round(depTotal) };
}

// Chart 8 — drawdown timeline off the trading-only curve.
export async function drawdownSeries() {
  const { curve } = await equityCurve();
  let peak = 0;
  return curve.map(p => {
    peak = Math.max(peak, p.eq);
    return { at: p.at, dd: peak > 0 ? +(((peak - p.eq) / peak) * 100).toFixed(1) : 0 };
  });
}

// Monthly auto-recommendation.
export async function recommendation() {
  const setups = (await bySlice(SLICES.setup, 'live')).filter(s => s.trusted);
  if (setups.length < 3) return null;
  const ranked = [...setups].sort((a, b) => b.expectancy - a.expectancy);
  const good = ranked.filter(s => s.expectancy > 0).slice(0, 2);
  const bad = ranked.filter(s => s.expectancy <= 0);
  if (!good.length || !bad.length) return null;
  const badLoss = bad.reduce((a, s) => a + s.n * s.expectancy, 0);
  const total = setups.reduce((a, s) => a + Math.abs(s.n * s.expectancy), 0);
  const pct = total ? Math.round(Math.abs(badLoss) / total * 100) : 0;
  return `Your edge is concentrated in ${good.map(g => g.key).join(' and ')}. ` +
    `About ${pct}% of your damage comes from outside these. ` +
    `Suggested: suspend ${bad.map(b => b.key).join(', ')} for 60 days.`;
}

// ---------- Monte Carlo ruin probability ----------
// Hidden below 100 closed trades. Computed from 12 trades it is a made-up
// number that looks authoritative.
export async function monteCarlo(capital, riskPct, paths = 1000, horizon = 250) {
  const rows = await closed('live');
  if (rows.length < 100) return { ready: false, need: 100 - rows.length };
  const Rs = rows.map(t => +t.rMultiple);
  const perTrade = capital * riskPct / 100;
  let ruin = 0, ends = [];
  for (let p = 0; p < paths; p++) {
    let eq = capital, low = capital;
    for (let i = 0; i < horizon; i++) {
      eq += Rs[Math.floor(Math.random() * Rs.length)] * perTrade;
      low = Math.min(low, eq);
      if (eq <= capital * 0.5) { ruin++; break; }
    }
    ends.push(eq);
  }
  ends.sort((a, b) => a - b);
  return {
    ready: true, paths,
    ruinPct: +(ruin / paths * 100).toFixed(1),
    p10: Math.round(ends[Math.floor(paths * 0.1)]),
    median: Math.round(ends[Math.floor(paths * 0.5)]),
    p90: Math.round(ends[Math.floor(paths * 0.9)])
  };
}

// ---------- deposits ----------
export async function addDeposit(amount, note) {
  await add('deposits', { amount: +amount, note: note || '', at: new Date().toISOString() });
  // Deposits raise capital but must never raise the trading peak, or an ordinary
  // dip would look like a drawdown and fire a false regression.
  const p = await profile();
  const deps = await all('deposits');
  p.depositsTotal = deps.reduce((a, d) => a + (+d.amount || 0), 0);
  p.capital = (+p.capital || 0) + (+amount || 0);
  await set('profile', p);
}
export const deposits = () => all('deposits');

// ---------- milestones ----------
// Recalculated from HIS numbers. Deposits and trading gains always separated.
export async function milestones(profile) {
  const rows = await closed('live');
  const deps = await all('deposits');
  const targets = [100000, 1000000, 10000000, 100000000];
  const labels = ['₹1L', '₹10L', '₹1cr', '₹10cr'];

  if (rows.length < 30) {
    return { ready: false, need: 30 - rows.length, targets: labels };
  }
  const first = new Date(rows[0].closedAt), last = new Date(rows[rows.length - 1].closedAt);
  const months = Math.max(0.5, (last - first) / (30 * 86400000));
  const tradingPnl = rows.reduce((a, t) => a + (+t.pnl || 0), 0);
  const start = Math.max(1, profile.capital - tradingPnl - deps.reduce((a, d) => a + d.amount, 0));
  const monthlyReturn = Math.pow(Math.max(0.01, profile.capital / start), 1 / months) - 1;

  // Deposit pace from his actual history.
  const depMonths = deps.length
    ? Math.max(0.5, (Date.now() - new Date(deps[0].at)) / (30 * 86400000)) : 1;
  const monthlyDeposit = deps.reduce((a, d) => a + d.amount, 0) / depMonths;

  const out = targets.map((tg, i) => {
    let eq = profile.capital, m = 0;
    while (eq < tg && m < 1200) { eq = eq * (1 + monthlyReturn) + monthlyDeposit; m++; }
    return { label: labels[i], target: tg, months: m >= 1200 ? null : m,
      date: m >= 1200 ? null : new Date(Date.now() + m * 30 * 86400000).toISOString().slice(0, 10) };
  });
  return { ready: true, monthlyReturnPct: +(monthlyReturn * 100).toFixed(2),
    monthlyDeposit: Math.round(monthlyDeposit), tradingPnl: Math.round(tradingPnl),
    deposited: Math.round(deps.reduce((a, d) => a + d.amount, 0)), rows: out };
}

// ---------- G4 income gate ----------
export async function incomeGate(profile, monthlyExpenses) {
  const rows = await closed('live');
  const dds = await drawdownSeries();
  const maxDD = dds.length ? Math.max(...dds.map(d => d.dd)) : 0;
  const months = rows.length
    ? (new Date(rows[rows.length - 1].closedAt) - new Date(rows[0].closedAt)) / (30 * 86400000) : 0;
  const need = monthlyExpenses && maxDD
    ? Math.round(monthlyExpenses / (maxDD / 100)) : null;
  const checks = [
    { ok: months >= 24, t: `24 months of positive expectancy (you have ${months.toFixed(1)})` },
    { ok: false, t: '12 months of living expenses saved OUTSIDE the trading account (confirm manually)' },
    { ok: need ? profile.capital >= need : false,
      t: need ? `Account ≥ ₹${need.toLocaleString('en-IN')} — computed from your ₹${(+monthlyExpenses).toLocaleString('en-IN')} expenses and your ${maxDD}% max drawdown`
              : 'Enter monthly expenses to compute the account size needed' },
    { ok: rows.some(t => t.adherent) && maxDD > 0, t: 'Survived a losing month with no rule violations' },
    { ok: maxDD > 0 && maxDD < 20, t: `Maximum drawdown under 20% (yours ${maxDD}%)` }
  ];
  return { checks, allowed: checks.every(c => c.ok), maxDD,
    cap: Math.round(rows.slice(-60).reduce((a, t) => a + (+t.pnl || 0), 0) / 3 * 0.3) };
}


// ===== MONTHLY REVIEW =====
// review.js — OWNS: the monthly review. Imports db, analytics, ledger, psych.
// The weekly review asks what happened. The monthly asks what it means.





const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

export async function monthlyAll() { return await get('monthlyReviews', {}); }

export async function currentMonthly() {
  const a = await monthlyAll();
  return a[monthKey()] || null;
}

// Everything the review should confront him with, computed rather than remembered.
export async function monthlyBrief() {
  const p = await profile();
  const setups = await bySlice(SLICES.setup, 'live');
  const regimes = await bySlice(SLICES.regime, 'live');
  const ap = await adherenceVsProfit('live');
  const eq = await equityCurve();
  const dd = await drawdownSeries();
  const rec = await recommendation();
  const proj = await projection();
  const ms = await milestones(p);
  const amends = await amendments();
  const overrides = await overrideHistory();

  const since = Date.now() - 30 * 86400000;
  const recentAmends = amends.filter(a => new Date(a.at).getTime() > since);
  const recentOverrides = overrides.filter(o => new Date(o.at).getTime() > since);
  const violations = (await all('violations')).filter(v => new Date(v.at).getTime() > since);

  // The amendment history is a diagnostic. Loosening rules repeatedly is the finding.
  const amendWarning = recentAmends.length >= 2
    ? `${recentAmends.length} constitution amendments in 30 days. Rules that keep moving are not rules.`
    : null;

  return {
    month: monthKey(),
    setups: setups.filter(s => s.trusted),
    hiddenSetups: setups.filter(s => !s.trusted).length,
    regimes: regimes.filter(r => r.trusted),
    adherence: ap,
    tradingPnl: eq.tradingPnl,
    deposited: eq.deposited,
    maxDD: dd.length ? Math.max(...dd.map(d => d.dd)) : 0,
    recommendation: rec,
    projection: proj.text,
    milestones: ms,
    amendments: recentAmends.length,
    amendWarning,
    overrides: recentOverrides.length,
    violations: violations.length,
    violationTypes: [...new Set(violations.map(v => v.type))]
  };
}

export async function submitMonthly(f) {
  const need = ['keeping', 'suspending', 'capitalPlan', 'biggestLeak'];
  for (const k of need) if (!f[k] || !String(f[k]).trim())
    throw new Error('All four answers are required. A blank review teaches nothing.');
  const a = await monthlyAll();
  a[monthKey()] = { ...f, brief: await monthlyBrief(), at: new Date().toISOString() };
  await set('monthlyReviews', a);
}

// Due from the 1st of a month until submitted. Unlike the weekly review this
// does not block trading — a monthly block would cost too much for too little.
export async function monthlyDue() {
  const c = await currentMonthly();
  if (c) return null;
  const day = new Date().getDate();
  return day >= 1
    ? `The ${monthKey()} review is not submitted.`
    : null;
}

// Core versus exploration, kept apart. Mixing them is how one experiment makes
// a good setup look mediocre.
export async function coreVsExploration() {
  const c = await spec.core();
  if (!c) return null;
  const rows = (await all('trades')).filter(t => t.mode === 'live' && t.closed
    && new Date(t.closedAt) > new Date(c.chosenAt));
  const sum = g => g.length ? {
    n: g.length,
    expectancy: +(g.reduce((a, t) => a + (+t.rMultiple || 0), 0) / g.length).toFixed(2),
    adherence: Math.round(g.filter(t => t.adherent).length / g.length * 100),
    pnl: Math.round(g.reduce((a, t) => a + (+t.pnl || 0), 0))
  } : { n: 0 };
  return {
    core: sum(rows.filter(t => c.setups.includes(t.setup))),
    exploration: sum(rows.filter(t => !c.setups.includes(t.setup))),
    setups: c.setups
  };
}

// ---------- human-readable export ----------
// The JSON backup is for restoring. This is for reading: something to review
// offline, show an accountant, or look at when the app is not in front of you.
export async function humanReport() {
  const p = await profile();
  const rows = (await all('trades')).filter(t => t.closed).sort(
    (a, b) => new Date(a.closedAt) - new Date(b.closedAt));
  const live = rows.filter(t => t.mode === 'live');
  const deps = await all('deposits');
  const viol = await all('violations');
  const setups = await bySlice(SLICES.setup, 'live');
  const eq = await equityCurve();
  const dd = await drawdownSeries();
  const ap = await adherenceVsProfit('live');
  const rupee = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const L = [];

  L.push('TRADING RECORD');
  L.push('Generated ' + new Date().toLocaleString('en-IN'));
  L.push('='.repeat(60), '');

  L.push('POSITION');
  L.push(`  Phase ${p.phase} · stage ${p.stage}`);
  L.push(`  Capital ${rupee(p.capital || 0)}`);
  L.push(`  Made by trading ${rupee(eq.tradingPnl)}`);
  L.push(`  Added by deposits ${rupee(eq.deposited)} across ${deps.length} deposit(s)`);
  L.push(`  Maximum drawdown ${dd.length ? Math.max(...dd.map(d => d.dd)) : 0}%`);
  L.push('');

  L.push('BEHAVIOUR');
  L.push(`  Live trades closed: ${live.length}`);
  if (ap.adherent.n || ap.broken.n) {
    L.push(`  Rules followed: ${ap.adherent.n || 0} trades, expectancy ${ap.adherent.n ? ap.adherent.expectancy + 'R' : '—'}`);
    L.push(`  Rules broken:   ${ap.broken.n || 0} trades, expectancy ${ap.broken.n ? ap.broken.expectancy + 'R' : '—'}`);
  }
  L.push(`  Violations logged: ${viol.length}`);
  for (const [type, n] of Object.entries(viol.reduce((a, v) => (a[v.type] = (a[v.type] || 0) + 1, a), {})))
    L.push(`    ${type}: ${n}`);
  L.push('');

  L.push('BY SETUP  (nothing shown below the minimum sample)');
  for (const s of setups) {
    L.push(s.trusted
      ? `  ${s.key.padEnd(34)} n=${String(s.n).padStart(3)}  ${String(s.expectancy).padStart(6)}R  win ${s.winRate}%  rules ${s.adherence}%`
      : `  ${s.key.padEnd(34)} n=${String(s.n).padStart(3)}  insufficient data`);
  }
  L.push('');

  L.push('TRADE LOG');
  L.push('  date        symbol      setup                          R      adherent');
  for (const t of live.slice(-200)) {
    L.push(`  ${String(t.closedAt).slice(0, 10)}  ${String(t.symbol || '').padEnd(10).slice(0, 10)}  ` +
      `${String(t.setup || '').padEnd(30).slice(0, 30)} ${String(t.rMultiple).padStart(6)}  ${t.adherent ? 'yes' : 'NO'}` +
      (t.corrections ? '  [corrected]' : '') + (t.exploration ? '  [exploration]' : ''));
  }
  L.push('');
  L.push('This record is generated from your own logged trades. It is not audited,');
  L.push('and it is not a tax document.');
  return L.join('\n');
}

export async function downloadReport() {
  const text = await humanReport();
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trading-record-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
