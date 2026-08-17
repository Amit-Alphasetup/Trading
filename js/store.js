// store.js — OWNS: all persistence. IndexedDB, backup/restore, image compression.
// Nothing else in the app may call indexedDB directly.
// Imports nothing. Everything else imports this.
// db.js — OWNS: all IndexedDB access. Touches nothing else.
// Nothing above this file may call indexedDB directly.

const NAME = 'tcs';
const VERSION = 3;
export const STORES = ['meta', 'trades', 'backtests', 'violations', 'amendments', 'deposits', 'qualifications'];

let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
      for (const s of ['trades', 'backtests', 'violations', 'amendments', 'deposits', 'qualifications']) {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: 'id', autoIncrement: true });
        }
      }
    };
    r.onsuccess = () => { _db = r.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}

function run(store, mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req ? req.result : undefined);
    t.onerror = () => rej(t.error);
  }));
}

export const put = (store, obj) => run(store, 'readwrite', s => s.put(obj));
export const add = (store, obj) => run(store, 'readwrite', s => s.add(obj));
export const all = (store) => run(store, 'readonly', s => s.getAll());
export const clear = (store) => run(store, 'readwrite', s => s.clear());
export const del = (store, id) => run(store, 'readwrite', s => s.delete(id));

// --- meta: simple key/value settings ---
export async function get(k, fallback = null) {
  const r = await run('meta', 'readonly', s => s.get(k));
  return r === undefined ? fallback : r.v;
}
export const set = (k, v) => put('meta', { k, v });

// --- storage health: drives how aggressive backups must be ---
export async function storageHealth() {
  const out = { persisted: false, quotaMB: 0, usedMB: 0, supported: false };
  if (navigator.storage && navigator.storage.persist) {
    out.supported = true;
    out.persisted = await navigator.storage.persisted();
    if (!out.persisted) out.persisted = await navigator.storage.persist();
    const e = await navigator.storage.estimate();
    out.quotaMB = Math.round((e.quota || 0) / 1048576);
    out.usedMB = +((e.usage || 0) / 1048576).toFixed(1);
  }
  return out;
}

// --- full export / import: the only real safety net ---
// Screenshots are base64 and would make a 300-trade export tens of megabytes,
// which eventually fails outright on a phone. The trade DATA is what matters and
// is always kept; images are opt-in.
export async function exportAll(includeImages = false) {
  const dump = { version: VERSION, exported: new Date().toISOString(), imagesIncluded: !!includeImages };
  for (const s of STORES) dump[s] = await all(s);
  if (!includeImages) {
    let dropped = 0;
    dump.trades = dump.trades.map(t => {
      if (t.shots && t.shots.length) { dropped += t.shots.length; return { ...t, shots: [] }; }
      return t;
    });
    dump.imagesDropped = dropped;
  }
  return dump;
}

// Rough size of the next export, so the app can warn before it fails.
export async function exportSizeMB(includeImages = false) {
  const d = await exportAll(includeImages);
  return +(JSON.stringify(d).length / 1048576).toFixed(2);
}

export async function importAll(dump) {
  if (!dump || !dump.version) throw new Error('not a valid backup file');
  for (const s of STORES) {
    if (!dump[s]) continue;
    await clear(s);
    for (const row of dump[s]) await put(s, row);
  }
  await migrate();
  return true;
}

// ---------- migration ----------
// Older records lack fields that newer logic assumes. Run on every load: cheap,
// idempotent, and it stops one missing field from breaking a screen.
export async function migrate() {
  const done = await get('schemaVersion', 0);
  if (done >= 2) return 0;
  let touched = 0;

  const trades = await all('trades');
  for (const t of trades) {
    let ch = false;
    if (t.symbol == null) { t.symbol = ''; ch = true; }
    if (t.mode == null) { t.mode = 'paper'; ch = true; }
    if (t.closed && t.adherent == null) { t.adherent = false; ch = true; }
    if (t.closed && t.closedAt == null) { t.closedAt = t.lockedAt || new Date().toISOString(); ch = true; }
    if (ch) { await put('trades', t); touched++; }
  }

  const bts = await all('backtests');
  for (const b of bts) {
    let ch = false;
    if (b.symbol == null) { b.symbol = ''; ch = true; }
    if (b.date == null) { b.date = ''; ch = true; }
    if (b.legacy == null && (!b.symbol || !b.date)) { b.legacy = true; ch = true; }
    if (ch) { await put('backtests', b); touched++; }
  }

  // Trading base: capital as it stood before deposits, so drawdown can be
  // measured on trading performance rather than on money that was paid in.
  const prof = await get('profile', null);
  if (prof && prof.tradingBase == null) {
    const deps = await all('deposits');
    const pnl = trades.filter(t => t.mode === 'live' && t.closed)
      .reduce((a, t) => a + (+t.pnl || 0), 0);
    prof.tradingBase = Math.max(0, (prof.capital || 0)
      - deps.reduce((a, d) => a + (+d.amount || 0), 0) - pnl);
    prof.depositsTotal = deps.reduce((a, d) => a + (+d.amount || 0), 0);
    await set('profile', prof);
    touched++;
  }
  await set('schemaVersion', 2);
  return touched;
}


// ===== BACKUP =====
// backup.js — OWNS: export/import and backup nagging. Imports db + schema only.



export async function status() {
  const health = await storageHealth();
  const last = await get('lastBackup', null); // {at, tradeCount}
  const trades = (await all('trades')).length;
  // Chrome refuses persistence until a site is "engaged" — so if it is off,
  // back up after EVERY trade, not every 5.
  const tuned = await get('rules', {});
  const every = health.persisted ? (tuned.backupEveryNTrades || 5) : 1;
  const since = trades - (last ? last.tradeCount : 0);
  const stale = last ? (Date.now() - new Date(last.at).getTime()) > 7 * 86400000 : trades > 0;
  return {
    ...health, trades, since, every, stale,
    lastAt: last ? last.at : null,
    due: since >= every || stale || (trades > 0 && !last),
    critical: since >= 10 || !health.persisted
  };
}

export async function download(includeImages = false) {
  const dump = await exportAll(includeImages);
  const blob = new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trading-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  await set('lastBackup', { at: new Date().toISOString(), tradeCount: dump.trades.length });
}

export function restore(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = async () => {
      try { await importAll(JSON.parse(fr.result)); res(true); }
      catch (e) { rej(e); }
    };
    fr.onerror = () => rej(fr.error);
    fr.readAsText(file);
  });
}


// ===== IMAGES =====
// images.js — OWNS: screenshot compression + storage cap. Imports db only.
// Screenshots are evidence, not psychology. They must never eat the quota.


const TARGET_KB = 200;
const MAX_EDGE = 1400;
const KEEP_TRADES = 300;

export function compress(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      let q = 0.8, out = c.toDataURL('image/jpeg', q);
      while (out.length / 1024 > TARGET_KB && q > 0.3) {
        q -= 0.1;
        out = c.toDataURL('image/jpeg', q);
      }
      URL.revokeObjectURL(img.src);
      res({ data: out, kb: Math.round(out.length / 1024) });
    };
    img.onerror = () => rej(new Error('could not read image'));
    img.src = URL.createObjectURL(file);
  });
}

// Drop screenshots from trades older than the most recent 300. Trade DATA is kept forever.
export async function prune() {
  const trades = await all('trades');
  if (trades.length <= KEEP_TRADES) return 0;
  const old = trades.slice(0, trades.length - KEEP_TRADES).filter(t => t.shots && t.shots.length);
  for (const t of old) { delete t.shots; await put('trades', t); }
  return old.length;
}
