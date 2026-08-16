// ui-journal.js — OWNS: the journal screen's DOM. Imports journal/ledger/schema/images.

import * as J from './journal.js';
import * as L from './ledger.js';
import * as S from './schema.js';
import * as IM from './images.js';
import * as db from './db.js';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const rs = n => '₹' + Math.round(n).toLocaleString('en-IN');

let pending = [];   // compressed screenshots waiting to attach
let mode = 'paper';

export async function view() {
  const p = await L.profile();
  const approvedPaper = await L.approvedSetups('paper');
  const approvedLive = await L.approvedSetups('live');
  const approved = mode === 'live' ? approvedLive : approvedPaper;
  const open = await J.openTrades();
  const st = await J.stats(mode);
  const r = await S.rules();

  const gate = mode === 'live' ? await L.gate() : { allowed: true, blocks: [] };

  const noSetups = !approved.length ? `<p class="warn">No approved setup for ${mode} trading yet.
    You need ${mode === 'live' ? r.btLive + ' examples and positive expectancy' : r.btPaper + ' marked examples'}
    for a pattern before it appears here. Go to Backtest.</p>` : '';

  const blocked = !gate.allowed
    ? `<ul class="blocks">${gate.blocks.map(b => `<li>${esc(b.msg)}</li>`).join('')}</ul>` : '';

  const form = (approved.length && gate.allowed) ? `
    <select id="j-setup">${approved.map(s => `<option>${esc(s)}</option>`).join('')}</select>
    <input id="j-thesis" placeholder="Thesis — one line. Why this, why now?">
    <div class="grid">
      <input id="j-entry" type="number" inputmode="decimal" placeholder="Entry">
      <input id="j-stop" type="number" inputmode="decimal" placeholder="Stop">
      <input id="j-target" type="number" inputmode="decimal" placeholder="Target">
      <select id="j-regime">${J.REGIMES.map(x => `<option>${x}</option>`).join('')}</select>
    </div>
    <div id="j-size" class="sub">Enter entry and stop to see your position size.</div>
    <label class="tune">Confidence 1–5<input id="j-conf" type="number" min="1" max="5" value="3"></label>
    <label class="tune">Emotional state 1–5<input id="j-emo" type="number" min="1" max="5" value="3"></label>
    <input id="j-inval" placeholder="What would prove me wrong?">
    <button data-act="j-open">Lock card &amp; open trade</button>
    <p class="sub">Saving stamps this card with the current time. It cannot be edited afterwards.
    If the broker shows the order was placed before this stamp, the trade is automatically non-adherent.</p>
    <p id="j-msg" class="bad"></p>` : '';

  const openList = open.length ? open.map(t => `
    <div class="card">
      <h3>${esc(t.setup)} <span class="sub">(${t.mode})</span></h3>
      <p class="sub">${esc(t.thesis)}</p>
      <p>In ${t.entry} · Stop ${t.stop} · Target ${t.target} · Qty ${t.qty} · R:R ${t.rr}</p>
      <p class="sub">Card locked ${new Date(t.lockedAt).toLocaleString('en-IN')}</p>
      <input type="number" inputmode="decimal" placeholder="Exit price" id="x-price-${t.id}">
      <select id="x-reason-${t.id}">${J.EXITS.map(e => `<option>${e}</option>`).join('')}</select>
      <p class="sub" style="margin-top:10px">Tick only what is actually true:</p>
      ${J.CHECKLIST.map((c, i) => `<label class="tune" style="justify-content:flex-start;gap:8px">
        <input type="checkbox" id="x-c-${t.id}-${i}" style="width:20px;margin:0">${esc(c)}</label>`).join('')}
      <label class="tune">Emotion during 1–5<input type="number" id="x-emo-${t.id}" min="1" max="5" value="3"></label>
      <input id="x-lesson-${t.id}" placeholder="What would I do differently?">
      <label class="btn">Add screenshot<input type="file" accept="image/*" class="shot" hidden></label>
      <span class="sub" id="shots">${pending.length ? pending.length + ' image(s) attached · ' + pending.reduce((a, x) => a + x.kb, 0) + ' KB' : ''}</span>
      <button data-act="j-close" data-id="${t.id}">Close trade</button>
      <p class="bad" id="x-msg-${t.id}"></p>
    </div>`).join('') : '<p class="sub">No open trades.</p>';

  return `
  <div class="card">
    <div class="row">
      <button data-act="j-mode" data-m="paper" class="${mode === 'paper' ? 'sel' : ''}">Paper</button>
      <button data-act="j-mode" data-m="live" class="${mode === 'live' ? 'sel' : ''}">Live</button>
    </div>
    <h2>Pre-trade card</h2>
    ${blocked}${noSetups}${form}
  </div>
  <div class="card"><h2>Open trades</h2></div>
  ${openList}
  <div class="card"><h3>Your ${mode} record</h3>
    ${st.n ? `<p>${st.n} closed · win rate ${st.winRate}% · rule-following ${st.adherence}%</p>
      <p>${st.expectancy !== null ? 'Expectancy ' + st.expectancy + 'R'
        : `<span class="sub">Expectancy hidden — ${st.needForNumber} more trades before the number means anything.</span>`}</p>`
      : '<p class="sub">No closed trades yet.</p>'}
  </div>`;
}

// live position-size preview
export function wire(render) {
  const upd = async () => {
    const box = $('j-size'); if (!box) return;
    const e = +$('j-entry').value, s = +$('j-stop').value;
    if (!e || !s || e === s) { box.textContent = 'Enter entry and stop to see your position size.'; return; }
    const p = await L.profile();
    const z = await L.positionSize(p, e, s);
    box.innerHTML = `Size <b>${z.qty}</b> · risking ${rs(z.riskRupees)} (${z.pct}% of capital).
      You do not get to choose this number.`;
  };
  ['j-entry', 'j-stop'].forEach(id => { const n = $(id); if (n) n.oninput = upd; });

  document.querySelectorAll('.shot').forEach(inp => {
    inp.onchange = async () => {
      if (!inp.files[0]) return;
      try {
        const c = await IM.compress(inp.files[0]);
        pending.push(c);
        const s = $('shots');
        if (s) s.textContent = `${pending.length} image(s) attached · ${pending.reduce((a, x) => a + x.kb, 0)} KB`;
      } catch (e) { alert(e.message); }
    };
  });
}

export async function handle(act, ev, render) {
  if (act === 'j-mode') { mode = ev.target.dataset.m; return render(); }

  if (act === 'j-open') {
    const msg = $('j-msg');
    try {
      await J.openTrade({
        mode, setup: $('j-setup').value, thesis: $('j-thesis').value.trim(),
        entry: $('j-entry').value, stop: $('j-stop').value, target: $('j-target').value,
        regime: $('j-regime').value, confidence: $('j-conf').value,
        emotionPre: $('j-emo').value, invalidation: $('j-inval').value.trim()
      });
      pending = [];
      return render();
    } catch (e) { msg.textContent = e.message; }
    return;
  }

  if (act === 'j-close') {
    const id = +ev.target.dataset.id;
    const msg = $('x-msg-' + id);
    try {
      const checks = J.CHECKLIST.map((_, i) => $(`x-c-${id}-${i}`).checked);
      const t = await J.closeTrade(id, {
        exit: $('x-price-' + id).value,
        exitReason: $('x-reason-' + id).value,
        emotionDuring: $('x-emo-' + id).value,
        lesson: $('x-lesson-' + id).value,
        checks
      });
      if (pending.length) {
        t.shots = pending.map(p => p.data);
        await db.put('trades', t);
        pending = [];
        await IM.prune();
      }
      if (!t.adherent) alert('Closed and marked NON-ADHERENT: ' + (t.flags.join(', ') || 'checklist incomplete'));
      return render();
    } catch (e) { if (msg) msg.textContent = e.message; }
  }
}
