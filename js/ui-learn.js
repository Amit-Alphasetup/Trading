// ui-learn.js — OWNS: the Learn, Playbook, Backtest and Replay screens.
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

// ===== LEARN SCREEN =====
let lnQ = null, lnStart = 0, lnTick = null;
let lnUnit = null, lnQuiz = false, lnTab = 'units', lnReview = null;

export async function learnView() {
  if (lnTab === 'drill') return lnDrillView();
  if (lnTab === 'lnReview') return lnReviewView();
  if (lnUnit) return lnUnitView();
  return lnUnitsView();
}

function lnNav() {
  return `<div class="card"><div class="row">
    <button data-act="l-lnTab" data-t="units" class="${lnTab === 'units' && !lnUnit ? 'sel' : ''}">Units</button>
    <button data-act="l-lnTab" data-t="lnReview" class="${lnTab === 'lnReview' ? 'sel' : ''}">Review</button>
    <button data-act="l-lnTab" data-t="drill" class="${lnTab === 'drill' ? 'sel' : ''}">Sizing drill</button>
  </div></div>`;
}

async function lnUnitsView() {
  const p = await learn.progress();
  const due = await learn.dueReviews();
  const done = learn.UNITS.filter(u => (p[u.id] || {}).passed).length;

  const fresh = {};
  for (const u of learn.UNITS) fresh[u.id] = await learn.unitFreshness(u.id);

  const list = learn.UNITS.map(u => {
    const st = p[u.id] || {};
    const f = fresh[u.id];
    const state = st.passed
      ? (f.dueNow ? `<span class="ok">passed</span> <span class="warn">· ${f.dueNow} lnReview(s) due</span>`
                  : '<span class="ok">passed</span>')
      : st.decayedOn ? '<span class="bad">lapsed — reviews went unanswered</span>'
      : st.read ? '<span class="warn">read, not passed</span>' : '<span class="sub">not started</span>';
    const gives = u.unlocks.length
      ? `<div class="sub">Unlocks: ${u.unlocks.map(esc).join(' · ')}</div>` : '';
    return `<div class="card">
      <h3>${esc(u.title)}</h3>
      <p class="sub">Phase ${u.phase} · ${u.mins} min ${u.sections ? '· <span class="ok">full</span>' : '· <span class="warn">summary</span>'} · ${state} ${st.best ? '· best ' + st.best + '%' : ''}</p>
      ${gives}
      <button data-act="l-open" data-id="${u.id}">${st.passed ? 'Read again' : 'Start'}</button>
    </div>`;
  }).join('');

  return lnNav() + `<div class="card">
    <h2>${done}/${learn.UNITS.length} units passed</h2>
    <p class="sub">Nothing here is locked — read any unit, in any order, at any speed.
    But a pattern cannot be marked or traded until the unit teaching it is passed at 100%.
    Retakes are unlimited — the bar is strict, the door is not locked.
    That is the only reason to do this in order.</p>
    ${due.length ? `<p class="warn">${due.length} question(s) due for lnReview. They come back until they stick.</p>` : ''}
    <p class="sub">A pass is a lease, not a deed. Leave a unit's reviews unanswered for ${learn.STALE_DAYS} days
    and it lapses — the patterns it unlocked lock again until you answer them.</p>
  </div>` + list + `
  <div class="card"><h3>Going deeper</h3>
    <p class="sub">These summaries are the working minimum. Zerodha Varsity has the depth, free.</p>
    <table>${learn.CURRICULUM.map(c => `<tr><td><a href="${c.link}" target="_blank" rel="noopener">${esc(c.unit)}</a>
      <div class="sub">${esc(c.topics)}</div></td></tr>`).join('')}</table>
  </div>`;
}

async function lnUnitView() {
  const u = learn.unitById(lnUnit);
  if (!lnQuiz) {
    return `<div class="card">
      <button data-act="l-back" class="sub">← All units</button>
      <h2>${esc(u.title)}</h2>
      ${u.sections
        ? u.sections.map(s => `<h3 class="sh">${esc(s.h)}</h3>` +
            s.p.map(par => `<p>${esc(par)}</p>`).join('')).join('')
        : (u.read || []).map(par => `<p>${esc(par)}</p>`).join('')}
      <button data-act="l-quiz">I've read it — ${u.qs.length} questions</button>
      <p class="sub">Every question must be right. Retakes are unlimited and immediate —
      nothing locks, and your best score is kept. The bar is 100% because this is the one
      layer where partial knowledge is worth nothing: a half-understood stop rule fails at
      the exact moment it matters. Wrong answers return in 3 days regardless.</p>
    </div>`;
  }
  return `<div class="card">
    <h2>${esc(u.title)}</h2>
    ${u.qs.map((x, i) => `<div class="qa"><p><b>${i + 1}.</b> ${esc(x.lnQ)}</p>
      ${x.o.map((o, j) => `<label class="tune" style="justify-content:flex-start;gap:8px">
        <input type="radio" name="u${i}" value="${j}" style="width:20px;margin:0">${esc(o)}</label>`).join('')}
    </div>`).join('')}
    <button data-act="l-submit">Submit</button>
    <div id="l-result"></div>
  </div>`;
}

async function lnReviewView() {
  const due = await learn.dueReviews();
  if (!due.length) return lnNav() + `<div class="card"><h2>Nothing due</h2>
    <p class="sub">Correct answers recede to 7, then 21, then 60 days. Wrong ones come back in 3.</p></div>`;
  lnReview = (lnReview && due.find(d => d.key === lnReview.key)) ? lnReview : due[0];
  const x = lnReview.lnQ;
  return lnNav() + `<div class="card">
    <p class="sub">${due.length} due · from "${esc(learn.unitById(lnReview.unitId).title)}"</p>
    <p><b>${esc(x.lnQ)}</b></p>
    ${x.o.map((o, j) => `<button data-act="l-rev" data-j="${j}" style="display:block;width:100%;text-align:left">${esc(o)}</button>`).join('')}
    <div id="rev-result"></div>
  </div>`;
}

async function lnDrillView() {
  const d = await learn.drillState();
  const avg = d.times.length ? Math.round(d.times.reduce((a, b) => a + b, 0) / d.times.length / 100) / 10 : null;
  return lnNav() + `<div class="card"><h2>Sizing Reflex drill</h2>
    <p class="sub">Phase 1 gate: ${learn.DRILL_TARGET} correct in a row, each under ${learn.DRILL_SECONDS} seconds.
    Under stress you will not calculate — you will guess.</p>
    <p>Streak <b class="${d.streak >= learn.DRILL_TARGET ? 'ok' : ''}">${d.streak}</b>/${learn.DRILL_TARGET}
      · best ${d.best} · ${d.correct}/${d.attempts} correct ${avg !== null ? '· avg ' + avg + 's' : ''}</p>
    ${d.streak >= learn.DRILL_TARGET ? '<p class="ok">Drill passed.</p>' : ''}
    ${lnQ ? `<div class="drill">
        <p class="sub">Capital ${rs(lnQ.capital)} · risk ${lnQ.riskPct}% · entry ${lnQ.entry} · stop ${lnQ.stop}</p>
        <p><b>How many shares?</b></p>
        <input id="d-ans" type="number" inputmode="numeric" placeholder="Quantity">
        <p class="sub">Time <span id="d-clock">0.0</span>s</p>
        <button data-act="l-answer">Answer</button>
      </div>` : `<button data-act="l-next">${d.attempts ? 'Continue' : 'Start'}</button>`}
    <p id="d-msg"></p>
    <button data-act="l-reset" class="danger sub">Reset drill</button>
  </div>`;
}

export function learnWire() {
  const clock = $('d-clock');
  if (lnQ && clock) {
    clearInterval(lnTick);
    lnTick = setInterval(() => {
      const s = (Date.now() - lnStart) / 1000;
      clock.textContent = s.toFixed(1);
      clock.className = s > learn.DRILL_SECONDS ? 'bad' : '';
    }, 100);
    const inp = $('d-ans');
    if (inp) { inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') document.querySelector('[data-act="l-answer"]').click(); }; }
  }
}

export async function learnHandle(act, ev, render) {
  const D = ev.target.dataset;

  if (act === 'l-lnTab') { lnTab = D.t; lnUnit = null; lnQuiz = false; return render(); }
  if (act === 'l-back') { lnUnit = null; lnQuiz = false; return render(); }
  if (act === 'l-open') { lnUnit = D.id; lnQuiz = false; lnTab = 'units'; return render(); }
  if (act === 'l-quiz') { await learn.markRead(lnUnit); lnQuiz = true; return render(); }

  if (act === 'l-submit') {
    const u = learn.unitById(lnUnit);
    const answers = u.qs.map((_, i) => {
      const s = document.querySelector(`input[name="u${i}"]:checked`);
      return s ? +s.value : -1;
    });
    const r = await learn.answerUnit(lnUnit, answers);
    $('l-result').innerHTML = `<p class="${r.passed ? 'ok' : 'bad'}">${r.pct}% — ${
      r.passed ? 'Passed. Patterns this unit teaches are now markable in Backtest.'
               : 'Every question must be right. Wrong ones return in 3 days.'}</p>` +
      r.wrong.map(i => `<p class="sub"><b>${i + 1}.</b> Correct: ${esc(u.qs[i].o[u.qs[i].a])} — ${esc(u.qs[i].why)}</p>`).join('') +
      (r.passed ? '<button data-act="l-back">← All units</button>' : '<button data-act="l-quiz">Try again</button>');
    return;
  }

  if (act === 'l-rev') {
    const correct = +D.j === lnReview.lnQ.a;
    await learn.answerReview(lnReview.key, correct);
    $('rev-result').innerHTML = `<p class="${correct ? 'ok' : 'bad'}">${correct ? 'Correct.' : 'Wrong — ' + esc(lnReview.lnQ.o[lnReview.lnQ.a])}</p>
      <p class="sub">${esc(lnReview.lnQ.why)}</p>`;
    lnReview = null;
    setTimeout(render, 1800);
    return;
  }

  if (act === 'l-next') { lnQ = learn.newQuestion(); lnStart = Date.now(); return render(); }

  if (act === 'l-answer') {
    if (!lnQ) return;
    const ms = Date.now() - lnStart, given = $('d-ans').value;
    clearInterval(lnTick);
    const r = await learn.drillAnswer(lnQ, given, ms);
    lnQ = null;
    await render();
    const m = $('d-msg');
    if (m) {
      m.className = r.ok && r.inTime ? 'ok' : 'bad';
      m.textContent = r.ok && r.inTime
        ? `Correct in ${(ms / 1000).toFixed(1)}s. Streak ${r.streak}.`
        : `${r.ok ? 'Right but too slow' : 'Wrong'} — answer was ${r.answer} (${(ms / 1000).toFixed(1)}s). Streak reset.`;
    }
    return;
  }

  if (act === 'l-reset') {
    if (!await confirmToast('Reset the drill streak?', 'Reset')) return;
    await learn.resetDrill(); lnQ = null; return render();
  }
}

// ===== PLAYBOOK SCREEN =====
// Prose in a unit is for learning. This is for 09:40 at a chart, deciding in
// thirty seconds whether the thing in front of you qualifies.
let pbOpen = null, pbTicks = {}, pbFamily = 'swing';

export async function playbookView() {
  if (pbOpen) return playbookCardView();
  const core = await spec.core();
  const fams = pb.families();
  const list = pb.setupsIn(pbFamily).map(k => {
    const c = pb.cardFor(k);
    const isCore = core && core.setups.includes(k);
    return `<div class="card">
      <div class="rbh"><h3>${esc(k)} ${isCore ? '<span class="ok">core</span>' : ''}</h3>
        <button data-act="y-open" data-s="${esc(k)}">checklist</button></div>
      <p class="sub">${esc(c.idea)}</p>
      <p class="sub">${c.qualifies.length} conditions · taught in the ${esc(c.unit)} unit</p>
    </div>`;
  }).join('');

  return `<div class="card"><h2>Playbook</h2>
    <p class="sub">One card per setup: what qualifies it, what voids it, the exact trigger,
    where the stop goes, and how it fails. Use the same card when marking backtest examples
    and when filling a pre-trade card — that is the only reason a backtest predicts anything
    about live trading.</p>
    <div class="row">${fams.map(f =>
      `<button data-act="y-fam" data-f="${esc(f)}" class="${pbFamily === f ? 'sel' : ''}">${esc(f)}</button>`).join('')}</div>
  </div>` + list;
}

async function playbookCardView() {
  const c = pb.cardFor(pbOpen);
  const t = pbTicks[pbOpen] || [];
  const n = t.filter(Boolean).length;
  const total = c.qualifies.length;
  const stats = await pb.qualificationStats(pbOpen);

  return `<div class="card">
    <button data-act="y-back" class="sub">← All setups</button>
    <h2>${esc(pbOpen)}</h2>
    <p class="sub">${esc(c.idea)}</p>
  </div>

  <div class="card"><h3>Qualifies if — ${n}/${total}</h3>
    ${c.qualifies.map((q, i) => `<label class="tune" style="justify-content:flex-start;gap:8px;align-items:flex-start">
      <input type="checkbox" data-act="y-tick" data-i="${i}" style="width:20px;margin:2px 0 0"
        ${t[i] ? 'checked' : ''}>${esc(q)}</label>`).join('')}
    <div class="bt"><div class="bf ${n === total ? 'pos' : 'part'}"
      style="width:${Math.round(n / total * 100)}%"></div></div>
    <p class="${n === total ? 'ok' : 'warn'}">${n === total
      ? 'Fully qualified. This is a trade.'
      : `${total - n} condition(s) unmet. If it is only "sort of there", it is not a setup — skip it.`}</p>
    <div class="row">
      <button data-act="y-took">I took it</button>
      <button data-act="y-skip">I skipped it</button>
      <button data-act="y-clear" class="sub">clear</button>
    </div>
    ${stats.n ? `<p class="sub">Logged ${stats.n} times · taken ${stats.taken} · skipped ${stats.skipped}
      ${stats.partialPct ? `· <span class="${stats.partialPct > 30 ? 'bad' : 'warn'}">${stats.partialPct}% of the trades you took were only partly qualified</span>` : ''}</p>` : ''}
  </div>

  <div class="card"><h3>Disqualifies if</h3>
    <ul class="blocks">${c.disqualifies.map(d => `<li class="warn">${esc(d)}</li>`).join('')}</ul>
  </div>

  <div class="card">
    <h3>Trigger</h3><p>${esc(c.trigger)}</p>
    <h3>Stop</h3><p>${esc(c.stop)}</p>
    <h3>Target</h3><p>${esc(c.target)}</p>
  </div>

  <div class="card"><h3>How it fails</h3>
    ${c.fails.map(f => `<p class="sub">${esc(f)}</p>`).join('')}
  </div>`;
}

export async function playbookHandle(act, ev, render) {
  const D = ev.target.dataset;
  if (act === 'y-fam') { pbFamily = D.f; return render(); }
  if (act === 'y-open') { pbOpen = D.s; return render(); }
  if (act === 'y-back') { pbOpen = null; return render(); }
  if (act === 'y-clear') { pbTicks[pbOpen] = []; return render(); }
  if (act === 'y-tick') {
    const t = pbTicks[pbOpen] || (pbTicks[pbOpen] = []);
    t[+D.i] = ev.target.checked;
    const c = pb.cardFor(pbOpen);
    const n = t.filter(Boolean).length;
    const box = document.querySelector('.bf');
    if (box) box.style.width = Math.round(n / c.qualifies.length * 100) + '%';
    return;
  }
  if (act === 'y-took' || act === 'y-skip') {
    const c = pb.cardFor(pbOpen);
    const t = pbTicks[pbOpen] || [];
    await pb.recordQualification(pbOpen, t.filter(Boolean).length, c.qualifies.length, act === 'y-took');
    pbTicks[pbOpen] = [];
    return render();
  }
}


// ===== BACKTEST SCREEN =====
let btBrowsing = null, btMsg = '';

export async function backtestView() {
  const p = await ledger.pending();
  const ev = await ledger.patternEvidence();
  const r = await R.rules();
  const names = await ledger.patterns();
  const integ = await ledger.integrity();
  const locked = learn.UNITS.filter(u => u.unlocks.length)
    .filter(u => u.unlocks.some(x => !names.includes(x)));

  if (btBrowsing) return btBrowseView();

  const stageForm = `<div class="card">
    <h2>Mark an example — step 1 of 2</h2>
    <p class="sub">Scroll the chart with the future hidden. Stop at the candle where the setup
    was visible. Write it down here <b>before</b> you reveal what happened.</p>
    ${names.length ? `
      <select id="bt-pattern">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select>
      <button data-go="playbook" class="sub">open the checklist — mark against the same criteria you will trade</button>
      <div class="grid">
        <input id="bt-symbol" placeholder="Symbol" autocapitalize="characters">
        <input id="bt-date" type="date">
        <input id="bt-entry" type="number" inputmode="decimal" placeholder="Entry">
        <input id="bt-stop" type="number" inputmode="decimal" placeholder="Stop">
        <input id="bt-target" type="number" inputmode="decimal" placeholder="Target">
      </div>
      <input id="bt-note" placeholder="Why this qualified (optional)">
      <button data-act="k-stage">Commit — then reveal</button>`
      : '<p class="warn">No pattern is unlocked yet. Pass a unit in Learn first.</p>'}
    ${locked.length ? `<p class="sub">Still locked: ${locked.map(u =>
      u.unlocks.filter(x => !names.includes(x)).map(esc).join(', ') + ` (needs "${esc(u.title)}")`).join(' · ')}</p>` : ''}
    <p class="bad" id="bt-btMsg">${esc(btMsg)}</p>
  </div>`;

  const revealForm = p ? `<div class="card">
    <h2>Step 2 — now reveal</h2>
    <p class="sub">Committed ${new Date(p.stagedAt).toLocaleTimeString('en-IN')}. These cannot be edited.</p>
    <table>
      <tr><td>${esc(p.symbol)}</td><td>${esc(p.date)}</td><td>${esc(p.pattern)}</td></tr>
      <tr><td>Entry ${p.entry}</td><td>Stop ${p.stop}</td><td>Target ${p.target} (${p.rr}R)</td></tr>
    </table>
    <input id="bt-exit" type="number" inputmode="decimal" placeholder="Actual exit price">
    <select id="bt-outcome">
      <option value="target">Hit target</option>
      <option value="stop">Hit stop</option>
      <option value="other">Exited elsewhere</option>
    </select>
    <button data-act="k-commit">Record it</button>
    <button data-act="k-discard" class="danger">Discard — it did not qualify</button>
    <p class="sub">If revealing makes you want to change the entry or stop, that is hindsight.
    Discard it instead. An unclear example is a no-trade and should not be recorded as anything.</p>
  </div>` : '';

  const table = Object.keys(ev).length ? `<table>
    <tr><th>Pattern</th><th>n</th><th>Win%</th><th>Expectancy</th><th>Unlocks</th><th></th></tr>
    ${Object.entries(ev).map(([k, m]) => `<tr>
      <td>${esc(k)}</td><td>${m.n}</td>
      <td>${m.trustworthy ? m.winRate + '%' : '—'}</td>
      <td>${m.trustworthy ? m.expectancy.toFixed(2) + 'R'
        : `<span class="sub">hidden (${r.btTrust} needed)</span>`}</td>
      <td>${m.liveOK ? '<span class="ok">live</span>' : m.paperOK ? 'paper' : `${r.btPaper - m.n} to paper`}</td>
      <td><button data-act="k-browse" data-p="${esc(k)}" class="sub">backtestView</button></td>
    </tr>`).join('')}</table>` : '<p class="sub">No examples marked yet.</p>';

  const flags = [];
  if (integ.dupes) flags.push(`${integ.dupes} duplicate example(s) — same symbol, date and pattern.`);
  if (integ.undated) flags.push(`${integ.undated} example(s) with no symbol or date, from an older version. They cannot be checked for duplicates.`);
  if (integ.instant) flags.push(`${integ.instant} example(s) recorded within 10 seconds of being committed. If the outcome was already visible, the number is not evidence.`);
  if (integ.suspiciousWinRate) flags.push(`Your marked win rate is ${integ.winRate}%. Honest marking rarely produces that. Check whether inconvenient examples are being skipped.`);

  return stageForm + revealForm + `
  <div class="card"><h3>Your measured evidence</h3>${table}
    <p class="sub">${integ.total} example(s) marked in total.</p>
  </div>
  <div class="card"><h3>Integrity</h3>
    ${flags.length ? `<ul class="blocks">${flags.map(f => `<li class="warn">${esc(f)}</li>`).join('')}</ul>`
      : '<p class="ok">Nothing flagged.</p>'}
    <p class="sub">This is the one input the app trusts completely. Everything downstream —
    every unlock, every expectancy number, the ruin probability — is built on these rows.</p>
  </div>`;
}

async function btBrowseView() {
  const rows = await ledger.list(btBrowsing);
  return `<div class="card">
    <button data-act="k-back" class="sub">← Back</button>
    <h2>${esc(btBrowsing)}</h2>
    <p class="sub">${rows.length} example(s). Delete anything entered in error — but not
    because you dislike the result.</p>
    <table><tr><th>Date</th><th>Symbol</th><th>R</th><th></th></tr>
    ${rows.map(x => `<tr>
      <td>${esc(x.date || '—')}</td><td>${esc(x.symbol || '—')}</td>
      <td class="${x.rMultiple > 0 ? 'ok' : 'bad'}">${x.rMultiple}</td>
      <td><button data-act="k-del" data-id="${x.id}" class="danger sub">del</button></td>
    </tr>`).join('')}</table>
  </div>`;
}

export async function backtestHandle(act, ev, render) {
  const D = ev.target.dataset;
  if (act === 'k-browse') { btBrowsing = D.p; return render(); }
  if (act === 'k-back') { btBrowsing = null; return render(); }
  if (act === 'k-del') {
    if (!await confirmToast('Delete this example? Deleting because you dislike the outcome is how a backtest starts lying.', 'Delete')) return;
    await ledger.remove(+D.id); return render();
  }
  if (act === 'k-discard') { await ledger.discard(); btMsg = ''; return render(); }

  if (act === 'k-stage') {
    btMsg = '';
    try {
      await ledger.stage({
        pattern: $('bt-pattern').value, symbol: $('bt-symbol').value,
        date: $('bt-date').value, entry: $('bt-entry').value,
        stop: $('bt-stop').value, target: $('bt-target').value, note: $('bt-note').value
      });
    } catch (e) { btMsg = e.message; }
    return render();
  }

  if (act === 'k-commit') {
    btMsg = '';
    try { await ledger.commit($('bt-exit').value, $('bt-outcome').value); }
    catch (e) { btMsg = e.message; }
    return render();
  }
}

// ===== REPLAY SCREEN =====
// The free TradingView widget shows the whole chart, and "do not scroll right"
// is not a control. Here the future bars are not in the document at all until
// you step forward — and stepping forward is what commits the trade.
let rpMsg = '', rpResult = null, rpImporting = false;

export async function replayView() {
  const list = await RP.seriesInfo();
  const sess = await RP.session();
  const r = await R.rules();

  if (rpImporting || !list.length) return replayImportView(list);
  if (sess) return replaySessionView();

  const names = await ledger.patterns();
  return `
  <div class="card"><h2>Chart replay</h2>
    <p class="sub">Pick a symbol and a pattern. The app drops you at a random bar with
    the future withheld, you write the plan, and only then does it step forward.
    You cannot peek, because the later bars are not loaded until you commit.</p>
    <p class="faint">Daily bars only. Free intraday history does not exist in usable
    form, so intraday setups are still marked by hand from your own charting app.</p>
    ${names.length ? `
      <select id="rp-sym">${list.map(s =>
        `<option value="${esc(s.symbol)}">${esc(s.symbol)} — ${s.n} bars, ${esc(s.from)} to ${esc(s.to)}</option>`).join('')}</select>
      <select id="rp-pat">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select>
      <button data-act="v-start" class="primary">Start at a random bar</button>`
      : '<p class="warn">Pass a unit first — patterns unlock from the units that teach them.</p>'}
    <button data-act="v-import" class="sub">Import more price data</button>
    ${rpMsg ? `<p class="bad">${esc(rpMsg)}</p>` : ''}
  </div>
  <div class="card"><h3>Imported series</h3>
    <ul class="clean">${list.map(s => `<li><div class="rbh">
      <span>${esc(s.symbol)}<div class="faint">${s.n} bars · ${esc(s.from)} → ${esc(s.to)}</div></span>
      <button data-act="v-del" data-s="${esc(s.symbol)}" class="sub">remove</button>
    </div></li>`).join('')}</ul>
  </div>`;
}

function replayImportView(list) {
  return `<div class="card"><h2>Import price data</h2>
    <p class="sub">The app needs daily OHLC data to replay a chart. It is free, but you
    have to fetch it once per symbol.</p>
    <ol class="sub">
      <li>Open a free source that exports CSV — Yahoo Finance (Historical Data →
        Download) works, and NSE publishes daily data too.</li>
      <li>Choose the longest range available. More bars means more setups to find.</li>
      <li>Download the CSV, then load it below.</li>
    </ol>
    <p class="faint">The file needs date, open, high, low and close columns. Volume is
    used if present. Column names are matched loosely, so most exports work unchanged.</p>
    <input id="rp-name" placeholder="Symbol name, e.g. RELIANCE">
    <label class="btn">Choose CSV file<input type="file" id="rp-file" accept=".csv,.txt" hidden></label>
    ${rpMsg ? `<p class="${/imported/i.test(rpMsg) ? 'ok' : 'bad'}">${esc(rpMsg)}</p>` : ''}
    ${list.length ? '<button data-act="v-back" class="sub">← Back</button>' : ''}
  </div>`;
}

async function replaySessionView() {
  const v = await RP.visible();
  if (rpResult) return replayResultView();

  const last = v.bars[v.bars.length - 1];
  return `
  <div class="card">
    <div class="rbh"><h2>${esc(v.symbol)}</h2>
      <span class="pill">${esc(v.pattern)}</span></div>
    <p class="faint">Bar ${v.cursor + 1} of ${v.total} · showing ${esc(last.d)} and the
      ${v.bars.length - 1} bars before it. Everything after is not loaded.</p>
    ${CH.surface('ch-replay', 280)}
    <div class="row">
      <button data-act="v-step" data-n="1" class="sub">+1 bar</button>
      <button data-act="v-step" data-n="5" class="sub">+5</button>
      <button data-act="v-step" data-n="20" class="sub">+20</button>
      <button data-act="v-skip" class="sub">Jump elsewhere</button>
    </div>
    <p class="faint">Stepping forward without a plan is allowed — that is how you search
    for a setup. Once you write a plan, the next step resolves it.</p>
  </div>

  <div class="card">
    <h3>${v.staged ? 'Plan committed' : 'Write the plan'}</h3>
    ${v.staged ? `
      <table>
        <tr><td>Entry</td><td class="num">${v.staged.entry}</td></tr>
        <tr><td>Stop</td><td class="num bad">${v.staged.stop}</td></tr>
        <tr><td>Target</td><td class="num ok">${v.staged.target}</td></tr>
        <tr><td>Written at</td><td class="num">${esc(v.staged.atDate)}</td></tr>
      </table>
      <button data-act="v-resolve" class="primary">Reveal what happened</button>
      <p class="faint">This walks forward bar by bar. Stop and target inside the same
      day counts as a stop — the pessimistic reading, because a daily bar cannot tell
      you which came first.</p>`
    : `
      <p class="sub">Only if the setup genuinely qualifies. Open the Playbook card and
      use the same criteria you would trade. If it is only "sort of there", step past it.</p>
      <div class="grid3">
        <input id="rp-e" type="number" step="0.05" placeholder="Entry">
        <input id="rp-s" type="number" step="0.05" placeholder="Stop">
        <input id="rp-t" type="number" step="0.05" placeholder="Target">
      </div>
      <button data-act="v-stage" class="primary">Commit the plan</button>
      <button data-go="playbook" class="sub">Open the checklist</button>`}
    ${rpMsg ? `<p class="bad">${esc(rpMsg)}</p>` : ''}
    <button data-act="v-quit" class="sub">Abandon this session</button>
  </div>`;
}

async function replayResultView() {
  const x = rpResult;
  const won = x.rMultiple > 0;
  return `
  <div class="card">
    <div class="rbh"><h2>${won ? 'Target' : x.exitReason === 'stop' ? 'Stopped' : 'Timed out'}</h2>
      <span class="pill ${won ? 'ok' : 'bad'}">${x.rMultiple}R</span></div>
    ${CH.surface('ch-replay', 280)}
    <table>
      <tr><td>Entry</td><td class="num">${x.entry}</td><td>Exit</td><td class="num">${x.exit}</td></tr>
      <tr><td>Held</td><td class="num">${x.barsHeld} bars</td><td>Result</td>
        <td class="num ${won ? 'ok' : 'bad'}">${x.rMultiple}R</td></tr>
    </table>
    <p class="faint">Recording this is not optional in spirit. A backtest you edit after
    seeing the outcome measures your memory, not the setup.</p>
    <button data-act="v-save" class="primary">Record this example</button>
    <button data-act="v-again" class="sub">Next setup, same symbol</button>
    ${rpMsg ? `<p class="bad">${esc(rpMsg)}</p>` : ''}
  </div>`;
}

export function replayWire(render) {
  const f = $('rp-file');
  if (f) f.onchange = async () => {
    const name = $('rp-name') ? $('rp-name').value : '';
    if (!f.files[0]) return;
    try {
      const text = await f.files[0].text();
      const res = await RP.importSeries(name, text);
      rpMsg = `${res.symbol} imported — ${res.n} bars from ${res.from} to ${res.to}.`;
      rpImporting = false;
    } catch (e) { rpMsg = e.message; }
    render();
  };
  (async () => {
    const sess = await RP.session();
    if (!sess) return;
    const view = rpResult ? await RP.reveal() : await RP.visible();
    if (!view) return;
    CH.paint({ 'ch-replay': cv => CH.candles(cv, view,
      { revealed: !!rpResult, markAt: rpResult ? view.markAt : null }) });
  })();
}

export async function replayHandle(act, ev, render) {
  const D = ev.target.dataset;
  rpMsg = '';
  try {
    if (act === 'v-import') { rpImporting = true; }
    if (act === 'v-back') { rpImporting = false; }
    if (act === 'v-del') {
      if (!await confirmToast(`Remove ${D.s} price data?`, 'Remove')) return;
      await RP.removeSeries(D.s);
    }
    if (act === 'v-start') {
      await RP.startSession($('rp-sym').value, $('rp-pat').value);
      rpResult = null;
    }
    if (act === 'v-step') await RP.step(+D.n || 1);
    if (act === 'v-skip') {
      const s = await RP.session();
      await RP.startSession(s.symbol, s.pattern);
      rpResult = null;
    }
    if (act === 'v-stage') {
      await RP.stage({ entry: $('rp-e').value, stop: $('rp-s').value, target: $('rp-t').value });
    }
    if (act === 'v-resolve') rpResult = await RP.resolve();
    if (act === 'v-save') {
      const x = rpResult;
      await ledger.stage({ pattern: x.pattern, symbol: x.symbol, date: x.date,
        entry: x.entry, stop: x.stop, target: x.target });
      await ledger.commit(x.exit, x.exitReason === 'timeout' ? 'timeout' : x.exitReason);
      toast(`Recorded ${x.rMultiple}R on ${x.symbol}.`, x.rMultiple > 0 ? 'ok' : '');
      rpResult = null;
      const s = await RP.session();
      await RP.startSession(s.symbol, s.pattern);
    }
    if (act === 'v-again') {
      const s = await RP.session();
      await RP.startSession(s.symbol, s.pattern);
      rpResult = null;
    }
    if (act === 'v-quit') { await RP.endSession(); rpResult = null; }
  } catch (e) { rpMsg = e.message; }
  return render();
}
