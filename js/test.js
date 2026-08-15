// test.js — owns: Sprint 0 platform verification only. Touches nothing else.
const out = document.getElementById('out');
const log = (msg, cls) => {
  out.innerHTML += `\n<span class="${cls || ''}">${msg}</span>`;
};

out.textContent = 'CHECK A PASSED — ES module executed.';

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('sprint0', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('t', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((res, rej) => {
    const store = db.transaction('t', mode).objectStore('t');
    const req = fn(store);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

(async () => {
  try {
    const db = await openDB();
    let rec = await tx(db, 'readonly', s => s.get('probe'));

    if (rec) {
      const age = Math.round((Date.now() - rec.created) / 1000);
      log(`CHECK B/C/D PASSED — record survived.`, 'ok');
      log(`  written: ${new Date(rec.created).toLocaleString()}`);
      log(`  age: ${age}s | loads since: ${rec.loads}`);
      rec.loads++;
      await tx(db, 'readwrite', s => s.put(rec));
    } else {
      rec = { id: 'probe', created: Date.now(), loads: 1 };
      await tx(db, 'readwrite', s => s.add(rec));
      log('Record WRITTEN for the first time.', 'ok');
      log('\nNow do this in order:');
      log('  B. Reload this page.');
      log('  C. Close Chrome fully, reopen, revisit.');
      log('  D. Add to Home screen, open from the icon.');
      log('  E. Turn off data/wifi, reload.');
      log('Each time it must say CHECK B/C/D PASSED and loads should climb.');
    }

    if (navigator.storage && navigator.storage.persist) {
      const p = await navigator.storage.persisted();
      log(`\nstorage persisted: ${p}`, p ? 'ok' : 'bad');
      if (!p) {
        const granted = await navigator.storage.persist();
        log(`persist() requested -> ${granted}`, granted ? 'ok' : 'bad');
      }
      const est = await navigator.storage.estimate();
      log(`quota: ${(est.quota / 1048576).toFixed(0)} MB`);
    } else {
      log('\nstorage.persist() unsupported — eviction risk is real.', 'bad');
    }

    log(`\nonline: ${navigator.onLine}`);
  } catch (e) {
    log(`\nCHECK B FAILED — IndexedDB error: ${e && e.message}`, 'bad');
    log('If this happens in normal (non-incognito) Chrome, the storage layer must change.', 'bad');
  }
})();

document.getElementById('reset').onclick = async () => {
  indexedDB.deleteDatabase('sprint0');
  log('\nwiped — reload to start over.');
};
