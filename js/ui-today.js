// ui-today.js — OWNS: the Status, Start and Settings screens, plus their actions.
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
import { $, esc, rs, toast, confirmToast, empty, tvChart, mountTV, nextActions, banner, markSeen,
  WHAT_IT_IS, WHAT_IT_WONT_DO, HOW_MARKING_WORKS, CONSTITUTION_TEMPLATE } from './ui-core.js';

// ===== STATUS SCREEN =====
// ---------------- home ----------------
export async function home() {
  const p = await ledger.profile();
  const ph = R.phase(p.phase);
  const g = await ledger.gate();
  const t = await ledger.trialStatus();
  const proj = await ledger.projection();
  const risk = await ledger.riskPct(p);
  const band = R.riskBand(p.capital);

  const bo = await mind.blackout();
  const p1 = p.phase === 1 ? await ledger.phase1Status() : null;
  const canStart = await ledger.canStartTrial();
  const acts = await nextActions();
  const r = await R.rules();
  const adhAll = await ledger.adherence(9999);
  const adh = adhAll.n ? adhAll.pct : null;
  const eqPoints = (await analytics.equityCurve()).curve;

  const blocks = g.blocks.length
    ? `<ul class="blocks">${g.blocks.map(b => `<li>${esc(b.msg)}</li>`).join('')}</ul>`
    : `<p class="ok">Live trading is open. Risk ${risk}% per trade.</p>`;

  const tracks = ['swing', 'intraday', 'options'];
  const trialCards = [];
  for (const tr of tracks) {
    const ts = await ledger.trialStatus(tr);
    if (!ts) continue;
    trialCards.push(`<div class="card"><h3>${esc(ts.label)} trial${ts.attempt > 1 ? ` — attempt ${ts.attempt}` : ''}</h3>
      <p>Day ${ts.days}/${ts.days + ts.daysLeft} · Trades ${ts.trades}/${ts.trades + ts.tradesLeft}</p>
      <p>Rule-following ${ts.adherence === null ? '—' : ts.adherence + '%'} (need ${ts.need}%)
         · Regressions ${ts.regressions}/3</p>
      ${ts.extending ? '<p class="warn">Calendar deadline reached but the trade count is short — the trial EXTENDS. Failing for trading too little would teach you to overtrade.</p>' : ''}
      ${ts.canPass ? '<p class="ok">Behaviour bar met.</p>' : ''}
      ${ts.profitRequired ? '<p class="sub">This phase also requires positive expectancy.</p>'
                          : '<p class="sub">Profit is NOT required to pass this phase.</p>'}
    </div>`);
  }
  const trial = trialCards.join('');

  const rec = await ledger.recoveryStatus();
  const recovery = rec ? `<div class="card"><h3>Coming back from a regression</h3>
    <p class="sub">The lock expiring restores permission. It does not restore evidence.
    These do.</p>
    <ul class="blocks">${rec.checks.map(c =>
      `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✓' : '○'} ${esc(c.t)}</li>`).join('')}</ul>
    <textarea id="rg-note" rows="5" placeholder="What actually went wrong? 60 characters minimum. This is the part that stops it repeating."></textarea>
    <button data-act="regress-note">Save account</button>
    ${rec.ok ? '<button data-act="regress-restore">Restore live trading</button>' : ''}
    <p class="bad" id="rg-msg"></p>
  </div>` : '';

  const ft = await ledger.failedTrialStatus();
  const failed = ft ? `<div class="card"><h3>Trial failed — cooldown</h3>
    <p class="sub">A failed trial restarts that track, not the whole system. What you learned
    does not evaporate; the evidence of live discipline does.</p>
    <p class="${ft.cooldownOver ? 'ok' : 'warn'}">${ft.cooldownOver
      ? 'Cooldown complete.'
      : 'Cooldown until ' + new Date(ft.until).toLocaleDateString('en-IN')}</p>
    ${ft.pattern ? `<p class="bad">${esc(ft.pattern)}</p>` : ''}
    ${ft.cooldownOver ? '<button data-act="restart-trial">Restart the trial</button>' : ''}
  </div>` : '';

  return `${await banner()}
  <div class="card hero">
    <div class="label">Process score — rules followed</div>
    <div class="big ${adh === null ? '' : adh >= r.adherencePass ? 'ok' : adh >= r.regressionFloor ? 'warn' : 'bad'}">
      ${adh === null ? '—' : adh + '%'}</div>
    <div class="bt"><div class="bf ${adh === null ? '' : adh >= r.adherencePass ? 'pos' : adh >= r.regressionFloor ? 'part' : 'neg'}"
      style="width:${adh || 0}%"></div></div>
    ${eqPoints.length > 1 ? CH.surface('ch-home-eq', 90) : ''}
    <p class="faint">${adh === null
      ? 'No closed trades yet. This is the number this system judges you on — not profit.'
      : `Pass bar ${r.adherencePass}% · regression below ${r.regressionFloor}%. This is the headline number, deliberately. Profit is an outcome; this is the process.`}</p>
  </div>
  <div class="card">
    <h2>Phase ${ph.id} — ${ph.name}</h2>
    <p class="sub">${ph.blurb}</p>
    <p>Stage: <b>${p.stage}</b> · Capital ${bo ? '<span class="sub">hidden</span>' : rs(p.capital)} · Ceiling ${band.ceiling}% (daily cap ${band.dailyCap}%)</p>
    ${blocks}
  </div>
  ${trial}
  ${recovery}
  ${failed}
  ${p1 ? `<div class="card"><h3>Phase 1 readiness</h3>
    ${p1.bars.map(b => `<div class="rb">
      <div class="rbh"><span>${esc(b.label)}</span><span class="${b.ok ? 'ok' : ''}">${b.now}/${b.need}</span></div>
      <div class="bt"><div class="bf ${b.ok ? 'pos' : 'part'}" style="width:${b.pct}%"></div></div>
    </div>`).join('')}
    ${p1.ok ? '<button data-act="advance">Advance to Phase 2</button>'
            : '<p class="sub">All four are required. None can be bought, and none can be rushed — the paper trades alone take weeks.</p>'}
  </div>` : ''}
  ${p.phase > 1 && !p.trial ? `<div class="card"><h3>Start a trial</h3>
    ${await (async () => {
      const out = [];
      for (const tr of ['swing', 'intraday', 'options']) {
        const c = await ledger.canStartTrial(tr);
        out.push(`<div class="rb"><div class="rbh"><span><b>${esc(c.spec.label)}</b>
          <span class="sub"> ${c.spec.days} days · ${c.spec.trades} trades</span></span>
          ${c.ok ? `<button data-act="start-trial" data-t="${tr}">start</button>` : ''}</div>
          ${c.ok ? '' : `<p class="sub">${esc(c.why[0])}</p>`}</div>`);
      }
      return out.join('');
    })()}
    <p class="sub">Swing and intraday are separate trials. Fast intraday volume must never
    satisfy a trade minimum meant for slow swing evidence.</p>
  </div>` : ''}
  ${t && t.canPass ? `<div class="card"><h3>${esc(t.label || 'Trial')} complete</h3>
    <button data-act="advance">Advance to the next phase</button>
    <p class="bad" id="adv-msg"></p></div>` : ''}
  ${acts.length ? `<div class="card"><h3>Do this next</h3>
    ${acts.slice(0, 3).map(a => `<p><b>${esc(a.title)}</b> <button data-go="${a.tab}" class="sub">open</button>
      <br><span class="sub">${esc(a.why)}</span></p>`).join('')}
  </div>` : ''}
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



// ===== SETTINGS SCREEN =====
// ---------------- settings ----------------
export async function settings() {
  const p = await ledger.profile();
  const r = await R.rules();
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
    <p class="sub">Every number below is judgment, not a finding. None is validated. Tune them.</p>
    ${tune.map(k => `<label class="tune">${k}
      <input data-rule="${k}" type="number" step="0.5" value="${r[k]}"></label>`).join('')}
    <button data-act="save-rules">Save rules</button>
  </div>
  <div class="card"><h2>Danger</h2>
    <button data-act="wipe" class="danger">Erase everything</button></div>`;
}



// ===== START SCREEN =====
const START_TABS = [
  ['Start', 'What this is, and what to do next.'],
  ['Learn', 'Nine units, 108 questions, spaced repetition, and the sizing drill. Passing a unit unlocks the patterns it teaches.'],
  ['Backtest', 'Mark historical examples of a pattern. Entry and stop committed before the outcome is revealed.'],
  ['Journal', 'The pre-trade card that blocks the trade, and the post-trade card that scores it. This is the real product.'],
  ['Mind', 'Morning state gate, tilt interrupts, and your Trading Constitution.'],
  ['Drills', 'Seven psychology drills, blackout mode, and the weekly and monthly reviews.'],
  ['Edge', 'What you are actually good at. Nothing shown below the minimum sample.'],
  ['Day', 'Market filter and the intraday hard rules. Only relevant once you trade intraday.'],
  ['Market', 'Options regime classifier and the Cost Wall. Phase 3 material.'],
  ['Broker', 'Import your broker trade book and reconcile it against your journal.'],
  ['Settings', 'Capital, wind-down, and every tunable number in the system.']
];

export async function startView() {
  const actions = await nextActions();

  return `
  <div class="card">
    <h2>What this is</h2>
    ${WHAT_IT_IS.map(p => `<p>${esc(p)}</p>`).join('')}
  </div>

  <div class="card">
    <h2>Do this next</h2>
    ${actions.map(a => `<div class="act ${a.urgent ? 'urgent' : ''}">
      <span class="mark"></span>
      <div class="body"><div class="t">${esc(a.title)}</div><div class="w">${esc(a.why)}</div></div>
      <button data-go="${a.tab}" class="sub">Open</button>
    </div>`).join('')}
    <p class="sub">This list recalculates every time you open the app. There is never a screen
    that just tells you to wait — while a live gate is pending there is always backtesting,
    drilling, paper trading or reading to do.</p>
  </div>

  <div class="card">
    <h2>How marking examples works</h2>
    ${HOW_MARKING_WORKS.map(p => `<p>${esc(p)}</p>`).join('')}
  </div>

  <div class="card">
    <h2>What this will not do</h2>
    <ol class="sub">${WHAT_IT_WONT_DO.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
  </div>

  <div class="card">
    <h2>The tabs</h2>
    <table>${START_TABS.map(([n, d]) => `<tr><td><b>${esc(n)}</b><div class="sub">${esc(d)}</div></td></tr>`).join('')}</table>
  </div>

  <div class="card">
    <h2>Before anything else</h2>
    <p class="sub">Go to <b>Settings</b>, enter your capital, and answer the question about
    whose money it is. Borrowed or already-committed money is a hard block, not a warning —
    it carries a repayment date, and a repayment date is financial pressure with a schedule attached.</p>
    <p class="sub">Then back up. One tap in the banner at the top of Status writes a JSON file.
    Put it in Google Drive. Your phone can clear this app's storage without warning.</p>
    <button data-act="o-done">I have read this</button>
  </div>`;
}

export async function startHandle(act, ev, render) {
  if (act === 'o-done') { await markSeen(); return render(); }
}

// ===== STATUS & SETTINGS ACTIONS =====
export async function statusHandle(act, ev, render) {
  const p = await ledger.profile();

  if (act === 'backup') { await store.download(false); return render(); }
  if (act === 'report') { await analytics.downloadReport(); return; }
  if (act === 'backup-full') {
    const mb = await store.exportSizeMB(true);
    if (mb > 25 && !await confirmToast(`That backup is about ${mb} MB. Large exports can fail on a phone.`, 'Export anyway')) return;
    await store.download(true);
    return render();
  }

  if (act === 'start-trial') {
    try { await ledger.startTrial(ev.target.dataset.t || 'swing'); } catch (e) { toast(e.message, 'bad'); }
    return render();
  }
  if (act === 'restart-trial') {
    try { await ledger.restartTrial(ev.target.dataset.t || 'swing'); } catch (e) { toast(e.message, 'bad'); }
    return render();
  }
  if (act === 'regress-note') {
    try { await ledger.writeRegressionNote($('rg-note').value); }
    catch (e) { $('rg-msg').textContent = e.message; return; }
    return render();
  }
  if (act === 'regress-restore') {
    try { await ledger.restoreFromRegression(); } catch (e) { toast(e.message, 'bad'); }
    return render();
  }
  if (act === 'advance') {
    try { await ledger.advancePhase(); } catch (e) { toast(e.message, 'bad'); }
    return render();
  }

  if (act === 'save-cap') {
    p.capital = Math.max(0, +$('cap').value || 0);
    p.peakEquity = Math.max(p.peakEquity || 0, p.capital);
    await ledger.saveProfile(p); return render();
  }
  if (act === 'clean-yes' || act === 'clean-no') {
    p.capitalIsClean = act === 'clean-yes';
    p.capitalAskedOn = new Date().toISOString();
    await ledger.saveProfile(p); return render();
  }
  if (act === 'pause') { await ledger.pause(); return render(); }
  if (act === 'resume') { await ledger.resume(); return render(); }

  if (act === 'save-rules') {
    for (const i of document.querySelectorAll('[data-rule]')) {
      await R.setRule(i.dataset.rule, +i.value);
    }
    return render();
  }



  if (act === 'wipe') {
    if (!await confirmToast('Erase every trade, backtest and setting. Back up first.', 'Erase everything')) return;
    for (const s of store.STORES) await store.clear(s);
    return render();
  }
}

