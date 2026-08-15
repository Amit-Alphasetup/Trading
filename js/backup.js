// backup.js — OWNS: export/import and backup nagging. Imports db + schema only.

import * as db from './db.js';
import * as S from './schema.js';

export async function status() {
  const health = await db.storageHealth();
  const last = await db.get('lastBackup', null); // {at, tradeCount}
  const trades = (await db.all('trades')).length;
  const r = await S.rules();
  // Chrome refuses persistence until a site is "engaged" — so if it is off,
  // back up after EVERY trade, not every 5.
  const every = health.persisted ? r.backupEveryNTrades : 1;
  const since = trades - (last ? last.tradeCount : 0);
  const stale = last ? (Date.now() - new Date(last.at).getTime()) > 7 * 86400000 : trades > 0;
  return {
    ...health, trades, since, every, stale,
    lastAt: last ? last.at : null,
    due: since >= every || stale || (trades > 0 && !last),
    critical: since >= 10 || !health.persisted
  };
}

export async function download() {
  const dump = await db.exportAll();
  const blob = new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trading-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  await db.set('lastBackup', { at: new Date().toISOString(), tradeCount: dump.trades.length });
}

export function restore(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = async () => {
      try { await db.importAll(JSON.parse(fr.result)); res(true); }
      catch (e) { rej(e); }
    };
    fr.onerror = () => rej(fr.error);
    fr.readAsText(file);
  });
}
