// images.js — OWNS: screenshot compression + storage cap. Imports db only.
// Screenshots are evidence, not psychology. They must never eat the quota.

import * as db from './db.js';

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
  const trades = await db.all('trades');
  if (trades.length <= KEEP_TRADES) return 0;
  const old = trades.slice(0, trades.length - KEEP_TRADES).filter(t => t.shots && t.shots.length);
  for (const t of old) { delete t.shots; await db.put('trades', t); }
  return old.length;
}
