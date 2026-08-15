// db.js — OWNS: all IndexedDB access. Touches nothing else.
// Nothing above this file may call indexedDB directly.

const NAME = 'tcs';
const VERSION = 1;
export const STORES = ['meta', 'trades', 'backtests', 'violations', 'amendments'];

let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
      for (const s of ['trades', 'backtests', 'violations', 'amendments']) {
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
export async function exportAll() {
  const dump = { version: VERSION, exported: new Date().toISOString() };
  for (const s of STORES) dump[s] = await all(s);
  return dump;
}

export async function importAll(dump) {
  if (!dump || !dump.version) throw new Error('not a valid backup file');
  for (const s of STORES) {
    if (!dump[s]) continue;
    await clear(s);
    for (const row of dump[s]) await put(s, row);
  }
  return true;
}
