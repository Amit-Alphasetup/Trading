// replay.js — OWNS: OHLC import, storage of price series, and the bar-replay
// state machine that makes lookahead structurally impossible.
// Imports store only.
//
// Why this exists rather than a TradingView embed: the free TradingView widget
// shows the whole chart. Nothing stops you scrolling to see what happened, and
// "don't peek" is not a control. Here the future candles are not in the DOM at
// all until you step forward, and stepping forward past your entry is what
// commits the trade. Honesty is enforced by construction, not by willpower.

import * as store from './store.js';
const { get, set, all, add, put, del } = store;

export const MIN_BARS = 120;      // enough history to judge structure
export const LOOKBACK = 60;       // bars visible to the left of the cursor

// ---------- import ----------
// Accepts the CSV shapes that free sources actually produce: Yahoo Finance
// downloads, NSE bhavcopy extracts, and most broker exports.
export function parseOHLC(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('That file has no rows.');

  const head = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/^"|"$/g, ''));
  const find = (...names) => {
    for (const n of names) {
      const i = head.findIndex(h => h === n || h.replace(/[\s_]/g, '') === n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const ci = {
    date: find('date', 'timestamp', 'time', 'datetime'),
    open: find('open', 'openprice', 'o'),
    high: find('high', 'highprice', 'h'),
    low: find('low', 'lowprice', 'l'),
    close: find('close', 'closeprice', 'c', 'adjclose'),
    vol: find('volume', 'vol', 'quantity', 'totaltradedquantity')
  };
  for (const k of ['date', 'open', 'high', 'low', 'close'])
    if (ci[k] < 0) throw new Error(`Could not find a "${k}" column. The file needs date, open, high, low and close.`);

  const num = v => +String(v).replace(/[",\s]/g, '');
  const bars = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(/[,;\t]/).map(s => s.trim().replace(/^"|"$/g, ''));
    const d = c[ci.date];
    const o = num(c[ci.open]), h = num(c[ci.high]), l = num(c[ci.low]), cl = num(c[ci.close]);
    if (!d || [o, h, l, cl].some(v => !isFinite(v) || v <= 0)) continue;
    const t = Date.parse(d.length <= 10 ? d + 'T00:00:00' : d);
    if (!isFinite(t)) continue;
    bars.push({ t, d: new Date(t).toISOString().slice(0, 10), o, h, l, c: cl,
      v: ci.vol >= 0 ? num(c[ci.vol]) || 0 : 0 });
  }
  if (bars.length < MIN_BARS)
    throw new Error(`Only ${bars.length} usable rows. At least ${MIN_BARS} are needed to judge structure honestly.`);

  bars.sort((a, b) => a.t - b.t);
  // Duplicate dates usually mean two files were concatenated.
  const seen = new Set(), clean = [];
  for (const b of bars) { if (!seen.has(b.d)) { seen.add(b.d); clean.push(b); } }
  return clean;
}

export async function importSeries(symbol, text) {
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) throw new Error('Name the symbol first.');
  const bars = parseOHLC(text);
  await set('series:' + sym, {
    symbol: sym, bars, n: bars.length,
    from: bars[0].d, to: bars[bars.length - 1].d,
    importedAt: new Date().toISOString()
  });
  const idx = await get('seriesIndex', []);
  if (!idx.includes(sym)) await set('seriesIndex', [...idx, sym]);
  return { symbol: sym, n: bars.length, from: bars[0].d, to: bars[bars.length - 1].d };
}

export const seriesList = () => get('seriesIndex', []);
export const series = sym => get('series:' + sym, null);

export async function removeSeries(sym) {
  await set('series:' + sym, null);
  await set('seriesIndex', (await get('seriesIndex', [])).filter(s => s !== sym));
}

export async function seriesInfo() {
  const out = [];
  for (const s of await seriesList()) {
    const d = await series(s);
    if (d && d.bars) out.push({ symbol: s, n: d.n, from: d.from, to: d.to });
  }
  return out;
}

// ---------- the replay session ----------
// Cursor is the index of the newest VISIBLE bar. Everything after it is withheld.
export async function startSession(symbol, pattern, startIndex) {
  const d = await series(symbol);
  if (!d) throw new Error('No price data imported for ' + symbol);
  // A random start prevents choosing a spot because you remember what happened.
  const min = LOOKBACK, max = d.bars.length - 30;
  if (max <= min) throw new Error('Not enough bars in that series.');
  const cursor = startIndex != null
    ? Math.max(min, Math.min(max, startIndex))
    : min + Math.floor(Math.random() * (max - min));

  const s = {
    symbol, pattern, cursor, startCursor: cursor,
    staged: null, openedAt: new Date().toISOString(), steps: 0
  };
  await set('replay', s);
  return s;
}

export const session = () => get('replay', null);
export const endSession = () => set('replay', null);

// Bars the chart is allowed to draw. Nothing beyond the cursor is returned, so
// the future is not merely hidden — it is absent.
export async function visible() {
  const s = await session();
  if (!s) return null;
  const d = await series(s.symbol);
  const from = Math.max(0, s.cursor - LOOKBACK);
  return {
    bars: d.bars.slice(from, s.cursor + 1),
    offset: from,
    cursor: s.cursor,
    total: d.bars.length,
    atEnd: s.cursor >= d.bars.length - 1,
    staged: s.staged,
    symbol: s.symbol,
    pattern: s.pattern,
    steps: s.steps
  };
}

export async function step(n = 1) {
  const s = await session();
  if (!s) throw new Error('No replay running.');
  const d = await series(s.symbol);
  s.cursor = Math.min(d.bars.length - 1, s.cursor + n);
  s.steps += n;
  await set('replay', s);
  return await visible();
}

// Committing the plan BEFORE stepping forward is the whole mechanism.
export async function stage(plan) {
  const s = await session();
  if (!s) throw new Error('No replay running.');
  const entry = +plan.entry, stop = +plan.stop, target = +plan.target;
  if (![entry, stop, target].every(isFinite) || entry <= 0)
    throw new Error('Entry, stop and target must all be real numbers.');
  if (stop === entry) throw new Error('The stop cannot equal the entry.');
  const d = await series(s.symbol);
  s.staged = {
    entry, stop, target,
    dir: stop < entry ? 1 : -1,
    atBar: s.cursor,
    atDate: d.bars[s.cursor].d,
    stagedAt: new Date().toISOString()
  };
  await set('replay', s);
  return s.staged;
}

// Walks forward bar by bar and reports what actually happened. The rules are
// fixed in advance so the outcome is not a judgement call:
//   - stop and target in the same bar counts as a STOP (the pessimistic
//     assumption, because intraday order is unknowable from a daily bar)
//   - no resolution within the horizon closes at the last close
export async function resolve(maxBars = 40) {
  const s = await session();
  if (!s || !s.staged) throw new Error('Nothing staged.');
  const d = await series(s.symbol);
  const p = s.staged;
  let i = p.atBar + 1;
  const end = Math.min(d.bars.length - 1, p.atBar + maxBars);
  let exit = null, reason = null, bars = 0;

  for (; i <= end; i++) {
    const b = d.bars[i];
    bars = i - p.atBar;
    const hitStop = p.dir === 1 ? b.l <= p.stop : b.h >= p.stop;
    const hitTgt = p.dir === 1 ? b.h >= p.target : b.l <= p.target;
    if (hitStop && hitTgt) { exit = p.stop; reason = 'stop'; break; }   // pessimistic
    if (hitStop) { exit = p.stop; reason = 'stop'; break; }
    if (hitTgt) { exit = p.target; reason = 'target'; break; }
  }
  if (exit === null) { exit = d.bars[end].c; reason = 'timeout'; bars = end - p.atBar; }

  const risk = Math.abs(p.entry - p.stop);
  const rMultiple = +(((exit - p.entry) * p.dir) / risk).toFixed(2);
  s.cursor = Math.min(d.bars.length - 1, p.atBar + bars);
  await set('replay', s);

  return {
    symbol: s.symbol, pattern: s.pattern, date: p.atDate,
    entry: p.entry, stop: p.stop, target: p.target,
    exit: +exit.toFixed(2), exitReason: reason, barsHeld: bars, rMultiple,
    // The bars that decided it, so the outcome can be seen rather than trusted.
    resolvedThrough: p.atBar + bars
  };
}

// After resolving, show what happened: past bars plus the decisive ones.
export async function reveal() {
  const s = await session();
  if (!s || !s.staged) return null;
  const d = await series(s.symbol);
  const from = Math.max(0, s.staged.atBar - LOOKBACK);
  const to = Math.min(d.bars.length - 1, s.cursor + 5);
  return { bars: d.bars.slice(from, to + 1), offset: from, markAt: s.staged.atBar - from,
    staged: s.staged, symbol: s.symbol };
}
