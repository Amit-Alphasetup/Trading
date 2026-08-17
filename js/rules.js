// rules.js — OWNS: every configurable rule and rule table in the system.
// Phases, setups, risk bands, intraday hard rules, the options regime map,
// and the cost-wall charge model. Judgment lives here, not scattered in logic.
import * as store from './store.js';
const { get, set, all, add, put } = store;
// schema.js — OWNS: phases, setups, tunable rule values. Pure data + defaults.
// Imports db only to read/write the user's tuned settings. Never touches UI.


// Every number here is judgment, not a finding (see plan Part K).
// They are DEFAULTS, editable in Settings. Never hard-code them elsewhere.
export const DEFAULTS = {
  adherencePass: 88,       // % rule-following to pass a trial
  regressionFloor: 80,     // % rule-following below which a level regresses
  drawdownTrigger: 12,     // % account drawdown that regresses a level
  offPlanTrades: 2,        // trades outside approved setups that regress
  regressionLock: 15,      // days locked after a regression
  regressionsToFail: 3,    // regressions inside one trial = trial failed
  cooldownDays: 30,        // after a failed trial
  btPaper: 30,             // marked examples to unlock paper trading
  btLive: 60,              // to unlock live trading
  btTrust: 100,            // before an expectancy number is shown
  trialRiskPct: 0.5,       // % risk per trade during any trial
  backupEveryNTrades: 5,   // becomes 1 if storage is not persisted
  minTagSample: 30         // trades per tag before Edge Finder shows a number
};

export async function rules() {
  const saved = await get('rules', {});
  return { ...DEFAULTS, ...saved };
}
export async function setRule(key, val) {
  const saved = await get('rules', {});
  saved[key] = val;
  await set('rules', saved);
}

// Risk ceiling by capital. The TRIAL risk always wins while a trial is active.
export const RISK_TABLE = [
  { max: 100000, ceiling: 2, dailyCap: 4 },
  { max: 1000000, ceiling: 1, dailyCap: 3 },
  { max: 10000000, ceiling: 0.75, dailyCap: 2 },
  { max: Infinity, ceiling: 0.5, dailyCap: 1.5 }
];
export function riskBand(capital) {
  return RISK_TABLE.find(b => capital < b.max) || RISK_TABLE[RISK_TABLE.length - 1];
}

export const SETUPS = {
  swing: ['consolidation breakout', 'pullback to 20/50 EMA', 'VCP',
    '52-week-high breakout', 'failed-breakdown reversal',
    'sector rotation momentum', 'earnings-gap continuation'],
  intraday: ['opening range breakout 15m', 'VWAP mean reversion',
    'VWAP trend pullback', 'relative-strength pair play',
    'previous-day high/low break with retest', 'failed-breakout fade'],
  options: ['bull call spread', 'bear put spread', 'bull put spread',
    'bear call spread', 'iron condor', 'iron butterfly', 'calendar spread',
    'diagonal spread', 'ratio spread', 'broken-wing butterfly', 'jade lizard',
    'covered call', 'cash-secured put', 'short strangle', 'short straddle']
};

export const PHASES = [
  {
    id: 1, name: 'Foundation',
    blurb: 'Learn at your pace. No live money.',
    minCapital: 0, calendarDays: 0, minTrades: 0,
    profitRequired: false, segments: []
  },
  {
    id: 2, name: 'Equity Trial',
    blurb: '90 trading days, 40 live trades. Behaviour only — profit not required.',
    minCapital: 25000, calendarDays: 90, minTrades: 40,
    profitRequired: false, segments: ['swing', 'intraday']
  },
  {
    id: 3, name: 'Options Trial',
    blurb: '120 trading days, 60 live trades. Defined risk only. Profit IS required.',
    minCapital: 300000, calendarDays: 120, minTrades: 60,
    profitRequired: true, segments: ['options']
  },
  {
    id: 4, name: 'Advanced',
    blurb: 'Undefined risk, expiry-day, scalping. Three separate trials, none of them a promotion.',
    minCapital: 1000000, calendarDays: 120, minTrades: 60,
    profitRequired: true, segments: ['options']
  }
];
export const phase = id => PHASES.find(p => p.id === id);

// Default profile, created on first run.
export function blankProfile() {
  return {
    capital: 0,
    capitalIsClean: null,   // G5 hard block: null = unanswered
    capitalAskedOn: null,
    phase: 1,
    stage: 'learning',      // learning | paper | live | locked | paused | cooldown
    lockedUntil: null,
    pausedSince: null,
    trial: null,            // {startedISO, tradeCount, dayCount, regressions}
    peakEquity: 0,
    startedISO: new Date().toISOString()
  };
}


// ===== INTRADAY HARD RULES & MARKET FILTER =====
// intraday.js — OWNS: intraday hard rules and the market filter overlay.
// Imports db + schema only. Must not import journal (journal imports this).



const MIN = 60000;
const today = () => new Date().toISOString().slice(0, 10);

// Rules a person writes while calm and breaks while trading. They belong in
// software, not willpower. Tunable — every number here is judgment.
export const DEFAULT_RULES = {
  maxTradesPerDay: 3,
  deadZoneStart: '11:30',
  deadZoneEnd: '13:30',
  flatBy: '15:10',
  noNewAfter: '15:00',
  dailyLossCapPct: 3,      // % of capital; hitting it locks the day
  maxLeverage: 2
};

export async function intradayRules() {
  const saved = await get('intradayRules', {});
  return { ...DEFAULT_RULES, ...saved };
}
export async function setIntradayRule(k, v) {
  const s = await get('intradayRules', {});
  s[k] = v;
  await set('intradayRules', s);
}

const hhmm = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const nowMins = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export function isIntradaySetup(setup) {
  return SETUPS.intraday.includes(setup);
}

// ---------- the market filter overlay ----------
// Individual stocks do not float free of the market. Logged daily, by him,
// because free APIs will not reliably give this and a wrong number is worse
// than an honest one he entered himself.
export async function marketState() {
  const m = await get('marketState', {});
  return m[today()] || null;
}

export async function logMarket(f) {
  const s = {
    niftyAbove50: !!f.niftyAbove50,
    ema50Rising: !!f.ema50Rising,
    breadth: f.breadth,           // 'broad' | 'narrow'
    vix: +f.vix || null,
    at: new Date().toISOString()
  };
  // Long permission requires price above a rising average. Below it, longs are
  // not banned outright — the number of trades is cut, not the size, so that
  // risk-per-trade data stays comparable.
  s.longsAllowed = s.niftyAbove50;
  s.shortsAllowed = !s.niftyAbove50;
  s.tradeBudget = (s.niftyAbove50 && s.ema50Rising) ? null : 'half';
  // VIX regime adjusts size. High VIX means the same stop distance in points is
  // a larger move in probability terms.
  s.sizeFactor = s.vix == null ? 1 : s.vix >= 25 ? 0.5 : s.vix >= 18 ? 0.75 : 1;
  if (s.breadth === 'narrow' && s.sizeFactor > 0.75) s.sizeFactor = 0.75;

  const m = await get('marketState', {});
  m[today()] = s;
  await set('marketState', m);
  return s;
}

export async function marketSizeFactor() {
  const m = await marketState();
  return m ? m.sizeFactor : 1;
}

// ---------- daily counters ----------
async function todayTrades(mode) {
  const rows = await all('trades');
  const d = today();
  return rows.filter(t => t.mode === mode && String(t.lockedAt).slice(0, 10) === d);
}

export async function dayStatus(mode = 'live') {
  const r = await intradayRules();
  const rows = await todayTrades(mode);
  const intra = rows.filter(t => isIntradaySetup(t.setup));
  const closed = intra.filter(t => t.closed);
  const pnl = closed.reduce((a, t) => a + (+t.pnl || 0), 0);
  const locked = await get('dayLock', null);
  return {
    count: intra.length, max: r.maxTradesPerDay,
    pnl, open: intra.filter(t => !t.closed).length,
    lockedToday: locked === today(),
    rules: r
  };
}

export async function lockDay() { await set('dayLock', today()); }

// Called after every close: does today's loss breach the cap?
export async function checkDailyLoss(capital) {
  const r = await intradayRules();
  const s = await dayStatus('live');
  if (!capital || s.lockedToday) return null;
  const lossPct = s.pnl < 0 ? Math.abs(s.pnl) / capital * 100 : 0;
  if (lossPct >= r.dailyLossCapPct) {
    await lockDay();
    await add('violations', { type: 'daily-loss-cap',
      reason: `Daily loss ${lossPct.toFixed(1)}% reached the ${r.dailyLossCapPct}% cap`,
      at: new Date().toISOString() });
    return { locked: true, lossPct: +lossPct.toFixed(1), cap: r.dailyLossCapPct };
  }
  return null;
}

// ---------- the gate applied before every intraday entry ----------
export async function check(setup, mode, aPlus = false) {
  if (!isIntradaySetup(setup)) return { blocks: [], warnings: [] };
  const r = await intradayRules();
  const s = await dayStatus(mode);
  const n = nowMins();
  const blocks = [], warnings = [];

  if (s.lockedToday)
    blocks.push('Daily loss cap was hit. The account is locked for today. The setups will still be there tomorrow.');

  if (s.count >= r.maxTradesPerDay)
    blocks.push(`Already ${s.count} intraday trades today. Cap is ${r.maxTradesPerDay}. Trades beyond the cap are overwhelmingly boredom or revenge trades.`);

  if (n >= hhmm(r.deadZoneStart) && n < hhmm(r.deadZoneEnd) && !aPlus)
    blocks.push(`It is the ${r.deadZoneStart}–${r.deadZoneEnd} dead zone. Only an A+ setup may be taken, and you must mark it as such.`);

  if (n >= hhmm(r.noNewAfter))
    blocks.push(`No new intraday entries after ${r.noNewAfter}. Closing volatility is a poor place to be opening a position.`);

  if (n >= hhmm(r.flatBy) - 20 && s.open)
    warnings.push(`Flat by ${r.flatBy}. You have ${s.open} position(s) open.`);

  // Market filter
  const m = await marketState();
  if (mode === 'live' && !m)
    blocks.push('Log the market filter for today before trading. Individual stocks do not float free of the market.');
  else if (m) {
    if (m.tradeBudget === 'half' && s.count >= Math.floor(r.maxTradesPerDay / 2))
      blocks.push('Nifty is not above a rising 50 EMA. Trade budget is halved today — number of trades cut, not size.');
    if (m.sizeFactor < 1)
      warnings.push(`Market conditions cut size to ${m.sizeFactor * 100}% (VIX/breadth).`);
  }
  return { blocks, warnings, status: s };
}

// Positions still open near the close.
export async function openPastFlat() {
  const r = await intradayRules();
  if (nowMins() < hhmm(r.flatBy)) return [];
  const rows = await all('trades');
  const d = today();
  return rows.filter(t => !t.closed && isIntradaySetup(t.setup) &&
    String(t.lockedAt).slice(0, 10) === d);
}


// ===== OPTIONS REGIME CLASSIFIER & COST WALL =====
// regime.js — OWNS: the Regime Classifier and the Cost Wall.
// Imports db + schema only. No DOM.


// The commonest options failure is right strategy, wrong market.
// So the regime is chosen FIRST and it removes strategies from the menu.
export const REGIMES = {
  Trending: {
    tell: 'Index above a rising 50 EMA (or below a falling one). Higher highs and higher lows. Clear direction.',
    legal: ['bull call spread', 'bear put spread', 'bull put spread', 'bear call spread',
      'calendar spread', 'diagonal spread', 'covered call', 'cash-secured put'],
    banned: { 'iron condor': 'A condor needs price to stay inside a range. A trend is the one condition guaranteed to break it.',
      'iron butterfly': 'Same problem as the condor, with an even narrower profit zone.',
      'short strangle': 'Undefined risk against a directional market. This is how accounts end.' }
  },
  Rangebound: {
    tell: 'Index oscillating between clear levels. Flat 50 EMA. No sustained direction for weeks.',
    legal: ['iron condor', 'iron butterfly', 'bull put spread', 'bear call spread',
      'covered call', 'cash-secured put', 'calendar spread'],
    banned: { 'bull call spread': 'A debit spread needs a directional move to pay. In a range you pay premium and watch it decay.',
      'bear put spread': 'Same problem inverted.' }
  },
  Event: {
    tell: 'Results, policy decision, election, budget — a scheduled moment when uncertainty resolves.',
    legal: ['bull call spread', 'bear put spread', 'calendar spread'],
    banned: { 'iron condor': 'Selling premium into an event means being short the exact thing the event will move.',
      'iron butterfly': 'Same. The event is precisely the risk you would be selling.',
      'short strangle': 'Undefined risk across a known volatility event. No.',
      'bull put spread': 'Short premium into a scheduled shock. The credit rarely compensates for the gap risk.',
      'bear call spread': 'Same problem.' }
  },
  'High-IV': {
    tell: 'IV percentile above roughly 70 for this instrument. Options are expensive relative to their own history.',
    legal: ['bull put spread', 'bear call spread', 'iron condor', 'iron butterfly',
      'covered call', 'cash-secured put', 'short strangle', 'short straddle'],
    banned: { 'bull call spread': 'Buying expensive premium. If IV falls you lose even when direction is right.',
      'bear put spread': 'Same.',
      'calendar spread': 'Calendars want low front-month IV. High IV inverts the logic.' }
  },
  'Low-IV': {
    tell: 'IV percentile below roughly 30. Options are cheap relative to their own history.',
    legal: ['bull call spread', 'bear put spread', 'calendar spread', 'diagonal spread'],
    banned: { 'iron condor': 'Selling cheap premium collects little and still carries the full loss if wrong.',
      'iron butterfly': 'Same — the credit does not pay for the risk.',
      'bull put spread': 'Thin credit for real risk.',
      'bear call spread': 'Thin credit for real risk.' }
  },
  Expiry: {
    tell: 'Expiry day or the day before. Gamma is enormous and behaviour flips within a few points.',
    legal: ['bull call spread', 'bear put spread'],
    banned: { 'iron condor': 'Pin risk. A condor that is fine at 14:00 can be at max loss by 15:15.',
      'iron butterfly': 'Maximum gamma exposure at the worst possible time.',
      'short strangle': 'Never. This is the classic account-ending trade.',
      'bull put spread': 'Gamma makes the short leg unmanageable near the strike.',
      'bear call spread': 'Same.',
      'calendar spread': 'The front leg expires under you.' }
  }
};

export const regimeNames = () => Object.keys(REGIMES);

export function strategiesFor(regime) {
  const r = REGIMES[regime];
  if (!r) return { legal: [], banned: {} };
  return r;
}

export function isLegal(regime, strategy) {
  const r = REGIMES[regime];
  if (!r) return { ok: true, why: null };
  if (r.banned[strategy]) return { ok: false, why: r.banned[strategy] };
  if (r.legal.includes(strategy)) return { ok: true, why: null };
  return { ok: false, why: `${strategy} is not on the approved list for a ${regime} market.` };
}

export const saveRegime = (regime, note) =>
  set('regimeToday', { regime, note: note || '', at: new Date().toISOString() });

export async function todayRegime() {
  const r = await get('regimeToday', null);
  if (!r) return null;
  const sameDay = new Date(r.at).toDateString() === new Date().toDateString();
  return sameDay ? r : null;
}

// ---------- The Cost Wall ----------
// Computed from HIS broker's real charges. Never from an invented example.
export async function charges() {
  return await get('charges', {
    brokeragePerOrder: null,   // ₹ per executed order
    sttSellPct: null,          // % of sell turnover
    exchangePct: null,         // % of turnover
    gstPct: 18,                // % on brokerage + exchange charges
    stampPct: null,            // % of buy turnover
    slippagePerSide: null      // ₹ per side, your own measured figure
  });
}
export const saveCharges = c => set('charges', c);

// One round trip on a given turnover, in rupees.
export function roundTripCost(c, turnover) {
  const brokerage = (+c.brokeragePerOrder || 0) * 2;
  const stt = turnover * (+c.sttSellPct || 0) / 100;
  const exch = turnover * 2 * (+c.exchangePct || 0) / 100;
  const gst = (brokerage + exch) * (+c.gstPct || 0) / 100;
  const stamp = turnover * (+c.stampPct || 0) / 100;
  const slip = (+c.slippagePerSide || 0) * 2;
  return { brokerage, stt, exch, gst, stamp, slip,
    total: brokerage + stt + exch + gst + stamp + slip };
}

// Take his ACTUAL closed trades and show gross versus net.
export async function costWall(mode = 'live') {
  const c = await charges();
  const missing = ['brokeragePerOrder', 'sttSellPct', 'exchangePct', 'stampPct', 'slippagePerSide']
    .filter(k => c[k] === null || c[k] === '');
  if (missing.length) return { ready: false, missing };

  const trades = (await all('trades')).filter(t => t.closed && t.mode === mode);
  if (!trades.length) return { ready: false, noTrades: true };

  let gross = 0, cost = 0;
  const breakdown = { brokerage: 0, stt: 0, exch: 0, gst: 0, stamp: 0, slip: 0 };
  for (const t of trades) {
    gross += (+t.pnl || 0);
    const turnover = (+t.entry || 0) * (+t.qty || 0);
    const r = roundTripCost(c, turnover);
    cost += r.total;
    for (const k in breakdown) breakdown[k] += r[k];
  }
  const net = gross - cost;
  return {
    ready: true, n: trades.length,
    gross: Math.round(gross), cost: Math.round(cost), net: Math.round(net),
    perTrade: Math.round(cost / trades.length),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, Math.round(v)])),
    flipped: gross > 0 && net <= 0,
    // What frequency does to the same cost base.
    annual: {
      swing: Math.round(cost / trades.length * 160),
      intraday: Math.round(cost / trades.length * 720),
      scalping: Math.round(cost / trades.length * 5000)
    }
  };
}

// Scalping stays locked until the wall has been computed and acknowledged.
export const scalpAcknowledged = () => get('costWallAck', false);
export const acknowledgeScalp = () => set('costWallAck', true);

// ===== PHASE 4 SUB-TRIALS =====
// Three different ways to take on more risk. Each is a separate trial with its
// own capital bar and its own precondition, and none of them is a promotion.
export const PHASE4 = {
  '4A': {
    name: 'Undefined risk',
    minCapital: 1000000, days: 120, trades: 60,
    strategies: ['short strangle', 'short straddle'],
    unit: 'options4',
    requires: [
      { key: 'protocol', label: 'A written adjustment protocol, before the first trade' },
      { key: 'unit', label: 'The adjustment and undefined-risk unit passed' }
    ],
    warning: 'Undefined-risk positions are destroyed by gaps, not by drifts. The capital bar is not about affording margin — it is about surviving the tail, because over enough trades the tail arrives.'
  },
  '4B': {
    name: 'Expiry day / 0-DTE',
    minCapital: 500000, days: 90, trades: 60,
    definedRiskUntil: 200,
    unit: 'options4',
    requires: [
      { key: 'unit', label: 'The expiry-day unit passed' }
    ],
    warning: 'Defined risk only until 200 logged expiry-day trades. Gamma near expiry means a small mistake produces the largest possible consequence.'
  },
  '4C': {
    name: 'Scalping',
    minCapital: 500000, days: 60, trades: 100,
    unit: 'costs',
    requires: [
      { key: 'costwall', label: 'The Cost Wall computed from your real broker charges, and acknowledged' }
    ],
    warning: 'Costs scale with the number of trades, not with the size of your edge. This is the highest cost drag of any style and the one beginners are most drawn to.'
  }
};

export async function phase4Status(key) {
  const spec = PHASE4[key];
  if (!spec) return null;
  const protocols = await get('adjustmentProtocol', null);
  const units = await get('units', {});
  const ack = await get('costWallAck', false);
  const trades = await all('trades');
  const expiryTrades = trades.filter(t => t.closed && t.regime === 'Expiry').length;

  const checks = spec.requires.map(r => {
    if (r.key === 'protocol') return { ok: !!(protocols && protocols.text), t: r.label };
    if (r.key === 'unit') return { ok: !!(units[spec.unit] && units[spec.unit].passed), t: r.label };
    if (r.key === 'costwall') return { ok: !!ack, t: r.label };
    return { ok: false, t: r.label };
  });
  return {
    key, ...spec, checks, ok: checks.every(c => c.ok),
    expiryTrades,
    definedRiskOnly: spec.definedRiskUntil ? expiryTrades < spec.definedRiskUntil : false
  };
}

export async function saveAdjustmentProtocol(text) {
  if (!text || text.trim().length < 200)
    throw new Error('At least 200 characters. A protocol you have not written out in full is a protocol you do not have when it matters.');
  await set('adjustmentProtocol', { text: text.trim(), at: new Date().toISOString() });
}
export const adjustmentProtocol = () => get('adjustmentProtocol', null);
