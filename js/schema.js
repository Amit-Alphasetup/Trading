// schema.js — OWNS: phases, setups, tunable rule values. Pure data + defaults.
// Imports db only to read/write the user's tuned settings. Never touches UI.

import * as db from './db.js';

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
  const saved = await db.get('rules', {});
  return { ...DEFAULTS, ...saved };
}
export async function setRule(key, val) {
  const saved = await db.get('rules', {});
  saved[key] = val;
  await db.set('rules', saved);
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
    'covered call', 'cash-secured put']
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
    blurb: 'Undefined risk, expiry-day, scalping. Separate trials each.',
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
