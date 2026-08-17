// journal.js — OWNS: the pre-trade card and its timestamp lock, the post-trade
// card and adherence scoring, and broker trade-book reconciliation.
// This is the anti-fraud layer. Everything here exists to make lying expensive.
import * as store from './store.js';
const { get, set, all, add, put } = store;
import * as R from './rules.js';
const { SETUPS, todayRegime, isLegal, check: intradayCheck, checkDailyLoss } = R;
import * as ledger from './ledger.js';
const { trackOf, profile, saveProfile, gate, approvedSetups, positionSize, checkRegression } = ledger;
import * as spec from './specialise.js';
import * as mind from './mind.js';
const { todayState, tilt, markWinCapUsed, reviewBlock } = mind;
// journal.js — OWNS: trade records, the timestamp lock, adherence scoring.
// Imports db + schema + ledger. Never touches the DOM.








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
  let trade_regime = null;
  const p = await profile();
  const need = ['symbol', 'setup', 'thesis', 'entry', 'stop', 'target', 'regime', 'invalidation'];
  for (const k of need) if (f[k] === '' || f[k] == null) throw new Error(`Missing: ${k}`);

  const entry = +f.entry, stop = +f.stop, target = +f.target;
  if (!(entry > 0) || !(stop > 0) || !(target > 0)) throw new Error('Entry, stop and target must be positive.');
  const risk = Math.abs(entry - stop);
  if (!risk) throw new Error('Stop cannot equal entry.');
  const dir = stop < entry ? 1 : -1;
  if ((target - entry) * dir <= 0) throw new Error('Target is on the wrong side of entry.');

  const mode = f.mode === 'live' ? 'live' : 'paper';
  if (mode === 'live') {
    const g = await gate();
    if (!g.allowed) throw new Error('Live trading is blocked: ' + g.blocks[0].msg);
    const st = await todayState();
    if (!st) throw new Error('Log your pre-market state before trading today.');
    if (st.blocked) throw new Error('Pre-market gate: ' + st.reasons.join('; ') + '.');
    const rb = await reviewBlock();
    if (rb) throw new Error(rb);
  }
  // Regime Classifier: the market must be tagged, and the strategy must be legal in it.
  if (SETUPS.options.includes(f.setup)) {
    const today = await todayRegime();
    if (!today) throw new Error('Tag the market regime before any options trade.');
    const legal = isLegal(today.regime, f.setup);
    if (!legal.ok) throw new Error(`Blocked in a ${today.regime} market — ${legal.why}`);
    trade_regime = today.regime;
  }

  // Core-setup discipline: off-core trades are budgeted, not banned.
  if (mode === 'live') {
    const specBlock = await spec.checkSetup(f.setup);
    if (specBlock) throw new Error(specBlock);
  }

  // Intraday hard rules: trade cap, dead zone, cut-off, daily loss lock, market filter.
  const idc = await intradayCheck(f.setup, mode, !!f.aPlus);
  if (idc.blocks.length) throw new Error(idc.blocks[0]);

  const hard = (await tilt()).filter(x => x.hard);
  if (hard.length) throw new Error(hard[0].msg);
  const approved = await approvedSetups(mode);
  if (!approved.includes(f.setup)) {
    await add('violations', { type: 'off-plan', setup: f.setup, at: new Date().toISOString() });
    throw new Error(`"${f.setup}" is not on your approved list. Logged as an off-plan attempt.`);
  }

  const size = await positionSize(p, entry, stop);
  const rr = +(Math.abs(target - entry) / risk).toFixed(2);

  const trade = {
    mode, symbol: String(f.symbol).trim().toUpperCase(),
    setup: f.setup, thesis: f.thesis, entry, stop, target,
    regime: trade_regime || f.regime, confidence: +f.confidence || 3, emotionPre: +f.emotionPre || 3,
    invalidation: f.invalidation, qty: size.qty, riskRupees: size.riskRupees,
    riskPct: size.pct, rr,
    // THE LOCK. Written once, never editable, compared against the broker fill time.
    lockedAt: new Date().toISOString(),
    // Tagged at entry so an experiment can never quietly pollute the statistics
    // of the setup he is actually trying to master.
    exploration: await spec.isExploration(f.setup),
    closed: false, adherent: null, shots: []
  };
  const id = await add('trades', trade);
  // Only the winning-streak cap is consumable. A market/VIX cut must not burn it.
  if (size.streakCapped) await markWinCapUsed();
  return { ...trade, id };
}

export async function openTrades() {
  return (await all('trades')).filter(t => !t.closed);
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
  const rows = await all('trades');
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

  await put('trades', t);

  if (t.mode === 'live') {
    const p = await profile();
    p.capital = Math.max(0, (p.capital || 0) + t.pnl);
    p.peakEquity = Math.max(p.peakEquity || 0, p.capital);
    // Credit the trial belonging to this setup's track. Fast intraday volume
    // must never satisfy a swing trial's trade minimum.
    const tr = ledger.trackOf(t.setup);
    if (p.trials && p.trials[tr]) {
      p.trials[tr].tradeCount = (p.trials[tr].tradeCount || 0) + 1;
      // p.trial is a pointer to the active track's record. Re-point it rather
      // than incrementing again — they can be the same object.
      if ((p.activeTrack || 'swing') === tr) p.trial = p.trials[tr];
    } else if (p.trial && (p.activeTrack || 'swing') === tr) {
      p.trial.tradeCount = (p.trial.tradeCount || 0) + 1;
    }
    await saveProfile(p);
    await checkDailyLoss(p.capital);
    await checkRegression();
  }
  return t;
}

// ---------- summary used by the status screen ----------
export async function stats(mode) {
  const t = (await all('trades')).filter(x => x.closed && (!mode || x.mode === mode));
  if (!t.length) return { n: 0 };
  const r = await R.rules();
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


// ===== BROKER RECONCILIATION =====
// broker.js — OWNS: broker trade-book import, reconciliation, Honesty Score.
// Imports db only. No network calls: the browser cannot safely hold an API secret,
// so this reads the CSV you export from your broker's console.


// Tolerant header matching — brokers rename columns between exports.
const pick = (row, names) => {
  for (const n of names) {
    const k = Object.keys(row).find(x => x.toLowerCase().replace(/[^a-z]/g, '') === n);
    if (k && row[k] !== '') return row[k];
  }
  return null;
};

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) throw new Error('Empty file.');
  // Skip any preamble rows before the real header.
  let h = 0;
  while (h < lines.length && !/symbol|tradingsymbol/i.test(lines[h])) h++;
  if (h >= lines.length) throw new Error('No Symbol column found. Is this a trade book export?');

  const split = l => {
    const out = []; let cur = '', q = false;
    for (const c of l) {
      if (c === '"') q = !q;
      else if (c === ',' && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const head = split(lines[h]);
  const rows = [];
  for (let i = h + 1; i < lines.length; i++) {
    const c = split(lines[i]);
    if (c.length < 3) continue;
    const o = {};
    head.forEach((k, j) => o[k] = c[j]);
    const sym = pick(o, ['symbol', 'tradingsymbol', 'instrument']);
    if (!sym) continue;
    rows.push({
      symbol: sym.toUpperCase(),
      side: (pick(o, ['tradetype', 'type', 'buysell', 'transactiontype']) || '').toLowerCase(),
      qty: +(pick(o, ['quantity', 'qty', 'filledqty']) || 0),
      price: +(pick(o, ['price', 'averageprice', 'tradeprice']) || 0),
      at: pick(o, ['orderexecutiontime', 'executiontime', 'tradedate', 'date', 'time']),
      tradeId: pick(o, ['tradeid', 'id']),
      orderId: pick(o, ['orderid'])
    });
  }
  if (!rows.length) throw new Error('Header found but no trade rows parsed.');
  return rows;
}

export async function importFills(rows) {
  const existing = await get('fills', []);
  const seen = new Set(existing.map(f => f.tradeId || (f.symbol + f.at + f.qty)));
  let added = 0;
  for (const r of rows) {
    const key = r.tradeId || (r.symbol + r.at + r.qty);
    if (seen.has(key)) continue;
    seen.add(key); existing.push(r); added++;
  }
  await set('fills', existing);
  await set('fillsImportedAt', new Date().toISOString());
  return { added, total: existing.length };
}

const day = s => {
  const d = new Date(s);
  return isNaN(d) ? String(s).slice(0, 10) : d.toISOString().slice(0, 10);
};

// The two things reconciliation catches:
//   1. Exchange trades with no journal entry  → he forgot, or hid it
//   2. Journal cards written AFTER the fill   → he invented the reasoning later
export async function reconcile() {
  const fills = await get('fills', []);
  const trades = (await all('trades')).filter(t => t.mode === 'live');
  const used = new Set();
  const late = [], matched = [];

  for (const t of trades) {
    if (!t.symbol) continue;
    const cand = fills.filter((f, i) => !used.has(i) &&
      f.symbol === t.symbol.toUpperCase() && day(f.at) === day(t.lockedAt));
    if (!cand.length) continue;
    // Earliest fill that day is the entry.
    cand.sort((a, b) => new Date(a.at) - new Date(b.at));
    const f = cand[0];
    used.add(fills.indexOf(f));
    t.exchangeAt = new Date(f.at).toISOString();
    t.brokerPrice = f.price;
    t.brokerQty = f.qty;
    const wasLate = new Date(t.lockedAt) > new Date(t.exchangeAt);
    if (wasLate) {
      t.adherent = false;
      t.flags = [...new Set([...(t.flags || []), 'late journal entry'])];
      late.push(t);
    }
    matched.push(t);
    await put('trades', t);
  }

  const unlogged = fills.filter((f, i) => !used.has(i) && f.side === 'buy');
  for (const u of unlogged) {
    const v = await get('loggedViolations', []);
    const key = u.tradeId || (u.symbol + u.at);
    if (!v.includes(key)) {
      await add('violations', {
        type: 'unlogged-trade',
        reason: `${u.symbol} on ${day(u.at)} appears at the exchange with no journal entry`,
        at: new Date().toISOString()
      });
      v.push(key); await set('loggedViolations', v);
    }
  }

  const denom = matched.length + unlogged.length;
  const score = denom ? Math.round((matched.length - late.length) / denom * 100) : null;
  await set('honestyScore', score);
  return { fills: fills.length, matched: matched.length, late: late.length,
    unlogged: unlogged.length, score, unloggedRows: unlogged.slice(0, 20) };
}

export const honestyScore = () => get('honestyScore', null);
export const lastImport = () => get('fillsImportedAt', null);
export const clearFills = async () => {
  await set('fills', []); await set('loggedViolations', []);
  await set('honestyScore', null);
};

// ---------- correcting a closed trade ----------
// One typo in an exit price was previously permanent and silently wrong in every
// statistic. Corrections are allowed, logged, and never silent.
export async function correctTrade(id, fields, reason) {
  if (!reason || reason.trim().length < 10)
    throw new Error('A correction needs a written reason of at least 10 characters.');
  const rows = await all('trades');
  const t = rows.find(x => x.id === id);
  if (!t) throw new Error('Trade not found.');

  const allowed = ['exit', 'exitReason', 'qty', 'lesson', 'emotionDuring', 'symbol'];
  const before = {};
  for (const k of Object.keys(fields)) {
    if (!allowed.includes(k)) throw new Error(`${k} cannot be corrected. Entry, stop and the lock timestamp are permanent.`);
    before[k] = t[k];
    t[k] = k === 'exitReason' || k === 'lesson' || k === 'symbol' ? fields[k] : +fields[k];
  }
  if (t.closed) {
    const risk = Math.abs(t.entry - t.stop);
    const dir = t.stop < t.entry ? 1 : -1;
    t.rMultiple = +(((t.exit - t.entry) * dir) / risk).toFixed(2);
    t.pnl = Math.round((t.exit - t.entry) * dir * (t.qty || 0));
  }
  t.corrections = [...(t.corrections || []),
    { before, after: { ...fields }, reason: reason.trim(), at: new Date().toISOString() }];
  await put('trades', t);

  // A corrected live trade changes P&L, so capital and the regression check
  // must both be recomputed rather than left stale.
  if (t.mode === 'live') {
    const p = await profile();
    const live = (await all('trades')).filter(x => x.mode === 'live' && x.closed);
    p.capital = Math.max(0, (p.tradingBase || 0) + live.reduce((a, x) => a + (+x.pnl || 0), 0)
      + (p.depositsTotal || 0));
    await saveProfile(p);
    await checkRegression();
  }
  return t;
}

export async function correctionLog() {
  const rows = await all('trades');
  return rows.filter(t => t.corrections && t.corrections.length)
    .map(t => ({ id: t.id, symbol: t.symbol, at: t.closedAt, corrections: t.corrections }));
}
