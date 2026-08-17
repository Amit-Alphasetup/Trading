// ui-trade.js — OWNS: the Journal, Regime, Broker and Day screens.
import * as store from './store.js';
import * as R from './rules.js';
import * as ledger from './ledger.js';
import * as journal from './journal.js';
import * as mind from './mind.js';
import * as learn from './learn.js';
import * as analytics from './analytics.js';
import * as spec from './specialise.js';
import * as pb from './playbook.js';
import * as CH from './charts.js';
import * as RP from './replay.js';
import { $, esc, rs, toast, confirmToast, empty, tvChart, mountTV, nextActions, banner } from './ui-core.js';

// ===== JOURNAL SCREEN =====
let jShots = [];   // compressed screenshots waiting to attach
let jMode = 'paper';

export async function journalView() {
  const p = await ledger.profile();
  const approvedPaper = await ledger.approvedSetups('paper');
  const approvedLive = await ledger.approvedSetups('live');
  const approved = jMode === 'live' ? approvedLive : approvedPaper;
  const open = await journal.openTrades();
  const st = await journal.stats(jMode);
  const r = await R.rules();

  const gate = jMode === 'live' ? await ledger.gate() : { allowed: true, blocks: [] };

  const noSetups = !approved.length ? `<p class="warn">No approved setup for ${jMode} trading yet.
    You need ${jMode === 'live' ? r.btLive + ' examples and positive expectancy' : r.btPaper + ' marked examples'}
    for a pattern before it appears here. Go to Backtest.</p>` : '';

  const blocked = !gate.allowed
    ? `<ul class="blocks">${gate.blocks.map(b => `<li>${esc(b.msg)}</li>`).join('')}</ul>` : '';

  const form = (approved.length && gate.allowed) ? `
    <select id="j-setup">${approved.map(s => `<option>${esc(s)}</option>`).join('')}</select>
    <button data-go="playbook" class="sub">open the checklist for this setup</button>
    <div id="j-chart"></div>
    <input id="j-symbol" placeholder="Symbol exactly as your broker writes it, e.g. RELIANCE" autocapitalize="characters">
    <input id="j-thesis" placeholder="Thesis — one line. Why this, why now?">
    <div class="grid">
      <input id="j-entry" type="number" inputmode="decimal" placeholder="Entry">
      <input id="j-stop" type="number" inputmode="decimal" placeholder="Stop">
      <input id="j-target" type="number" inputmode="decimal" placeholder="Target">
      <select id="j-regime">${journal.REGIMES.map(x => `<option>${x}</option>`).join('')}</select>
    </div>
    <div id="j-size" class="sub">Enter entry and stop to see your position size.</div>
    <label class="tune">Confidence 1–5<input id="j-conf" type="number" min="1" max="5" value="3"></label>
    <label class="tune">Emotional state 1–5<input id="j-emo" type="number" min="1" max="5" value="3"></label>
    <input id="j-inval" placeholder="What would prove me wrong?">
    <label class="tune" style="justify-content:flex-start;gap:8px">
      <input id="j-aplus" type="checkbox" style="width:20px;margin:0">
      This is an A+ setup (required to trade the 11:30–13:30 dead zone)</label>
    <button data-act="j-open">Lock card &amp; open trade</button>
    <p class="sub">Saving stamps this card with the current time. It cannot be edited afterwards.
    If the broker shows the order was placed before this stamp, the trade is automatically non-adherent.</p>
    <p id="j-msg" class="bad"></p>` : '';

  const openList = open.length ? open.map(t => `
    <div class="card">
      <h3>${esc(t.symbol || '')} — ${esc(t.setup)} <span class="sub">(${t.jMode})</span></h3>
      <p class="sub">${esc(t.thesis)}</p>
      <p>In ${t.entry} · Stop ${t.stop} · Target ${t.target} · Qty ${t.qty} · R:R ${t.rr}</p>
      <p class="sub">Card locked ${new Date(t.lockedAt).toLocaleString('en-IN')}</p>
      <input type="number" inputmode="decimal" placeholder="Exit price" id="x-price-${t.id}">
      <select id="x-reason-${t.id}">${journal.EXITS.map(e => `<option>${e}</option>`).join('')}</select>
      <p class="sub" style="margin-top:10px">Tick only what is actually true:</p>
      ${journal.CHECKLIST.map((c, i) => `<label class="tune" style="justify-content:flex-start;gap:8px">
        <input type="checkbox" id="x-c-${t.id}-${i}" style="width:20px;margin:0">${esc(c)}</label>`).join('')}
      <label class="tune">Emotion during 1–5<input type="number" id="x-emo-${t.id}" min="1" max="5" value="3"></label>
      <input id="x-lesson-${t.id}" placeholder="What would I do differently?">
      <label class="btn">Add screenshot<input type="file" accept="image/*" class="shot" hidden></label>
      <span class="sub" id="shots">${jShots.length ? jShots.length + ' image(s) attached · ' + jShots.reduce((a, x) => a + x.kb, 0) + ' KB' : ''}</span>
      <button data-act="j-close" data-id="${t.id}">Close trade</button>
      <p class="bad" id="x-msg-${t.id}"></p>
    </div>`).join('') : '<p class="sub">No open trades.</p>';

  return `
  <div class="card">
    <div class="row">
      <button data-act="j-jMode" data-m="paper" class="${jMode === 'paper' ? 'sel' : ''}">Paper</button>
      <button data-act="j-jMode" data-m="live" class="${jMode === 'live' ? 'sel' : ''}">Live</button>
    </div>
    <h2>Pre-trade card</h2>
    ${blocked}${noSetups}${form}
  </div>
  <div class="card"><h2>Open trades</h2></div>
  ${openList}
  <div class="card"><h3>Your ${jMode} record</h3>
    ${st.n ? `<p>${st.n} closed · win rate ${st.winRate}% · rule-following ${st.adherence}%</p>
      <p>${st.expectancy !== null ? 'Expectancy ' + st.expectancy + 'R'
        : `<span class="sub">Expectancy hidden — ${st.needForNumber} more trades before the number means anything.</span>`}</p>`
      : '<p class="sub">No closed trades yet.</p>'}
  </div>`;
}

// live position-size preview
export function journalWire(render) {
  // The chart follows whatever symbol is typed, so the plan and the price are
  // on one screen rather than in two apps.
  const sym = $('j-symbol'), box = $('j-chart');
  if (sym && box) {
    const draw = () => {
      const v = sym.value.trim();
      box.innerHTML = v.length >= 2 ? tvChart(v, 'tv-journal', 300) : '';
      mountTV();
    };
    sym.addEventListener('change', draw);
    sym.addEventListener('blur', draw);
    if (sym.value) draw();
  }

  const upd = async () => {
    const box = $('j-size'); if (!box) return;
    const e = +$('j-entry').value, s = +$('j-stop').value;
    if (!e || !s || e === s) { box.textContent = 'Enter entry and stop to see your position size.'; return; }
    const p = await ledger.profile();
    const z = await ledger.positionSize(p, e, s);
    const bo = await mind.blackout();
    box.innerHTML = `Size <b>${z.qty}</b> · risking ${bo ? '•••' : rs(z.riskRupees)} (${z.pct}% of capital).
      You do not get to choose this number.${z.capped ? ' <span class="warn">Halved after a winning streak.</span>' : ''}`;
  };
  ['j-entry', 'j-stop'].forEach(id => { const n = $(id); if (n) n.oninput = upd; });

  document.querySelectorAll('.shot').forEach(inp => {
    inp.onchange = async () => {
      if (!inp.files[0]) return;
      try {
        const c = await store.compress(inp.files[0]);
        jShots.push(c);
        const s = $('shots');
        if (s) s.textContent = `${jShots.length} image(s) attached · ${jShots.reduce((a, x) => a + x.kb, 0)} KB`;
      } catch (e) { toast(e.message, 'bad'); }
    };
  });
}

export async function journalHandle(act, ev, render) {
  if (act === 'j-jMode') { jMode = ev.target.dataset.m; return render(); }

  if (act === 'j-open') {
    const msg = $('j-msg');
    try {
      await journal.openTrade({
        jMode, symbol: $('j-symbol').value, setup: $('j-setup').value, thesis: $('j-thesis').value.trim(),
        entry: $('j-entry').value, stop: $('j-stop').value, target: $('j-target').value,
        regime: $('j-regime').value, confidence: $('j-conf').value,
        emotionPre: $('j-emo').value, invalidation: $('j-inval').value.trim(),
        aPlus: $('j-aplus') ? $('j-aplus').checked : false
      });
      jShots = [];
      return render();
    } catch (e) { msg.textContent = e.message; }
    return;
  }

  if (act === 'j-close') {
    const id = +ev.target.dataset.id;
    const msg = $('x-msg-' + id);
    try {
      const checks = journal.CHECKLIST.map((_, i) => $(`x-c-${id}-${i}`).checked);
      const t = await journal.closeTrade(id, {
        exit: $('x-price-' + id).value,
        exitReason: $('x-reason-' + id).value,
        emotionDuring: $('x-emo-' + id).value,
        lesson: $('x-lesson-' + id).value,
        checks
      });
      if (jShots.length) {
        t.shots = jShots.map(p => p.data);
        await store.put('trades', t);
        jShots = [];
        await store.prune();
      }
      if (!t.adherent) toast('Closed and marked NON-ADHERENT: ' + (t.flags.join(', ') || 'checklist incomplete'), 'bad');
      else toast('Closed. Rules followed.', 'ok');
      return render();
    } catch (e) { if (msg) msg.textContent = e.message; }
  }
}

// ===== REGIME SCREEN =====
let rgWall = null, rgPicked = null;

export async function marketView() {
  const today = await R.todayRegime();
  const c = await R.charges();
  const sel = rgPicked || (today && today.regime) || null;
  const info = sel ? R.strategiesFor(sel) : null;

  const picker = `<div class="card">
    <h2>Regime Classifier</h2>
    <p class="sub">Tag the market before you look at any strategy. Right strategy in the wrong market
    is the commonest options failure — this removes the illegal options rather than trusting you to avoid them.</p>
    ${today ? `<p class="ok">Today tagged: ${esc(today.regime)}</p>` : '<p class="warn">Not tagged today.</p>'}
    <div class="row">${R.regimeNames().map(n =>
      `<button data-act="r-pick" data-r="${n}" class="${sel === n ? 'sel' : ''}">${n}</button>`).join('')}</div>
    ${info ? `<p class="sub" style="margin-top:12px"><b>How to tell:</b> ${esc(R.REGIMES[sel].tell)}</p>
      <input id="r-note" placeholder="Your evidence for this call (optional)">
      <button data-act="r-save" data-r="${sel}">Tag today as ${esc(sel)}</button>` : ''}
  </div>`;

  const strats = info ? `<div class="card"><h3>Allowed in a ${esc(sel)} market</h3>
    <ul class="blocks">${info.legal.map(s => `<li class="ok">${esc(s)}</li>`).join('')}</ul>
    <h3>Blocked, and why</h3>
    ${Object.keys(info.banned).length
      ? `<ul class="blocks">${Object.entries(info.banned).map(([s, why]) =>
          `<li><b>${esc(s)}</b> — <span class="sub">${esc(why)}</span></li>`).join('')}</ul>`
      : '<p class="sub">Nothing specifically banned in this regime.</p>'}
  </div>` : '';

  const fields = [
    ['brokeragePerOrder', 'Brokerage per executed order (₹)'],
    ['sttSellPct', 'STT on sell side (% of turnover)'],
    ['exchangePct', 'Exchange transaction charge (% per side)'],
    ['gstPct', 'GST on brokerage + exchange (%)'],
    ['stampPct', 'Stamp duty on buy side (%)'],
    ['slippagePerSide', 'Your measured slippage per side (₹)']
  ];

  const costCard = `<div class="card">
    <h2>Cost Wall</h2>
    <p class="sub">Enter your broker's actual charges from a real contract note — not their pricing page,
    and not an example from me. Any figure I invented here would be wrong and would mislead you.</p>
    ${fields.map(([k, label]) => `<label class="tune">${label}
      <input data-charge="${k}" type="number" step="0.0001" value="${c[k] === null ? '' : c[k]}"></label>`).join('')}
    <button data-act="r-savecost">Save charges</button>
    <button data-act="r-rgWall">Compute the rgWall</button>
    <div id="rgWall"></div>
  </div>`;

  const wallOut = rgWall ? (rgWall.ready ? `<div class="card">
    <h3>Your ${rgWall.n} closed trades, gross versus net</h3>
    <table>
      <tr><td>Gross P&L</td><td class="${rgWall.gross >= 0 ? 'ok' : 'bad'}">${rs(rgWall.gross)}</td></tr>
      <tr><td>Total costs</td><td class="bad">−${rs(rgWall.cost)}</td></tr>
      <tr><td><b>Net</b></td><td class="${rgWall.net >= 0 ? 'ok' : 'bad'}"><b>${rs(rgWall.net)}</b></td></tr>
      <tr><td>Cost per trade</td><td>${rs(rgWall.perTrade)}</td></tr>
    </table>
    ${rgWall.flipped ? '<p class="bad">Your record is gross-positive and net-negative. That is the whole lesson of this screen.</p>' : ''}
    <h3>Where it went</h3>
    <table>${Object.entries(rgWall.breakdown).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${rs(v)}</td></tr>`).join('')}</table>
    <h3>The same cost base at different frequencies, per year</h3>
    <table>
      <tr><td>Swing (~160 trades)</td><td>${rs(rgWall.annual.swing)}</td></tr>
      <tr><td>Intraday, 3/day (~720)</td><td>${rs(rgWall.annual.intraday)}</td></tr>
      <tr><td>Scalping, 20/day (~5,000)</td><td class="bad">${rs(rgWall.annual.scalping)}</td></tr>
    </table>
    <p class="sub">Costs scale with the number of trades, not the size of your edge.
    This is why scalping is last in this system and not first.</p>
    <button data-act="r-ack">I have seen these numbers</button>
  </div>` : `<div class="card"><p class="warn">${
    rgWall.noTrades ? 'No closed trades yet to compute against.'
      : 'Missing charges: ' + rgWall.missing.join(', ') + '. Read a contract note and fill them in.'}</p></div>`) : '';

  return picker + strats + costCard + wallOut;
}

export async function marketHandle(act, ev, render) {
  const D = ev.target.dataset;
  if (act === 'r-pick') { rgPicked = D.r; return render(); }
  if (act === 'r-save') {
    await R.saveRegime(D.r, $('r-note') ? $('r-note').value : '');
    return render();
  }
  if (act === 'r-savecost') {
    const c = await R.charges();
    for (const i of document.querySelectorAll('[data-charge]')) {
      c[i.dataset.charge] = i.value === '' ? null : +i.value;
    }
    await R.saveCharges(c);
    return render();
  }
  if (act === 'r-rgWall') { rgWall = await R.costWall('live'); if (!rgWall.ready && rgWall.noTrades) rgWall = await R.costWall('paper'); return render(); }
  if (act === 'r-ack') { await R.acknowledgeScalp(); toast('Recorded. Scalping remains last in the phase order regardless.'); }
}

// ===== BROKER SCREEN =====
let brLast = null;

export async function brokerView() {
  const score = await journal.honestyScore();
  const imp = await journal.lastImport();

  return `
  <div class="card"><h2>Honesty Score</h2>
    ${score === null
      ? '<p class="sub">No reconciliation yet. Import a trade book below.</p>'
      : `<p class="${score >= 95 ? 'ok' : score >= 80 ? 'warn' : 'bad'}"
          style="font-size:32px;margin:6px 0">${score}%</p>
         <p class="sub">How often your journal and the exchange agree.
         If this falls, it is the earliest warning of trouble — earlier than P&L, earlier than drawdown.</p>`}
    <p class="sub">${imp ? 'Last import ' + new Date(imp).toLocaleString('en-IN') : ''}</p>
  </div>

  <div class="card"><h2>Import trade book</h2>
    <p class="sub">Zerodha: Console → Reports → Tradebook → pick the date range → download CSV.
    Angel One: Reports → Trade Book → export.
    The app reads it on your phone. Nothing is uploaded anywhere.</p>
    <label class="btn">Choose CSV<input type="file" id="br-file" accept=".csv,text/csv" hidden></label>
    <p id="br-msg" class="sub"></p>
    <button data-act="b-recon">Reconcile now</button>
    <button data-act="b-clear" class="danger">Clear imported fills</button>
  </div>

  ${brLast ? `<div class="card"><h3>Result</h3>
    <table>
      <tr><td>Fills on record</td><td>${brLast.fills}</td></tr>
      <tr><td>Matched to a journal card</td><td class="ok">${brLast.matched}</td></tr>
      <tr><td>Card written AFTER the fill</td><td class="${brLast.late ? 'bad' : ''}">${brLast.late}</td></tr>
      <tr><td>At the exchange, not in the journal</td><td class="${brLast.unlogged ? 'bad' : ''}">${brLast.unlogged}</td></tr>
    </table>
    ${brLast.late ? '<p class="bad">Late entries are marked non-adherent automatically. There is no override.</p>' : ''}
    ${brLast.unloggedRows.length ? `<p class="bad">Unlogged:</p><table>${
      brLast.unloggedRows.map(u => `<tr><td>${esc(u.symbol)}</td><td class="sub">${esc(String(u.at))}</td>
      <td>${u.qty} @ ${u.price}</td></tr>`).join('')}</table>` : ''}
  </div>` : ''}

  <div class="card"><h3>What this cannot do</h3>
    <p class="sub">It proves when the card was written, not whether the reasoning in it was sincere.
    Nothing can prove that. It raises the cost of lying; it does not remove the option.</p>
    <p class="sub">It also needs the symbol on your pre-trade card to match the broker's symbol exactly.
    Unmatched trades are reported, not silently ignored.</p>
  </div>`;
}

export function brokerWire(render) {
  const f = $('br-file');
  if (!f) return;
  f.onchange = () => {
    if (!f.files[0]) return;
    const fr = new FileReader();
    fr.onload = async () => {
      const msg = $('br-msg');
      try {
        const rows = journal.parseCSV(fr.result);
        const r = await journal.importFills(rows);
        msg.className = 'ok';
        msg.textContent = `${rows.length} rows read · ${r.added} new · ${r.total} on record. Now tap Reconcile.`;
      } catch (e) { msg.className = 'bad'; msg.textContent = e.message; }
    };
    fr.readAsText(f.files[0]);
  };
}

export async function brokerHandle(act, ev, render) {
  if (act === 'b-recon') { brLast = await journal.reconcile(); return render(); }
  if (act === 'b-clear') {
    if (!await confirmToast('Remove all imported broker fills? Your trades are untouched.', 'Remove')) return;
    await journal.clearFills(); brLast = null; return render();
  }
}

// ===== INTRADAY SCREEN =====
export async function dayView() {
  const dayBO = await mind.blackout();
  const m = await R.marketState();
  const r = await R.intradayRules();
  const s = await R.dayStatus('live');
  const late = await R.openPastFlat();
  const p = await ledger.profile();

  const filter = m ? `
    <p class="${m.longsAllowed ? 'ok' : 'warn'}">
      ${m.longsAllowed ? 'Longs permitted' : 'Longs restricted — Nifty is below its 50 EMA'}
      ${m.shortsAllowed ? ' · shorts permitted' : ''}
    </p>
    <p class="sub">50 EMA ${m.ema50Rising ? 'rising' : 'flat or falling'} ·
      breadth ${esc(m.breadth || '—')} · VIX ${m.vix ?? '—'}</p>
    ${m.tradeBudget === 'half' ? '<p class="warn">Trade budget halved today — fewer trades, not smaller ones. Cutting size would distort your risk-per-trade data.</p>' : ''}
    ${m.sizeFactor < 1 ? `<p class="warn">Position size cut to ${m.sizeFactor * 100}% by VIX and breadth.</p>` : ''}
    <button data-act="i-relog" class="sub">Re-log market</button>`
    : `<label class="tune" style="justify-content:flex-start;gap:8px">
        <input id="i-above" type="checkbox" style="width:20px;margin:0">Nifty above its 50 EMA</label>
      <label class="tune" style="justify-content:flex-start;gap:8px">
        <input id="i-rising" type="checkbox" style="width:20px;margin:0">The 50 EMA is rising</label>
      <div class="grid">
        <select id="i-breadth"><option value="broad">Breadth: broad</option><option value="narrow">Breadth: narrow</option></select>
        <input id="i-vix" type="number" step="0.1" placeholder="India VIX">
      </div>
      <button data-act="i-market">Log market filter</button>
      <p class="sub">Read these off any chart before the open. Live intraday trading is blocked until logged.</p>`;

  const tune = [
    ['maxTradesPerDay', 'Max intraday trades per day'],
    ['dailyLossCapPct', 'Daily loss cap (% of capital)'],
    ['maxLeverage', 'Maximum leverage']
  ];

  return `
  <div class="card"><h2>Market filter — today</h2>
    ${m ? '' : tvChart('NSE:NIFTY', 'tv-day', 280)}
    ${filter}</div>

  <div class="card"><h2>Today's intraday count</h2>
    <p>${s.count}/${s.max} trades · ${s.open} open · P&L ${dayBO ? '•••' : rs(s.pnl)}</p>
    ${s.lockedToday ? '<p class="bad">Daily loss cap hit. The account is locked until tomorrow. The setups will still be there; today\'s version of you will not improve.</p>' : ''}
    ${late.length ? `<p class="bad">${late.length} intraday position(s) still open past ${esc(r.flatBy)}. Close them.</p>` : ''}
    <table>
      <tr><td>Dead zone</td><td>${esc(r.deadZoneStart)}–${esc(r.deadZoneEnd)} — A+ only</td></tr>
      <tr><td>No new entries after</td><td>${esc(r.noNewAfter)}</td></tr>
      <tr><td>Flat by</td><td>${esc(r.flatBy)}</td></tr>
      <tr><td>Leverage cap</td><td>${r.maxLeverage}×</td></tr>
    </table>
    <p class="sub">Each of these is a rule you would write while calm and break while trading.
    That is exactly the category that belongs in software rather than willpower.</p>
  </div>

  <div class="card"><h2>Tune the rules</h2>
    <p class="sub">Judgment, not findings. Change them deliberately, not mid-drawdown.</p>
    ${tune.map(([k, label]) => `<label class="tune">${label}
      <input data-irule="${k}" type="number" step="0.5" value="${r[k]}"></label>`).join('')}
    <button data-act="i-save">Save</button>
  </div>`;
}

export function dayWire(render) { mountTV(); }

export async function dayHandle(act, ev, render) {
  if (act === 'i-market') {
    await R.logMarket({
      niftyAbove50: $('i-above').checked, ema50Rising: $('i-rising').checked,
      breadth: $('i-breadth').value, vix: $('i-vix').value
    });
    return render();
  }
  if (act === 'i-relog') {
    const db = await import('./db.js');
    const m = await db.get('marketState', {});
    delete m[new Date().toISOString().slice(0, 10)];
    await db.set('marketState', m);
    return render();
  }
  if (act === 'i-save') {
    for (const i of document.querySelectorAll('[data-irule]')) await R.setIntradayRule(i.dataset.irule, +i.value);
    return render();
  }
}
