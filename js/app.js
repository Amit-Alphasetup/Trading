// app.js — OWNS: screens and DOM. Reads through ledger/backup/schema. Never touches db directly.

import * as S from './schema.js';
import * as L from './ledger.js';
import * as B from './backup.js';
import * as db from './db.js';

const $ = id => document.getElementById(id);
const el = document.getElementById('app');
const rs = n => '₹' + Math.round(n).toLocaleString('en-IN');
const esc = s => String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

let route = 'home';

// ---------------- banner: backup + storage health ----------------
async function banner() {
  const b = await B.status();
  const cls = b.critical ? 'bad' : b.due ? 'warn' : 'ok';
  const note = !b.persisted
    ? 'This browser has NOT granted permanent storage. Back up after every trade.'
    : '';
  return `<div class="banner ${cls}">
    <b>Last backup:</b> ${b.lastAt ? b.since + ' trades ago' : 'never'}
    · storage ${b.persisted ? 'permanent' : 'EVICTABLE'} · ${b.usedMB}/${b.quotaMB} MB
    ${note ? `<div class="sub">${note}</div>` : ''}
    <div class="row">
      <button data-act="backup">Back up now</button>
      <label class="btn">Restore<input type="file" id="restoreFile" accept=".json" hidden></label>
    </div></div>`;
}

// ---------------- home ----------------
async function home() {
  const p = await L.profile();
  const ph = S.phase(p.phase);
  const g = await L.gate();
  const t = await L.trialStatus();
  const proj = await L.projection();
  const risk = await L.riskPct(p);
  const band = S.riskBand(p.capital);

  const blocks = g.blocks.length
    ? `<ul class="blocks">${g.blocks.map(b => `<li>${esc(b.msg)}</li>`).join('')}</ul>`
    : `<p class="ok">Live trading is open. Risk ${risk}% per trade.</p>`;

  const trial = t ? `<div class="card"><h3>Trial</h3>
    <p>Day ${t.days}/${t.days + t.daysLeft} · Trades ${t.trades}/${t.trades + t.tradesLeft}</p>
    <p>Rule-following ${t.adherence === null ? '—' : t.adherence + '%'} (need ${t.need}%)
       · Regressions ${t.regressions}/3</p>
    ${t.extending ? '<p class="warn">Calendar deadline reached but trade count is short — the trial EXTENDS. It does not fail.</p>' : ''}
    ${t.canPass ? '<p class="ok">Behaviour bar met.</p>' : ''}
    ${t.profitRequired ? '<p class="sub">This phase also requires positive expectancy.</p>' : '<p class="sub">Profit is NOT required to pass this phase.</p>'}
    </div>` : '';

  return `${await banner()}
  <div class="card">
    <h2>Phase ${ph.id} — ${ph.name}</h2>
    <p class="sub">${ph.blurb}</p>
    <p>Stage: <b>${p.stage}</b> · Capital ${rs(p.capital)} · Ceiling ${band.ceiling}% (daily cap ${band.dailyCap}%)</p>
    ${blocks}
  </div>
  ${trial}
  <div class="card"><h3>How long will this take?</h3><p class="sub">${esc(proj.text)}</p></div>
  <div class="card"><h3>What this will not do</h3>
    <ol class="sub">
      <li>It will not prevent losses.</li>
      <li>It cannot say how long this takes.</li>
      <li>It cannot certify psychological readiness.</li>
      <li>It cannot prove your journal is sincere — only that it was written first.</li>
      <li>Most people attempting this fail. This improves odds; it promises nothing.</li>
    </ol></div>`;
}

// ---------------- backtest (manual mode) ----------------
async function backtest() {
  const ev = await L.patternEvidence();
  const r = await S.rules();
  const rows = await db.all('backtests');
  const names = [...new Set([...S.SETUPS.swing, ...S.SETUPS.intraday, ...Object.keys(ev)])];

  const table = Object.keys(ev).length ? `<table>
    <tr><th>Pattern</th><th>n</th><th>Win%</th><th>Expectancy</th><th>Unlocks</th></tr>
    ${Object.entries(ev).map(([k, m]) => `<tr>
      <td>${esc(k)}</td><td>${m.n}</td>
      <td>${m.trustworthy ? m.winRate + '%' : '—'}</td>
      <td>${m.trustworthy ? m.expectancy.toFixed(2) + 'R' : `<span class="sub">insufficient data (${r.btTrust} needed)</span>`}</td>
      <td>${m.liveOK ? '<span class="ok">live</span>' : m.paperOK ? 'paper' : `${r.btPaper - m.n} more to paper`}</td>
    </tr>`).join('')}</table>` : '<p class="sub">No examples marked yet.</p>';

  return `<div class="card"><h2>Backtest — manual mode</h2>
    <p class="sub">Mark examples from any charting app. ${r.btPaper} unlocks paper, ${r.btLive} unlocks live,
    ${r.btTrust} before a number is trusted. You may only trade what you personally proved.</p>
    <select id="bt-pattern">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select>
    <div class="grid">
      <input id="bt-entry" type="number" inputmode="decimal" placeholder="Entry">
      <input id="bt-stop" type="number" inputmode="decimal" placeholder="Stop">
      <input id="bt-exit" type="number" inputmode="decimal" placeholder="Exit">
      <input id="bt-date" type="date">
    </div>
    <button data-act="bt-add">Add example</button>
    <p id="bt-msg" class="sub"></p>
  </div>
  <div class="card"><h3>Your measured evidence</h3>${table}
    <p class="sub">${rows.length} examples marked in total.</p></div>`;
}

// ---------------- settings ----------------
async function settings() {
  const p = await L.profile();
  const r = await S.rules();
  const tune = ['adherencePass', 'regressionFloor', 'drawdownTrigger', 'regressionLock',
    'btPaper', 'btLive', 'btTrust', 'trialRiskPct', 'backupEveryNTrades'];

  return `<div class="card"><h2>Capital</h2>
    <input id="cap" type="number" inputmode="numeric" value="${p.capital}" placeholder="Total trading capital ₹">
    <button data-act="save-cap">Save</button>
    <p class="sub">Declaring capital never unlocks a skill level. It can only remove a money block.</p>
  </div>
  <div class="card"><h2>Whose money is it?</h2>
    <p class="sub">Is any of this capital borrowed, from family, or already committed to something else?</p>
    <div class="row">
      <button data-act="clean-yes" class="${p.capitalIsClean === true ? 'sel' : ''}">All mine, uncommitted</button>
      <button data-act="clean-no" class="${p.capitalIsClean === false ? 'sel' : ''}">Some is borrowed/committed</button>
    </div>
    <p class="sub">Answered again every 90 days. "Borrowed" is a hard block, not a warning.</p>
  </div>
  <div class="card"><h2>Wind-down</h2>
    <p class="sub">Job change, illness, family emergency. Freezes every gate with no penalty. Nothing decays.</p>
    <button data-act="${p.stage === 'paused' ? 'resume' : 'pause'}">${p.stage === 'paused' ? 'Resume' : 'Pause everything'}</button>
  </div>
  <div class="card"><h2>Tunable rules</h2>
    <p class="sub">Every number below is judgment, not a研 finding. None is validated. Tune them.</p>
    ${tune.map(k => `<label class="tune">${k}
      <input data-rule="${k}" type="number" step="0.5" value="${r[k]}"></label>`).join('')}
    <button data-act="save-rules">Save rules</button>
  </div>
  <div class="card"><h2>Danger</h2>
    <button data-act="wipe" class="danger">Erase everything</button></div>`;
}

// ---------------- render + events ----------------
const VIEWS = { home, backtest, settings };
async function render() {
  el.innerHTML = '<p class="sub">Loading…</p>';
  try { el.innerHTML = await VIEWS[route](); }
  catch (e) { el.innerHTML = `<div class="card bad">Error: ${esc(e.message)}</div>`; }
  document.querySelectorAll('nav button').forEach(b =>
    b.classList.toggle('sel', b.dataset.go === route));
  const f = $('restoreFile');
  if (f) f.onchange = async () => {
    if (!f.files[0]) return;
    if (!confirm('This REPLACES all current data. Continue?')) return;
    try { await B.restore(f.files[0]); alert('Restored.'); render(); }
    catch (e) { alert('Restore failed: ' + e.message); }
  };
}

document.addEventListener('click', async ev => {
  const go = ev.target.dataset && ev.target.dataset.go;
  if (go) { route = go; return render(); }
  const act = ev.target.dataset && ev.target.dataset.act;
  if (!act) return;
  const p = await L.profile();

  if (act === 'backup') { await B.download(); return render(); }

  if (act === 'save-cap') {
    p.capital = Math.max(0, +$('cap').value || 0);
    p.peakEquity = Math.max(p.peakEquity || 0, p.capital);
    await L.saveProfile(p); return render();
  }
  if (act === 'clean-yes' || act === 'clean-no') {
    p.capitalIsClean = act === 'clean-yes';
    p.capitalAskedOn = new Date().toISOString();
    await L.saveProfile(p); return render();
  }
  if (act === 'pause') { await L.pause(); return render(); }
  if (act === 'resume') { await L.resume(); return render(); }

  if (act === 'save-rules') {
    for (const i of document.querySelectorAll('[data-rule]')) {
      await S.setRule(i.dataset.rule, +i.value);
    }
    return render();
  }

  if (act === 'bt-add') {
    const entry = +$('bt-entry').value, stop = +$('bt-stop').value, exit = +$('bt-exit').value;
    const msg = $('bt-msg');
    if (!entry || !stop || !exit) { msg.textContent = 'Entry, stop and exit are all required.'; return; }
    const risk = Math.abs(entry - stop);
    if (!risk) { msg.textContent = 'Stop cannot equal entry.'; return; }
    const dir = stop < entry ? 1 : -1;
    await db.add('backtests', {
      pattern: $('bt-pattern').value, entry, stop, exit,
      rMultiple: +(((exit - entry) * dir) / risk).toFixed(2),
      date: $('bt-date').value || null, at: new Date().toISOString()
    });
    return render();
  }

  if (act === 'wipe') {
    if (!confirm('Erase every trade, backtest and setting. Back up first. Continue?')) return;
    for (const s of db.STORES) await db.clear(s);
    return render();
  }
});

// quarterly re-ask of the capital-source question (G5)
(async () => {
  const p = await L.profile();
  if (p.capitalAskedOn && Date.now() - new Date(p.capitalAskedOn).getTime() > 90 * 86400000) {
    p.capitalIsClean = null;
    await L.saveProfile(p);
  }
  await L.checkRegression();
  render();
})();
