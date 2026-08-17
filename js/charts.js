// charts.js — OWNS: all canvas drawing. Pure rendering: it takes numbers and
// produces pixels, reads no storage, and knows nothing about trading rules.
// Imported only by ui.js.
//
// Hand-written rather than pulled from a library because a charting library is
// ~200 KB to draw six shapes, and this must work offline on a phone.

const C = {
  fg: '#ececee', dim: '#94949c', faint: '#63636b', line: '#2a2a2e', soft: '#202024',
  ok: '#4ade80', warn: '#fbbf24', bad: '#f87171', acc: '#5b8def', panel: '#0e0e10'
};

// Canvases are created at CSS size but drawn at device resolution, otherwise
// everything is blurry on a phone.
function surface(id, h) {
  return `<canvas class="chart" id="${id}" data-h="${h}"></canvas>`;
}

function ctxFor(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = cv.clientWidth || 320;
  const h = +cv.dataset.h || 160;
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.height = h + 'px';
  const x = cv.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  return { x, w, h };
}

const fmt = n => Math.abs(n) >= 100000 ? (n / 100000).toFixed(1) + 'L'
  : Math.abs(n) >= 1000 ? Math.round(n / 1000) + 'k' : Math.round(n);

// ---------- equity curve, with deposits stripped out ----------
// The most important chart in the app: it separates money made from money paid in.
export function equity(cv, points) {
  const { x, w, h } = ctxFor(cv);
  const pad = { l: 40, r: 8, t: 10, b: 18 };
  if (!points || points.length < 2) return placeholder(x, w, h, 'Not enough closed trades yet');

  const vals = points.flatMap(p => [p.withDeposits, p.tradingOnly]);
  let lo = Math.min(...vals, 0), hi = Math.max(...vals, 0);
  if (hi === lo) hi = lo + 1;
  const px = i => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const py = v => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);

  grid(x, w, h, pad, lo, hi);

  // Zero line matters: below it, trading has lost money.
  if (lo < 0 && hi > 0) {
    x.strokeStyle = C.line; x.lineWidth = 1; x.setLineDash([3, 3]);
    x.beginPath(); x.moveTo(pad.l, py(0)); x.lineTo(w - pad.r, py(0)); x.stroke();
    x.setLineDash([]);
  }

  line(x, points.map((p, i) => [px(i), py(p.withDeposits)]), C.faint, 1.5);
  const last = points[points.length - 1].tradingOnly;
  line(x, points.map((p, i) => [px(i), py(p.tradingOnly)]), last >= 0 ? C.ok : C.bad, 2);
}

// ---------- drawdown ----------
export function drawdown(cv, series, trigger) {
  const { x, w, h } = ctxFor(cv);
  const pad = { l: 40, r: 8, t: 10, b: 18 };
  if (!series || series.length < 2) return placeholder(x, w, h, 'Not enough closed trades yet');

  const hi = Math.max(...series.map(d => d.dd), trigger || 0, 5);
  const px = i => pad.l + (i / (series.length - 1)) * (w - pad.l - pad.r);
  const py = v => pad.t + (v / hi) * (h - pad.t - pad.b);

  x.fillStyle = C.faint; x.font = '10px system-ui'; x.textAlign = 'right';
  for (const v of [0, hi / 2, hi]) {
    x.fillText(v.toFixed(0) + '%', pad.l - 6, py(v) + 3);
    x.strokeStyle = C.soft; x.lineWidth = 1;
    x.beginPath(); x.moveTo(pad.l, py(v)); x.lineTo(w - pad.r, py(v)); x.stroke();
  }

  // Filled area, because drawdown is a depth and should look like one.
  x.beginPath(); x.moveTo(px(0), py(0));
  series.forEach((d, i) => x.lineTo(px(i), py(d.dd)));
  x.lineTo(px(series.length - 1), py(0)); x.closePath();
  const g = x.createLinearGradient(0, pad.t, 0, h - pad.b);
  g.addColorStop(0, 'rgba(248,113,113,.30)'); g.addColorStop(1, 'rgba(248,113,113,.02)');
  x.fillStyle = g; x.fill();
  line(x, series.map((d, i) => [px(i), py(d.dd)]), C.bad, 1.6);

  if (trigger && trigger <= hi) {
    x.strokeStyle = C.warn; x.lineWidth = 1; x.setLineDash([4, 3]);
    x.beginPath(); x.moveTo(pad.l, py(trigger)); x.lineTo(w - pad.r, py(trigger)); x.stroke();
    x.setLineDash([]);
    x.fillStyle = C.warn; x.textAlign = 'left'; x.font = '9px system-ui';
    x.fillText(`regression at ${trigger}%`, pad.l + 4, py(trigger) - 4);
  }
}

// ---------- R distribution ----------
// Shows whether winners are being cut short: a tall bar at +1R with nothing
// beyond it is the signature.
export function rHistogram(cv, buckets) {
  const { x, w, h } = ctxFor(cv);
  const pad = { l: 8, r: 8, t: 10, b: 26 };
  if (!buckets || !buckets.length) return placeholder(x, w, h, 'No closed trades yet');

  const max = Math.max(...buckets.map(b => b.n), 1);
  const bw = (w - pad.l - pad.r) / buckets.length;
  buckets.forEach((b, i) => {
    const bh = (b.n / max) * (h - pad.t - pad.b);
    const bx = pad.l + i * bw, by = h - pad.b - bh;
    x.fillStyle = b.from < 0 ? 'rgba(248,113,113,.75)' : 'rgba(74,222,128,.75)';
    round(x, bx + 1.5, by, bw - 3, bh, 3); x.fill();
    if (b.n) {
      x.fillStyle = C.dim; x.font = '9px system-ui'; x.textAlign = 'center';
      x.fillText(b.n, bx + bw / 2, by - 3);
    }
    x.fillStyle = C.faint; x.font = '9px system-ui'; x.textAlign = 'center';
    x.fillText(b.label, bx + bw / 2, h - 8);
  });
  x.strokeStyle = C.line; x.lineWidth = 1;
  x.beginPath(); x.moveTo(pad.l, h - pad.b); x.lineTo(w - pad.r, h - pad.b); x.stroke();
}

// ---------- horizontal comparison bars ----------
// Used for expectancy by setup. Sample size is drawn alongside, never hidden,
// because a big bar on four trades means nothing.
export function bars(cv, rows, opts = {}) {
  const h0 = Math.max(60, rows.length * 30 + 16);
  cv.dataset.h = h0;
  const { x, w, h } = ctxFor(cv);
  if (!rows || !rows.length) return placeholder(x, w, h, opts.emptyText || 'Nothing to compare yet');

  const labelW = Math.min(140, w * 0.42);
  const zone = w - labelW - 46;
  const max = Math.max(...rows.map(r => Math.abs(r.value)), 0.1);
  const zero = labelW + (rows.some(r => r.value < 0) ? zone / 2 : 0);
  const scale = (rows.some(r => r.value < 0) ? zone / 2 : zone) / max;

  rows.forEach((r, i) => {
    const y = 8 + i * 30;
    x.fillStyle = r.muted ? C.faint : C.fg;
    x.font = '11.5px system-ui'; x.textAlign = 'left';
    x.fillText(clip(x, r.label, labelW - 8), 0, y + 13);

    const len = Math.abs(r.value) * scale;
    x.fillStyle = r.muted ? 'rgba(148,148,156,.35)'
      : r.value >= 0 ? 'rgba(74,222,128,.8)' : 'rgba(248,113,113,.8)';
    round(x, r.value >= 0 ? zero : zero - len, y + 3, Math.max(len, 1.5), 15, 3); x.fill();

    x.fillStyle = C.dim; x.font = '10px ui-monospace,monospace'; x.textAlign = 'right';
    x.fillText(r.note || '', w, y + 14);
  });

  if (rows.some(r => r.value < 0)) {
    x.strokeStyle = C.line; x.lineWidth = 1;
    x.beginPath(); x.moveTo(zero, 4); x.lineTo(zero, h - 4); x.stroke();
  }
}

// ---------- progress ring ----------
export function ring(cv, pct, label, tone) {
  const { x, w, h } = ctxFor(cv);
  const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 - 8;
  x.lineWidth = 8; x.lineCap = 'round';
  x.strokeStyle = '#232327';
  x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = tone === 'ok' ? C.ok : tone === 'bad' ? C.bad : tone === 'warn' ? C.warn : C.acc;
  x.beginPath();
  x.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, pct / 100));
  x.stroke();
  x.fillStyle = C.fg; x.textAlign = 'center';
  x.font = '600 17px ui-monospace,monospace';
  x.fillText(Math.round(pct) + '%', cx, cy + 2);
  if (label) { x.fillStyle = C.faint; x.font = '9px system-ui'; x.fillText(label, cx, cy + 16); }
}

// ---------- scatter: rule-following against result ----------
// The most persuasive chart in the app, so it gets its own renderer rather than
// being squeezed into the bar chart.
export function scatter(cv, pts) {
  const { x, w, h } = ctxFor(cv);
  const pad = { l: 34, r: 10, t: 10, b: 24 };
  if (!pts || !pts.length) return placeholder(x, w, h, 'No closed trades yet');

  const rs = pts.map(p => p.r);
  let lo = Math.min(...rs, -1), hi = Math.max(...rs, 1);
  const py = v => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const cols = 2, colW = (w - pad.l - pad.r) / cols;

  x.strokeStyle = C.line; x.setLineDash([3, 3]); x.lineWidth = 1;
  x.beginPath(); x.moveTo(pad.l, py(0)); x.lineTo(w - pad.r, py(0)); x.stroke();
  x.setLineDash([]);
  x.fillStyle = C.faint; x.font = '10px system-ui'; x.textAlign = 'right';
  x.fillText('0R', pad.l - 5, py(0) + 3);

  ['Rules broken', 'Rules followed'].forEach((lab, ci) => {
    x.fillStyle = ci ? C.ok : C.bad; x.font = '10px system-ui'; x.textAlign = 'center';
    x.fillText(lab, pad.l + colW * ci + colW / 2, h - 8);
  });

  pts.forEach((p, i) => {
    const ci = p.adherent ? 1 : 0;
    const jitter = ((i * 37) % 100) / 100 - 0.5;
    const cx = pad.l + colW * ci + colW / 2 + jitter * colW * 0.6;
    x.fillStyle = p.adherent ? 'rgba(74,222,128,.55)' : 'rgba(248,113,113,.55)';
    x.beginPath(); x.arc(cx, py(p.r), 3.2, 0, Math.PI * 2); x.fill();
  });
}

// ---------- helpers ----------
function grid(x, w, h, pad, lo, hi) {
  x.fillStyle = C.faint; x.font = '10px system-ui'; x.textAlign = 'right';
  for (const v of [lo, (lo + hi) / 2, hi]) {
    const y = pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
    x.fillText(fmt(v), pad.l - 6, y + 3);
    x.strokeStyle = C.soft; x.lineWidth = 1;
    x.beginPath(); x.moveTo(pad.l, y); x.lineTo(w - pad.r, y); x.stroke();
  }
}
function line(x, pts, colour, width) {
  x.strokeStyle = colour; x.lineWidth = width; x.lineJoin = 'round'; x.lineCap = 'round';
  x.beginPath();
  pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b));
  x.stroke();
}
function round(x, a, b, w, h, r) {
  x.beginPath();
  x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r);
  x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r);
  x.arcTo(a, b, a + w, b, r); x.closePath();
}
function clip(x, text, max) {
  let t = String(text);
  while (x.measureText(t).width > max && t.length > 3) t = t.slice(0, -1);
  return t.length < String(text).length ? t.slice(0, -1) + '…' : t;
}
function placeholder(x, w, h, msg) {
  x.fillStyle = C.faint; x.font = '11.5px system-ui'; x.textAlign = 'center';
  x.fillText(msg, w / 2, h / 2 + 4);
}

// ---------- candlesticks ----------
// Draws only the bars it is given. The replay engine withholds the future, so
// there is nothing here to accidentally reveal.
export function candles(cv, view, opts = {}) {
  cv.dataset.h = opts.h || 260;
  const { x, w, h } = ctxFor(cv);
  const bars = view.bars || [];
  if (!bars.length) return placeholder(x, w, h, 'No bars');

  const pad = { l: 6, r: 52, t: 10, b: 18 };
  const lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h));
  const span = (hi - lo) || 1;
  const gw = (w - pad.l - pad.r) / bars.length;
  const bw = Math.max(1.5, Math.min(9, gw * 0.68));
  const py = v => pad.t + (1 - (v - lo) / span) * (h - pad.t - pad.b);
  const px = i => pad.l + i * gw + gw / 2;

  // price axis
  x.font = '9.5px ui-monospace,monospace'; x.textAlign = 'left';
  for (const v of [lo, (lo + hi) / 2, hi]) {
    x.strokeStyle = C.soft; x.lineWidth = 1;
    x.beginPath(); x.moveTo(pad.l, py(v)); x.lineTo(w - pad.r, py(v)); x.stroke();
    x.fillStyle = C.faint; x.fillText(v.toFixed(1), w - pad.r + 5, py(v) + 3);
  }

  bars.forEach((b, i) => {
    const up = b.c >= b.o;
    x.strokeStyle = x.fillStyle = up ? C.ok : C.bad;
    x.globalAlpha = 0.95;
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(px(i), py(b.h)); x.lineTo(px(i), py(b.l)); x.stroke();
    const top = py(Math.max(b.o, b.c)), bot = py(Math.min(b.o, b.c));
    x.fillRect(px(i) - bw / 2, top, bw, Math.max(1, bot - top));
    x.globalAlpha = 1;
  });

  // staged plan drawn as three levels, so the commitment is visible
  const s = view.staged;
  if (s) {
    const levels = [[s.entry, C.acc, 'entry'], [s.stop, C.bad, 'stop'], [s.target, C.ok, 'target']];
    for (const [v, col, lab] of levels) {
      if (v < lo - span || v > hi + span) continue;
      x.strokeStyle = col; x.lineWidth = 1; x.setLineDash([5, 3]);
      x.beginPath(); x.moveTo(pad.l, py(v)); x.lineTo(w - pad.r, py(v)); x.stroke();
      x.setLineDash([]);
      x.fillStyle = col; x.font = '9px system-ui'; x.textAlign = 'left';
      x.fillText(lab, pad.l + 2, py(v) - 3);
    }
  }

  // the bar at which the plan was written
  if (opts.markAt != null && opts.markAt >= 0 && opts.markAt < bars.length) {
    x.strokeStyle = C.warn; x.lineWidth = 1; x.globalAlpha = .55;
    x.beginPath(); x.moveTo(px(opts.markAt), pad.t); x.lineTo(px(opts.markAt), h - pad.b); x.stroke();
    x.globalAlpha = 1;
  }

  // the edge of knowledge
  if (!opts.revealed) {
    const edge = pad.l + bars.length * gw;
    const g = x.createLinearGradient(edge - 26, 0, Math.min(edge + 8, w - pad.r), 0);
    g.addColorStop(0, 'rgba(14,14,16,0)'); g.addColorStop(1, 'rgba(14,14,16,.92)');
    x.fillStyle = g; x.fillRect(edge - 26, pad.t, (w - pad.r) - (edge - 26), h - pad.t - pad.b);
    x.strokeStyle = C.line; x.setLineDash([2, 3]); x.lineWidth = 1;
    x.beginPath(); x.moveTo(edge, pad.t); x.lineTo(edge, h - pad.b); x.stroke();
    x.setLineDash([]);
  }

  x.fillStyle = C.faint; x.font = '9px system-ui'; x.textAlign = 'left';
  if (bars.length) x.fillText(bars[0].d, pad.l, h - 5);
  x.textAlign = 'right';
  if (bars.length) x.fillText(bars[bars.length - 1].d, w - pad.r, h - 5);
}

export { surface };

// Draw every canvas on the current screen. Called after each render, since
// canvases have no size until they are in the document.
export function paint(jobs) {
  requestAnimationFrame(() => {
    for (const [id, fn] of Object.entries(jobs)) {
      const cv = document.getElementById(id);
      if (cv) { try { fn(cv); } catch (e) { console.warn('chart', id, e); } }
    }
  });
}
