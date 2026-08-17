// ui-review.js — OWNS: the Edge, Focus, Mind, Drills and Advanced screens.
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
import { $, esc, rs, toast, confirmToast, empty, tvChart, mountTV, nextActions, banner,
  CONSTITUTION_TEMPLATE } from './ui-core.js';

// ===== EDGE SCREEN =====
let edBO = false;


let edMode = 'live';

// horizontal edBars, works on a narrow screen where vertical axes do not
function edBars(items, fmt = v => v) {
  if (!items.length) return '<p class="sub">No data.</p>';
  const max = Math.max(...items.map(i => Math.abs(i.v)), 0.001);
  return `<div class="edBars">${items.map(i => {
    const w = Math.abs(i.v) / max * 100;
    const neg = i.v < 0;
    return `<div class="bar">
      <div class="bl">${esc(i.k)}</div>
      <div class="bt"><div class="bf ${neg ? 'neg' : 'pos'}" style="width:${w}%"></div></div>
      <div class="bv">${esc(fmt(i.v))}${i.n != null ? `<span class="sub"> n=${i.n}</span>` : ''}</div>
    </div>`;
  }).join('')}</div>`;
}

function edLine(points, label) {
  if (points.length < 2) return '<p class="sub">Need at least 2 closed trades.</p>';
  const W = 320, H = 110;
  const ys = points.map(p => p.y);
  const lo = Math.min(...ys, 0), hi = Math.max(...ys, 0.001);
  const x = i => (i / (points.length - 1)) * W;
  const y = v => H - ((v - lo) / (hi - lo || 1)) * H;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none">
    <edLine x1="0" y1="${y(0)}" x2="${W}" y2="${y(0)}" stroke="#3a3a40"/>
    <path d="${d}" fill="none" stroke="#3b82f6" stroke-width="2"/>
  </svg><p class="sub">${esc(label)} · low ${Math.round(lo)} · high ${Math.round(hi)}</p>`;
}

async function edSliceCard(title, keyFn, note) {
  const rows = await analytics.bySlice(keyFn, edMode);
  if (!rows.length) return '';
  const shown = rows.filter(r => r.trusted);
  const hidden = rows.filter(r => !r.trusted);
  return `<div class="card"><h3>${esc(title)}</h3>
    ${note ? `<p class="sub">${esc(note)}</p>` : ''}
    ${shown.length ? edBars(shown.map(r => ({ k: r.key, v: r.expectancy, n: r.n })), v => v + 'R')
      : '<p class="sub">Nothing has enough trades yet.</p>'}
    ${hidden.length ? `<p class="sub">Hidden — insufficient data: ${
      hidden.map(h => `${esc(h.key)} (${h.n}, needs ${h.need} more)`).join(' · ')}</p>` : ''}
  </div>`;
}

export async function edgeView() {
  const bo = await mind.blackout();
  const setups = await analytics.bySlice(analytics.SLICES.setup, edMode);
  const regimes = await analytics.bySlice(analytics.SLICES.regime, edMode);
  const hours = await analytics.bySlice(analytics.SLICES.hour, edMode);
  const days = await analytics.bySlice(analytics.SLICES.day, edMode);
  const ap = await analytics.adherenceVsProfit(edMode);
  const rd = await analytics.rDistribution(edMode);
  const eqc = await analytics.equityCurve();
  const dds = await analytics.drawdownSeries();
  const rec = await analytics.recommendation();
  const r = await R.rules();
  const pts = (await store.all('trades'))
    .filter(t => t.closed && t.mode === edMode)
    .map(t => ({ r: +t.rMultiple || 0, adherent: !!t.adherent }));

  edBO = bo;
  if (!pts.length)
    return `<div class="card"><div class="row">
        <button data-act="e-mode" data-m="live" class="${edMode === 'live' ? 'sel' : ''}">Live</button>
        <button data-act="e-mode" data-m="paper" class="${edMode === 'paper' ? 'sel' : ''}">Paper</button>
      </div></div>` +
      empty('◐', 'No closed trades yet',
        'The Edge Finder needs your own results. Nothing here is generic advice — every number comes from trades you logged.',
        '<button data-go="journal">Open the journal</button>');

  const bar = (id, rows, note) => rows.length
    ? `${CH.surface(id, 10)}${note ? `<p class="faint">${esc(note)}</p>` : ''}` : '';

  const sliceRows = arr => arr.map(x => ({
    label: x.key, value: x.trusted ? x.expectancy : 0,
    note: x.trusted ? x.expectancy + 'R · n' + x.n : 'n' + x.n + ' — too few',
    muted: !x.trusted
  }));

  return `
  <div class="card flat"><div class="row">
    <button data-act="e-mode" data-m="live" class="${edMode === 'live' ? 'sel' : ''}">Live</button>
    <button data-act="e-mode" data-m="paper" class="${edMode === 'paper' ? 'sel' : ''}">Paper</button>
    <button data-act="e-blackout" class="sub">${bo ? 'Show rupees' : 'Hide rupees'}</button>
  </div></div>

  <div class="card"><h2>Rule-following against result</h2>
    <p class="sub">The most persuasive chart here. If the right column sits higher,
    your rules are the edge. If it does not, either the rules or the setups are wrong —
    and that is a finding, not a failure.</p>
    ${CH.surface('ch-scatter', 190)}
    <table>
      <tr><th></th><th class="num">Trades</th><th class="num">Expectancy</th></tr>
      <tr><td class="ok">Rules followed</td><td class="num">${ap.adherent.n || 0}</td>
        <td class="num">${ap.adherent.n ? ap.adherent.expectancy + 'R' : '—'}</td></tr>
      <tr><td class="bad">Rules broken</td><td class="num">${ap.broken.n || 0}</td>
        <td class="num">${ap.broken.n ? ap.broken.expectancy + 'R' : '—'}</td></tr>
    </table>
  </div>

  <div class="card"><h2>Equity — trading versus deposits</h2>
    ${CH.surface('ch-equity', 180)}
    <div class="legend">
      <span><i style="background:${eqc.tradingPnl >= 0 ? '#4ade80' : '#f87171'}"></i>Made by trading</span>
      <span><i style="background:#63636b"></i>Balance including deposits</span>
    </div>
    <table>
      <tr><td>Made by trading</td><td class="num ${eqc.tradingPnl >= 0 ? 'ok' : 'bad'}">${bo ? '•••' : rs(eqc.tradingPnl)}</td></tr>
      <tr><td>Added by deposits</td><td class="num">${bo ? '•••' : rs(eqc.deposited)}</td></tr>
    </table>
    <p class="faint">Most retail traders think they are profitable because the balance grew.
    It grew from salary. These two lines are kept apart for that reason.</p>
  </div>

  <div class="card"><h2>Drawdown</h2>
    ${CH.surface('ch-dd', 150)}
    <p class="faint">Measured on trading performance only — deposits cannot flatter it.</p>
  </div>

  <div class="card"><h2>R distribution</h2>
    ${CH.surface('ch-rdist', 165)}
    <p class="faint">A tall bar at +1R with little beyond it means winners are being cut short.</p>
  </div>

  <div class="card"><h2>Expectancy by setup</h2>
    <p class="sub">Nothing is scored below ${r.minTagSample} trades on a tag. Grey bars are
    samples too small to trust — shown so you know they exist, not so you can act on them.</p>
    ${bar('ch-setups', setups)}
  </div>

  <div class="card"><h2>By market regime</h2>${bar('ch-regime', regimes)}</div>
  <div class="card"><h2>By hour entered</h2>${bar('ch-hour', hours,
    'The 11:30–13:30 bleed shows up here if you have it.')}</div>
  <div class="card"><h2>By day of week</h2>${bar('ch-day', days)}</div>

  ${rec ? `<div class="card"><h2>This month's reading</h2>
    <p>${esc(rec)}</p></div>` : ''}`;
}

// Canvases have no size until they are in the document, so drawing happens
// after render rather than during it.
function homeWire(render) {
  (async () => {
    const c = (await analytics.equityCurve()).curve;
    CH.paint({ 'ch-home-eq': cv => CH.equity(cv, c) });
  })();
}

export function edgeWire(render) {
  (async () => {
    const setups = await analytics.bySlice(analytics.SLICES.setup, edMode);
    const regimes = await analytics.bySlice(analytics.SLICES.regime, edMode);
    const hours = await analytics.bySlice(analytics.SLICES.hour, edMode);
    const days = await analytics.bySlice(analytics.SLICES.day, edMode);
    const rd = await analytics.rDistribution(edMode);
    const eqc = await analytics.equityCurve();
    const dds = await analytics.drawdownSeries();
    const r = await R.rules();
    const pts = (await store.all('trades'))
      .filter(t => t.closed && t.mode === edMode)
      .map(t => ({ r: +t.rMultiple || 0, adherent: !!t.adherent }));
    const rows = arr => arr.map(x => ({
      label: x.key, value: x.trusted ? x.expectancy : 0,
      note: x.trusted ? x.expectancy + 'R · n' + x.n : 'n' + x.n + ' — too few',
      muted: !x.trusted
    }));
    const buckets = rd.buckets.map((b, i) => ({
      label: b, n: rd.counts[i], from: b.startsWith('<') || b.startsWith('-') ? -1 : 1
    }));
    CH.paint({
      'ch-scatter': cv => CH.scatter(cv, pts),
      'ch-equity': cv => CH.equity(cv, eqc.curve),
      'ch-dd': cv => CH.drawdown(cv, dds, r.drawdownTrigger),
      'ch-rdist': cv => CH.rHistogram(cv, buckets),
      'ch-setups': cv => CH.bars(cv, rows(setups)),
      'ch-regime': cv => CH.bars(cv, rows(regimes)),
      'ch-hour': cv => CH.bars(cv, rows(hours)),
      'ch-day': cv => CH.bars(cv, rows(days))
    });
  })();
}

export async function edgeHandle(act, ev, render) {
  if (act === 'e-edMode') { edMode = ev.target.dataset.m; return render(); }
  if (act === 'e-dep') {
    const a = +$('dep-amt').value;
    if (!a) return;
    await analytics.addDeposit(a, $('dep-note').value);
    return render();
  }
  if (act === 'e-mc') {
    const p = await ledger.profile();
    const pct = await ledger.riskPct(p);
    const r = await analytics.monteCarlo(p.capital, pct);
    $('mc').innerHTML = r.ready
      ? `<p class="${r.ruinPct > 5 ? 'bad' : 'ok'}">Chance of losing half your capital: ${r.ruinPct}%</p>
         <p class="sub">Over 250 trades, resampling your own results. Bad 10%: ${rs(r.p10)} ·
         median ${rs(r.median)} · good 10%: ${rs(r.p90)}</p>`
      : `<p class="sub">Hidden until 100 closed live trades — ${r.need} to go.
         A ruin probability computed from 12 trades is a made-up number that looks authoritative.</p>`;
  }
}

// ===== FOCUS SCREEN =====
// Most profitable traders end up running one or two setups. This screen finds
// which ones are his, using his own data, and then makes trading outside them a
// deliberate act rather than a casual one.
let fcPicked = null, fcMastery = null, fcMsg = '';

export async function focusView() {
  const v = await spec.verdict();
  const c = await spec.core();
  const ex = await spec.explorationStatus();
  const rev = await spec.revalidation();
  const cve = await analytics.coreVsExploration();

  if (fcMastery) return focusMasteryView();

  if (!v.ready) {
    return `<div class="card"><h2>Finding your strong zone</h2>
      <p class="sub">Profitable traders end up running one or two setups, not twelve.
      This screen works out which ones are yours — but only from enough of your own
      trades that the answer is not just a lucky run.</p>
      <div class="rb"><div class="rbh"><span>Live trades logged</span>
        <span class="${v.total >= v.needTotal ? 'ok' : ''}">${v.total}/${v.needTotal}</span></div>
        <div class="bt"><div class="bf ${v.total >= v.needTotal ? 'pos' : 'part'}"
          style="width:${Math.min(100, Math.round(v.total / v.needTotal * 100))}%"></div></div></div>
      <div class="rb"><div class="rbh"><span>Setups with ${v.perSetup}+ trades each</span>
        <span class="${v.covered >= v.needCovered ? 'ok' : ''}">${v.covered}/${v.needCovered}</span></div>
        <div class="bt"><div class="bf ${v.covered >= v.needCovered ? 'pos' : 'part'}"
          style="width:${Math.min(100, Math.round(v.covered / v.needCovered * 100))}%"></div></div></div>
      ${v.thin.length ? `<p class="sub">Not yet enough evidence on: ${
        v.thin.map(t => `${esc(t.setup)} (${t.n})`).join(' · ')}</p>` : ''}
      <p class="faint">Separately, a setup needs ${v.coreMin} live trades of its own before it
      can be chosen as core — the same bar the Edge Finder uses before it prints any number.
      Ranking is informational; choosing is a commitment.</p>
      <p class="sub">Narrowing before this point is not specialising, it is reacting to variance.
      Keep trading your full approved list until the bar is met.</p>
    </div>`;
  }

  const rows = v.ranked.map((x, i) => {
    const picked = (fcPicked || (c && c.setups) || []).includes(x.setup);
    return `<div class="card">
      <div class="rbh"><h3>${i + 1}. ${esc(x.setup)}</h3>
        ${x.choosable
          ? `<button data-act="f-pick" data-s="${esc(x.setup)}" class="${picked ? 'sel' : ''}">${picked ? 'chosen' : 'choose'}</button>`
          : `<span class="pill warn">${x.shortBy} more to qualify</span>`}</div>
      <table>
        <tr><td>Expectancy</td><td class="${x.expectancy > 0 ? 'ok' : 'bad'}">${x.expectancy}R</td>
            <td>Rule-following</td><td class="${x.adherence >= 88 ? 'ok' : x.adherence >= 80 ? 'warn' : 'bad'}">${x.adherence}%</td></tr>
        <tr><td>Worst run</td><td>${x.worstRunR}R</td>
            <td>Emotional cost</td><td class="${x.emotionalCost >= 1.2 ? 'warn' : ''}">${x.emotionalCost}</td></tr>
        <tr><td>Win rate</td><td>${x.winRate}%</td><td>Sample</td><td>n=${x.n}</td></tr>
      </table>
      ${(v.notes[x.setup] || []).map(n => `<p class="warn sub">${esc(n)}</p>`).join('')}
      ${c && c.setups.includes(x.setup) ? `<button data-act="f-mastery" data-s="${esc(x.setup)}" class="sub">deeper analysis</button>` : ''}
    </div>`;
  }).join('');

  const chosen = fcPicked || [];
  const chooser = `<div class="card">
    <h3>${c ? 'Change your core setups' : 'Choose your core setups'}</h3>
    <p class="sub">One to three, each with at least ${v.coreMin} live trades of its own.
    Everything else becomes an exploration trade — budgeted at
    ${Math.round(spec.EXPLORATION_BUDGET * 100)}% of your trades and kept out of your
    core statistics.</p>
    ${v.nearest && v.nearest.length ? `<p class="faint">Closest to qualifying: ${
      v.nearest.map(n => `${esc(n.setup)} needs ${n.short} more`).join(' · ')}</p>` : ''}
    <p>${chosen.length ? chosen.map(esc).join(' · ') : '<span class="sub">nothing selected</span>'}</p>
    <input id="f-reason" placeholder="If choosing against the ranking, why? (20+ characters)">
    <button data-act="f-save">${c ? 'Update core' : 'Set as my core'}</button>
    <p class="bad" id="f-msg">${esc(fcMsg)}</p>
    <p class="sub">This is a recommendation, not an instruction. Choosing against your own
    numbers is allowed — it just goes on the record with your reason, so future you can see
    what past you decided and why.</p>
  </div>`;

  const current = c ? `<div class="card"><h2>Your core</h2>
    <p class="ok">${c.setups.map(esc).join(' · ')}</p>
    <p class="sub">Chosen ${new Date(c.chosenAt).toLocaleDateString('en-IN')}
      ${c.overrode ? '· against the ranking' : '· following the ranking'}</p>
    ${c.overrode && c.reason ? `<p class="sub">Your reason: "${esc(c.reason)}"</p>` : ''}
    ${c.passedOver && c.passedOver.length ? `<p class="warn sub">You passed over: ${
      c.passedOver.map(p => `${esc(p.setup)} (score ${p.score})`).join(', ')}</p>` : ''}
    ${ex.active ? `<p>Exploration used ${ex.used}/${ex.allowed} trades
      ${ex.overBudget ? '<span class="bad">— budget exhausted, off-core trades are blocked</span>'
                      : `<span class="sub">— ${ex.remaining} remaining</span>`}</p>` : ''}
    ${cve && cve.core.n ? `<table>
      <tr><th></th><th>n</th><th>Expectancy</th><th>Rules</th></tr>
      <tr><td>Core</td><td>${cve.core.n}</td><td class="${cve.core.expectancy > 0 ? 'ok' : 'bad'}">${cve.core.expectancy}R</td><td>${cve.core.adherence}%</td></tr>
      <tr><td>Exploration</td><td>${cve.exploration.n || 0}</td>
        <td>${cve.exploration.n ? cve.exploration.expectancy + 'R' : '—'}</td>
        <td>${cve.exploration.n ? cve.exploration.adherence + '%' : '—'}</td></tr>
    </table>` : ''}
    ${rev && rev.due ? `<p class="warn">Due for re-validation — chosen ${rev.daysSince} days ago.</p>` : ''}
    ${rev && rev.drifted.length ? `<div>${rev.drifted.map(d =>
      `<p class="bad">${esc(d.setup)}: ${esc(d.why)} (was ${d.was}, now ${d.now}).</p>`).join('')}
      <p class="sub">A core setup that stops working stops being core. Re-choose below.</p></div>` : ''}
  </div>` : '';

  return current + `<div class="card"><h2>Your setups, ranked</h2>
    <p class="sub">Scored on four axes, not just profit: expectancy, rule-following,
    emotional cost, and the worst run each produced. A setup can make money and still
    be wrong for you if the only way you trade it is by breaking your own rules.</p>
  </div>` + rows + chooser;
}

async function focusMasteryView() {
  const m = await spec.mastery(fcMastery);
  if (!m.ready) return `<div class="card"><button data-act="f-back" class="sub">← Back</button>
    <p class="sub">Only ${m.n} trades on this setup. ${m.need} needed before the breakdown means anything.</p></div>`;
  const tbl = (title, rows, note) => `<h3>${esc(title)}</h3>
    ${note ? `<p class="sub">${esc(note)}</p>` : ''}
    <table>${rows.map(r => `<tr><td>${esc(r.key)}</td>
      <td class="${r.expectancy > 0 ? 'ok' : 'bad'}">${r.expectancy}R</td>
      <td class="sub">n=${r.n}</td></tr>`).join('')}</table>`;
  return `<div class="card">
    <button data-act="f-back" class="sub">← Back</button>
    <h2>${esc(m.setup)}</h2>
    <p class="sub">${m.n} trades. Narrow data beats broad data — this is the analysis
    that is worth acting on, because it is all one thing.</p>
    <table>
      <tr><td>Average win</td><td class="ok">${m.avgWinR}R</td>
          <td>Average loss</td><td class="bad">${m.avgLossR}R</td></tr>
      <tr><td>Stopped out</td><td>${m.stoppedOut}%</td>
          <td>Discretionary exits</td><td class="${m.discretionary > 25 ? 'warn' : ''}">${m.discretionary}%</td></tr>
      ${m.avgHoldHours !== null ? `<tr><td>Average hold</td><td colspan="3">${m.avgHoldHours} hours</td></tr>` : ''}
    </table>
    ${m.discretionary > 25 ? '<p class="warn">Over a quarter of your exits are discretionary. Your edge on this setup is being decided by improvisation, not by your plan.</p>' : ''}
    ${tbl('By market regime', m.byRegime, 'The condition a setup needs is usually narrower than you think.')}
    ${tbl('By day of week', m.byDay)}
    ${tbl('By hour entered', m.byHour)}
    ${tbl('By confidence', m.byConfidence, 'If your high-confidence trades underperform, confidence is a contrarian indicator.')}
  </div>`;
}

export async function focusHandle(act, ev, render) {
  const D = ev.target.dataset;
  if (act === 'f-back') { fcMastery = null; return render(); }
  if (act === 'f-mastery') { fcMastery = D.s; return render(); }
  if (act === 'f-pick') {
    const c = await spec.core();
    const cur = fcPicked || (c ? [...c.setups] : []);
    const i = cur.indexOf(D.s);
    if (i >= 0) cur.splice(i, 1); else cur.push(D.s);
    fcPicked = cur; fcMsg = '';
    return render();
  }
  if (act === 'f-save') {
    const c = await spec.core();
    const chosen = fcPicked || (c ? c.setups : []);
    try {
      await spec.chooseCore(chosen, $('f-reason') ? $('f-reason').value : '');
      fcPicked = null; fcMsg = '';
    } catch (e) { fcMsg = e.message; }
    return render();
  }
}


// ===== PSYCH SCREEN =====
export async function mindView() {
  const st = await mind.todayState();
  const flags = await mind.tilt();
  const c = await mind.constitution();
  const am = await mind.amendments();
  const ov = await mind.overrideHistory();
  const p = await ledger.profile();
  const dd = await ledger.drawdownPct(p);
  const isSunday = new Date().getDay() === 0;

  const gate = st ? `
    <p class="${st.blocked ? 'bad' : 'ok'}">
      ${st.blocked ? 'TRADING BLOCKED TODAY — ' + esc(st.reasons.join('; ')) : 'Cleared to trade today.'}
    </p>
    <p class="sub">Sleep ${st.sleep}h · stress ${st.stress}/5 · money pressure ${st.needMoney ? 'YES' : 'no'}</p>
    ${st.override ? `<p class="warn">Overridden with a ${st.override.words}-word justification. This appears in your monthly review.</p>` : ''}
    ${st.blocked ? `<textarea id="ov-text" rows="6" placeholder="100 words minimum. Why is trading today worth more than the rule you wrote for yourself?"></textarea>
      <button data-act="p-override">Override the gate</button><p class="bad" id="ov-msg"></p>` : ''}
    <button data-act="p-relog" class="sub">Re-log state</button>`
    : `<div class="grid">
      <input id="s-sleep" type="number" step="0.5" inputmode="decimal" placeholder="Sleep (hours)">
      <input id="s-stress" type="number" min="1" max="5" placeholder="Stress 1–5">
    </div>
    <input id="s-phys" placeholder="Physical state (ill, tired, fine…)">
    <input id="s-str" placeholder="Life stressors right now">
    <label class="tune" style="justify-content:flex-start;gap:8px">
      <input id="s-money" type="checkbox" style="width:20px;margin:0">
      Do I need money from this account this month?</label>
    <button data-act="p-state">Log state</button>
    <p class="bad" id="s-msg"></p>
    <p class="sub">Under 5 hours sleep, stress 4+, or money pressure blocks trading for the day.
    A blocked day never counts against you in a trial.</p>`;

  const tiltBox = flags.length
    ? `<ul class="blocks">${flags.map(f =>
        `<li class="${f.hard ? 'bad' : 'warn'}">${f.hard ? 'BLOCK' : 'WARNING'} — ${esc(f.msg)}</li>`).join('')}</ul>`
    : '<p class="ok">No tilt signals.</p>';

  return `
  <div class="card"><h2>Pre-market state gate</h2>${gate}</div>

  <div class="card"><h2>Tilt</h2>${tiltBox}
    <p class="sub">Watching: 2 losses in 45 min · 3 wins in a row · re-entry within 5 min of an exit.</p>
  </div>

  <div class="card"><h2>The Trading Constitution</h2>
    <p class="sub">Your rules, in your words. The app enforces them.
    Amendable on Sundays only, never in drawdown. Today is ${isSunday ? 'Sunday — you may amend.' : 'not Sunday.'}
    ${dd >= 5 ? ` Current drawdown ${dd}%.` : ''}</p>
    <textarea id="c-text" rows="14" ${isSunday ? '' : 'disabled'}>${esc(c.text || (isSunday ? CONSTITUTION_TEMPLATE : ''))}</textarea>
    ${!c.text && !isSunday ? '<p class="sub">A starting template loads on Sunday. Edit every line — rules you did not choose are rules you will not keep.</p>' : ''}
    ${isSunday ? `<input id="c-reason" placeholder="Reason for this amendment (20+ chars)">
      <button data-act="p-amend">Amend</button><p class="bad" id="c-msg"></p>` : ''}
    <p class="sub">${c.updated ? 'Last changed ' + new Date(c.updated).toLocaleDateString('en-IN') : 'Never written.'}
     · ${am.length} amendment(s) logged.</p>
    ${am.length ? `<table><tr><th>When</th><th>Reason</th></tr>
      ${am.slice(-8).reverse().map(a => `<tr><td>${new Date(a.at).toLocaleDateString('en-IN')}</td>
      <td>${esc(a.reason)}</td></tr>`).join('')}</table>
      <p class="sub">Loosening rules after every loss is the pattern to watch for here.</p>` : ''}
  </div>

  ${ov.length ? `<div class="card"><h3>Gate overrides</h3>
    <p class="warn">${ov.length} time(s) you talked yourself past the pre-market gate.</p>
    <table>${ov.slice(-6).reverse().map(o => `<tr><td>${o.date}</td><td class="sub">${esc(o.text.slice(0, 90))}…</td></tr>`).join('')}</table>
  </div>` : ''}`;
}

export async function mindHandle(act, ev, render) {
  if (act === 'p-state') {
    const msg = $('s-msg');
    const sleep = +$('s-sleep').value, stress = +$('s-stress').value;
    if (!sleep || !stress) { msg.textContent = 'Sleep hours and stress are both required.'; return; }
    await mind.logState({ sleep, stress, physical: $('s-phys').value,
      stressors: $('s-str').value, needMoney: $('s-money').checked });
    return render();
  }
  if (act === 'p-relog') {
    const log = await (await import('./db.js')).get('stateLog', {});
    delete log[new Date().toISOString().slice(0, 10)];
    await (await import('./db.js')).set('stateLog', log);
    return render();
  }
  if (act === 'p-override') {
    try { await mind.override($('ov-text').value); return render(); }
    catch (e) { $('ov-msg').textContent = e.message; }
    return;
  }
  if (act === 'p-amend') {
    const p = await ledger.profile();
    const dd = await ledger.drawdownPct(p);
    try { await mind.amend($('c-text').value, $('c-reason').value, dd >= 5); return render(); }
    catch (e) { $('c-msg').textContent = e.message; }
  }
}

// ===== DRILLS SCREEN =====
export async function drillsView() {
  const mb = await analytics.monthlyBrief();
  const mDue = await analytics.monthlyDue();
  const mCur = await analytics.currentMonthly();
  const s = await mind.drillsState();
  const bo = await mind.blackout();
  const block = await mind.reviewBlock();
  const all = await mind.reviews();
  const done = Object.keys(all).length;

  const cards = mind.DRILLS.map(d => {
    const st = s[d.id] || { count: 0, attempts: 0, passedOn: null };
    const pct = Math.min(100, Math.round(st.count / d.target * 100));
    return `<div class="card">
      <h3>${esc(d.name)} ${st.passedOn ? '<span class="ok">✓</span>' : ''}</h3>
      <p class="sub">${esc(d.tests)} · ${esc(d.how)}</p>
      <div class="bt"><div class="bf pos" style="width:${pct}%"></div></div>
      <p>${st.count}/${d.target} ${esc(d.unit)} · ${st.attempts} attempt(s)</p>
      <div class="row">
        <button data-act="d-pass" data-id="${d.id}">Passed a rep</button>
        <button data-act="d-fail" data-id="${d.id}" class="danger">Failed — reset</button>
      </div>
    </div>`;
  }).join('');

  const monthly = `<div class="card"><h2>Monthly review — ${esc(mb.month)}</h2>
    ${mCur ? '<p class="ok">Submitted.</p>' : mDue ? `<p class="warn">${esc(mDue)}</p>` : ''}
    <p class="sub">Computed for you, so you confront the numbers rather than your memory of them.</p>
    <table>
      <tr><td>Made by trading</td><td class="${mb.tradingPnl >= 0 ? 'ok' : 'bad'}">₹${mb.tradingPnl.toLocaleString('en-IN')}</td></tr>
      <tr><td>Added by deposits</td><td>₹${mb.deposited.toLocaleString('en-IN')}</td></tr>
      <tr><td>Max drawdown</td><td>${mb.maxDD}%</td></tr>
      <tr><td>Rules followed</td><td>${mb.adherence.adherent.n || 0} trades ${mb.adherence.adherent.n ? '@ ' + mb.adherence.adherent.expectancy + 'R' : ''}</td></tr>
      <tr><td>Rules broken</td><td class="${mb.adherence.broken.n ? 'bad' : ''}">${mb.adherence.broken.n || 0} trades ${mb.adherence.broken.n ? '@ ' + mb.adherence.broken.expectancy + 'R' : ''}</td></tr>
      <tr><td>Violations (30d)</td><td class="${mb.violations ? 'bad' : ''}">${mb.violations} ${mb.violationTypes.length ? '(' + mb.violationTypes.map(esc).join(', ') + ')' : ''}</td></tr>
      <tr><td>Gate overrides (30d)</td><td class="${mb.overrides ? 'warn' : ''}">${mb.overrides}</td></tr>
      <tr><td>Constitution changes (30d)</td><td>${mb.amendments}</td></tr>
    </table>
    ${mb.amendWarning ? `<p class="bad">${esc(mb.amendWarning)}</p>` : ''}
    ${mb.setups.length ? `<h3>Expectancy by setup</h3><table>
      ${mb.setups.map(s => `<tr><td>${esc(s.key)}</td><td class="${s.expectancy > 0 ? 'ok' : 'bad'}">${s.expectancy}R</td><td class="sub">n=${s.n}</td></tr>`).join('')}
      </table>` : '<p class="sub">No setup has enough trades to show a number yet.</p>'}
    ${mb.hiddenSetups ? `<p class="sub">${mb.hiddenSetups} setup(s) hidden — insufficient sample.</p>` : ''}
    ${mb.recommendation ? `<p class="warn">${esc(mb.recommendation)}</p>` : ''}
    <p class="sub">${esc(mb.projection)}</p>
    <input id="m-keep" placeholder="Which setups am I keeping, and on what evidence?">
    <input id="m-susp" placeholder="Which am I suspending for 60 days?">
    <input id="m-cap" placeholder="Capital plan: deposits, withdrawals, changes">
    <input id="m-leak" placeholder="My single biggest leak this month">
    <button data-act="d-monthly">Submit monthly review</button>
    <p class="bad" id="m-msg"></p>
  </div>`;

  return `
  ${monthly}
  <div class="card"><h2>Weekly review</h2>
    ${block ? `<p class="bad">${esc(block)}</p>` : '<p class="ok">Review is up to date.</p>'}
    <input id="r-viol" placeholder="Violations this week (write 'none' if none)">
    <input id="r-best" placeholder="Best trade BY PROCESS — not by profit">
    <input id="r-worst" placeholder="Worst trade by process">
    <input id="r-fix" placeholder="One thing to fix next week">
    <button data-act="d-review">Submit review</button>
    <p class="bad" id="r-msg"></p>
    <p class="sub">${done} review(s) submitted. Monday trading stays locked until Sunday's is in.</p>
  </div>

  <div class="card"><h2>Blackout mode</h2>
    <p class="sub">Hides P&L everywhere. Process is the headline number; money is a distraction for the first 90 days.</p>
    <button data-act="d-blackout" class="${bo ? 'sel' : ''}">${bo ? 'Blackout ON' : 'Blackout OFF'}</button>
  </div>

  <div class="card"><h2>The seven drills</h2>
    <p class="sub">Self-reported. Nothing here can verify you — lying only costs you.
    Each is a streak: a failure resets the count to zero.</p>
  </div>
  ${cards}`;
}

export async function drillsHandle(act, ev, render) {
  if (act === 'd-pass' || act === 'd-fail') {
    await mind.logRep(ev.target.dataset.id, act === 'd-pass');
    return render();
  }
  if (act === 'd-blackout') { await mind.setBlackout(!(await mind.blackout())); return render(); }
  if (act === 'd-monthly') {
    try {
      await analytics.submitMonthly({ keeping: $('m-keep').value, suspending: $('m-susp').value,
        capitalPlan: $('m-cap').value, biggestLeak: $('m-leak').value });
      return render();
    } catch (e) { $('m-msg').textContent = e.message; }
    return;
  }
  if (act === 'd-review') {
    try {
      await mind.submitWeekly({
        violations: $('r-viol').value.trim(), best: $('r-best').value.trim(),
        worst: $('r-worst').value.trim(), fix: $('r-fix').value.trim()
      });
      return render();
    } catch (e) { $('r-msg').textContent = e.message; }
  }
}

// ===== ADVANCED (PHASE 4) SCREEN =====
// Three different ways to take on more risk. None of them is a promotion, and
// the screen says so before it says anything else.
let advOpen = null, advMsg = '';

export async function advancedView() {
  const p = await ledger.profile();
  const proto = await R.adjustmentProtocol();

  const cards = [];
  for (const key of ['4A', '4B', '4C']) {
    const s = await R.phase4Status(key);
    const capOK = p.capital >= s.minCapital;
    cards.push(`<div class="card">
      <h3>${key} — ${esc(s.name)}</h3>
      <p class="warn sub">${esc(s.warning)}</p>
      <table>
        <tr><td>Minimum capital</td><td class="${capOK ? 'ok' : 'bad'}">₹${s.minCapital.toLocaleString('en-IN')}${capOK ? '' : ` — short ₹${(s.minCapital - p.capital).toLocaleString('en-IN')}`}</td></tr>
        <tr><td>Trial</td><td>${s.days} days · ${s.trades} trades</td></tr>
      </table>
      <ul class="blocks">${s.checks.map(c =>
        `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✓' : '○'} ${esc(c.t)}</li>`).join('')}</ul>
      ${s.definedRiskUntil ? `<p class="sub">Defined risk only until ${s.definedRiskUntil} logged
        expiry-day trades — you have ${s.expiryTrades}.</p>` : ''}
      ${p.phase < 4 ? '<p class="sub">Phase 3 must pass first.</p>'
        : (s.ok && capOK ? `<button data-act="a-start" data-k="${key}">Start the ${key} trial</button>`
                         : '<p class="sub">Requirements above are not met.</p>')}
    </div>`);
  }

  return `<div class="card"><h2>Phase 4 — Advanced</h2>
    <p class="sub">Three separate trials, each after Phase 3 passes. None of them is a promotion.
    They are three different ways to take on more risk, and the honest position is that most
    people should stop after Phase 2 or Phase 3 and get very good at one thing instead.</p>
    <p class="sub">If your equity numbers are strong and options never produce an edge for you,
    trading equity and dropping options is the correct answer, not a failure.</p>
  </div>
  <div class="card"><h3>Adjustment protocol</h3>
    <p class="sub">Required before any undefined-risk trade. Write what you will do at each
    threshold — when you adjust, when you exit, and what you will not do. 200 characters minimum,
    because a protocol you have not written out in full is one you do not have when it matters.</p>
    <textarea id="a-proto" rows="8" placeholder="At what loss do I exit? At what price is the position no longer the trade I opened? What am I forbidding myself from doing?">${esc(proto ? proto.text : '')}</textarea>
    <button data-act="a-proto">Save protocol</button>
    <p class="bad" id="a-msg">${esc(advMsg)}</p>
    ${proto ? `<p class="sub">Written ${new Date(proto.at).toLocaleDateString('en-IN')}.</p>` : ''}
  </div>` + cards.join('');
}

export async function advancedHandle(act, ev, render) {
  if (act === 'a-proto') {
    try { await R.saveAdjustmentProtocol($('a-proto').value); advMsg = ''; }
    catch (e) { advMsg = e.message; }
    return render();
  }
  if (act === 'a-start') {
    try { await ledger.startTrial('options'); } catch (e) { toast(e.message, 'bad'); }
    return render();
  }
}

