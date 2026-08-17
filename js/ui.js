// ui.js — OWNS: every screen's DOM. Rendering only: reads through the logic
// modules, never touches storage directly. One file because rendering is one
// concern; each screen is fenced in its own section.
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


const $ = id => document.getElementById(id);

// ===== TOASTS =====
// alert() blocks the thread and looks like a browser error rather than part of
// the app. Every message and confirmation goes through here instead.
export function toast(msg, kind = '') {
  if (typeof document === 'undefined') return;
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 4200);
}

export function confirmToast(msg, confirmLabel = 'Confirm') {
  return new Promise(resolve => {
    if (typeof document === 'undefined') return resolve(false);
    const box = document.getElementById('toasts');
    if (!box) return resolve(false);
    const t = document.createElement('div');
    t.className = 'toast warn';
    t.innerHTML = `<div></div><div class="row">
      <button class="danger"></button><button class="sub">Cancel</button></div>`;
    t.firstChild.textContent = msg;
    const [yes, no] = t.querySelectorAll('button');
    yes.textContent = confirmLabel;
    const done = v => { t.remove(); resolve(v); };
    yes.onclick = () => done(true);
    no.onclick = () => done(false);
    box.appendChild(t);
  });
}

export const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

// Every screen needs a designed empty state. Raw text where content should be
// reads as a bug, not as an absence.
function empty(icon, title, detail, action) {
  return `<div class="card"><div class="empty">
    <div class="ico">${icon}</div>
    <div class="t">${esc(title)}</div>
    <div class="d">${esc(detail)}</div>
    ${action ? `<div class="row" style="justify-content:center;margin-top:14px">${action}</div>` : ''}
  </div></div>`;
}


// A TradingView chart embed. Used ONLY where a live chart helps and cannot
// enable dishonesty: the journal (a trade you are about to take now) and the
// day screen. Deliberately NOT on the backtest or replay screens, where a
// scrollable full-history chart would defeat the entire mechanism.
function tvChart(symbol, id, height = 320) {
  const sym = String(symbol || '').trim().toUpperCase().replace(/[^A-Z0-9:_-]/g, '');
  if (!sym) return '';
  const full = sym.includes(':') ? sym : 'NSE:' + sym;
  return `<div class="tvwrap" id="${id}" data-tv="${esc(full)}" data-h="${height}">
    <div class="tvload">Loading ${esc(full)}…</div></div>
    <p class="faint">Live chart from TradingView. Data may be delayed.</p>`;
}

// Iframes are built after render, so a failed embed never blocks the screen.
function mountTV() {
  for (const el of document.querySelectorAll('[data-tv]')) {
    if (el.dataset.mounted) continue;
    el.dataset.mounted = '1';
    const f = document.createElement('iframe');
    const q = new URLSearchParams({
      symbol: el.dataset.tv, interval: 'D', theme: 'dark', style: '1',
      locale: 'in', hide_side_toolbar: '1', allow_symbol_change: '0',
      save_image: '0', hide_volume: '0'
    });
    f.src = 'https://s.tradingview.com/widgetembed/?' + q.toString();
    f.style.cssText = `width:100%;height:${el.dataset.h}px;border:0;border-radius:10px;background:#0e0e10`;
    f.loading = 'lazy';
    f.referrerPolicy = 'origin';
    f.onload = () => { const l = el.querySelector('.tvload'); if (l) l.remove(); };
    el.appendChild(f);
  }
}

const rs = n => (n < 0 ? '\u2212\u20b9' : '\u20b9') + Math.abs(Math.round(n)).toLocaleString('en-IN');

// ===== ONBOARDING CONTENT & THE NEXT-ACTION ENGINE =====

// Constitution starting template. Imports db + ledger + learn + backtest.





const seen = () => store.get('onboarded', false);
const markSeen = () => store.set('onboarded', true);

// ---------- what this is ----------
const WHAT_IT_IS = [
  'This app does not tell you what to buy. It decides whether you are allowed to trade yet, and it makes lying to yourself expensive.',
  'The logic is one sentence: learning is free, trading is earned. Every lesson is open from day one, in any order. Live money is not.',
  'The chain is fixed. Read a unit and answer its questions correctly. That unlocks the chart patterns the unit teaches. Mark 30 real historical examples of a pattern — writing down entry and stop BEFORE you look at what happened — and that unlocks paper trading it. Sixty examples with a positive result unlocks live money.',
  'Once you are trading, every trade needs a written plan first, timestamped so you cannot write it afterwards and invent calm reasoning you never had. Your broker\'s own records get checked against your journal.',
  'And it can take permission away. If your rule-following drops below 80%, or you take trades outside your plan, or your account falls 12% from its peak, you go back to paper trading for 15 days. Certification is a lease, not a deed.'
];

const WHAT_IT_WONT_DO = [
  'It will not prevent losses. Losses are part of trading, not a malfunction.',
  'It will not make you profitable quickly, and it cannot honestly say how long this takes. No reliable data exists.',
  'It cannot certify that you are psychologically ready. It measures behaviour, and only after real money has been at risk.',
  'It cannot prove your journal entries are sincere — only that they were written before the trade.',
  'Three separate SEBI studies found roughly 9 out of 10 individual F&O traders lose money, and over 75% of the losers kept trading anyway. This app exists to interrupt that behaviour. It cannot promise you will be the exception.'
];

const HOW_MARKING_WORKS = [
  'This is the part people get wrong, and getting it wrong quietly ruins every number the app shows you afterwards.',
  'You are not marking the examples where the pattern WORKED. You are marking every place the pattern APPEARED, whether it worked or not.',
  'Open any charting app — TradingView\'s free tier is fine. Use bar replay, or cover the right side of the screen, so you genuinely cannot see what happened next.',
  'Find a place where your pattern qualifies. If it is only "sort of there", skip it — an unclear example is not an example.',
  'Type the symbol, date, entry, stop and target into this app FIRST. Then reveal what happened and record the exit, whether it hit the target, hit the stop, or died sideways.',
  'A genuinely good setup wins maybe 40–50% of the time. If you mark 30 examples honestly, roughly half should be losses. If you end up with 27 winners, you did not find an edge — you found your own bias, and it will cost you real money later.'
];

// ---------- the Constitution starting template ----------
// A beginner writing rules from a blank page writes vague ones. This is a
// draft to edit and argue with, not a set of commandments.
const CONSTITUTION_TEMPLATE = `MY TRADING CONSTITUTION
(Edit every line. Rules you did not choose are rules you will not keep.)

RISK
1. I risk no more than 0.5% of my capital on any single trade.
2. I never widen a stop once placed. Ever.
3. I place the stop at the same time as the entry, never afterwards.
4. If I lose 3% of my account in one day, I stop trading for that day.

SETUPS
5. I only trade setups I have personally marked 30+ examples of.
6. If a setup does not fully qualify, I do not take it. Half size is not a compromise, it is a rule break.
7. I do not trade a pattern because someone recommended it.

EXECUTION
8. I write the pre-trade card before the order, every time, with no exceptions.
9. I do not move a target or a stop while a trade is open, except to trail a winner per a rule written in advance.
10. I do not add to a losing position.

STATE
11. I do not trade on under 5 hours of sleep, or when stress is 4/5 or higher.
12. I do not trade in any month where I need money from this account.
13. After two losses within 45 minutes, I stop for 30 minutes minimum.
14. After three wins in a row, I halve my size for the next three trades.

REVIEW
15. I complete the weekly review before trading on Monday.
16. I judge myself on process, not on profit.

AMENDMENTS
17. I amend this document only on Sundays, and never while in drawdown.
18. Every amendment gets a written reason. If I loosen a rule after a loss, that is the finding.`;

// ---------- the next-action engine ----------
// "Never show him an empty screen that says wait." When a live gate is pending,
// there is always something real to do.
async function nextActions() {
  const p = await ledger.profile();
  const r = await R.rules();
  const ev = await ledger.patternEvidence();
  const prog = await learn.progress();
  const drill = await learn.drillState();
  const due = await learn.dueReviews();
  const trades = await store.all('trades');
  const papers = trades.filter(t => t.mode === 'paper' && t.closed).length;
  const units = learn.UNITS.filter(u => (prog[u.id] || {}).passed).length;

  const out = [];
  const add = (tab, title, why, urgent) => out.push({ tab, title, why, urgent: !!urgent });

  // --- states that stop everything else being relevant ---
  if (p.stage === 'paused') {
    add('settings', 'You are in wind-down mode',
      'Nothing decays and no clock is running. Resume in Settings when you are ready.', false);
    return out;
  }
  if (p.stage === 'cooldown') {
    const f = await ledger.failedTrialStatus();
    add('home', f && f.cooldownOver ? 'Cooldown complete — restart the trial' : 'Trial failed, cooldown running',
      f && f.pattern ? f.pattern
        : 'A failed trial restarts that track, not the whole system. Keep paper trading and reading meanwhile.', true);
  }
  if (p.stage === 'locked') {
    const rec = await ledger.recoveryStatus();
    if (rec) {
      const missing = rec.checks.filter(c => !c.ok);
      add('home', 'Work back from the regression',
        missing.length ? missing[0].t : 'All recovery requirements met — restore live trading.', true);
    }
  }

  // --- maintenance that decays if ignored ---
  if (due.length)
    add('learn', `Answer ${due.length} review question(s)`,
      `Spaced repetition. Leave them ${learn.STALE_DAYS} days and the unit lapses and its patterns lock again.`,
      due.length > 5);

  const rb = await mind.reviewBlock();
  if (rb) add('drills', 'Submit last week\'s review', 'Live trading is blocked until it is in.', true);

  const md = await analytics.monthlyDue();
  if (md) add('drills', 'Monthly review is due',
    'Expectancy by setup, constitution changes, and a re-projection from your own numbers.', false);

  const bk = await store.status();
  if (bk.due) add('home', bk.persisted ? `Back up — ${bk.since} trades since the last one`
      : 'Back up now — this browser has not granted permanent storage',
    'One tap writes a JSON file. Put it in Drive.', bk.critical);

  // --- specialisation ---
  const vr = await spec.verdictReady();
  const core = await spec.core();
  if (vr.ready && !core)
    add('focus', 'Choose your core setups',
      'You now have enough trades for the ranking to mean something. Most profitable traders end up running one or two setups.', true);
  if (core) {
    const rev = await spec.revalidation();
    if (rev && rev.drifted.length)
      add('focus', `${rev.drifted[0].setup} has drifted`, rev.drifted[0].why, true);
    else if (rev && rev.due)
      add('focus', 'Core setups are due for re-validation', `Chosen ${rev.daysSince} days ago.`, false);
    const exp = await spec.explorationStatus();
    if (exp.active && exp.overBudget)
      add('focus', 'Exploration budget is spent',
        'Off-core setups are blocked until you re-choose your core deliberately.', false);
  }

  // --- the Phase 1 chain ---
  if (units < 4)
    add('learn', `Read and pass ${4 - units} more unit(s)`,
      'Phase 1 needs four. Each unlocks the patterns it teaches.', false);

  if (drill.streak < learn.DRILL_TARGET)
    add('learn', `Sizing drill — ${drill.streak}/${learn.DRILL_TARGET} streak`,
      'The longest lead-time item in Phase 1. Under stress you will not calculate, you will guess.', false);

  const anyPaper = Object.values(ev).filter(m => m.paperOK).length;
  const closest = Object.entries(ev).filter(([, m]) => !m.paperOK)
    .sort((a, b) => b[1].n - a[1].n)[0];
  const hasSeries = (await RP.seriesList()).length > 0;
  if (!anyPaper)
    add(hasSeries ? 'replay' : 'backtest',
      closest ? `Mark ${r.btPaper - closest[1].n} more examples of ${closest[0]}`
        : 'Start marking historical examples',
      hasSeries
        ? `${r.btPaper} honest examples unlocks paper trading. Chart replay hides the future for you — mark the losers too.`
        : `${r.btPaper} honest examples unlocks paper trading. Import price data on the Replay screen and the app will hide the future for you.`, false);

  if (anyPaper && papers < 20)
    add('journal', `Paper trade — ${papers}/20 closed`,
      'Free practice at the full pre-trade discipline.', false);

  if (anyPaper) {
    const nearLive = Object.entries(ev).filter(([, m]) => m.paperOK && !m.liveOK)
      .sort((a, b) => b[1].n - a[1].n)[0];
    if (nearLive)
      add('backtest', `${r.btLive - nearLive[1].n} more examples of ${nearLive[0]} for live`,
        'Sixty examples with positive expectancy is the live gate.', false);
  }

  // --- live, per track ---
  if (p.phase > 1) {
    for (const tr of ['swing', 'intraday', 'options']) {
      const ts = await ledger.trialStatus(tr);
      if (!ts) continue;
      if (ts.canPass)
        add('home', `${ts.label} trial: behaviour bar met`, 'Advance from the Status screen.', true);
      else if (ts.adherence !== null && ts.adherence < r.regressionFloor)
        add('edge', `${ts.label} rule-following is ${ts.adherence}%`,
          `Below ${r.regressionFloor}% triggers a regression. This is the number to fix, not the P&L.`, true);
      else
        add('journal', `${ts.label} trial: ${ts.trades}/${ts.trades + ts.tradesLeft} trades`,
          ts.extending ? 'Past the calendar deadline — the trial extends until the trade count is met.'
                       : 'The bottleneck is calendar time at a real trade frequency.', false);
    }
    const anyTrial = ['swing', 'intraday', 'options'].some(tr => (p.trials || {})[tr]);
    if (!anyTrial && p.stage !== 'cooldown' && p.stage !== 'locked')
      add('home', 'Start a trial', 'The Status screen lists exactly what each track needs.', false);
  }

  // --- daily, only when it applies ---
  if (p.stage === 'live') {
    const st = await mind.todayState();
    if (!st) add('mind', 'Log your pre-market state', 'Live trading is blocked until you do.', true);
    else if (st.blocked) add('mind', 'Today is blocked', st.reasons.join('; ') + '. A blocked day never counts against you in a trial.', false);
    const ms = await R.marketState();
    if (!ms) add('day', 'Log the market filter', 'Required before live intraday trading.', false);
  }

  if (!out.length)
    add('learn', 'Read ahead',
      'Every unit is open. Options and advanced content can be studied long before you may trade them.', false);

  // Urgent first, then the order above.
  return out.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
}

// ===== SHARED BANNER =====
// ---------------- banner: backup + storage health ----------------
async function banner() {
  const b = await store.status();
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
      <button data-act="backup-full" class="sub">Include screenshots</button>
      <label class="btn">Restore<input type="file" id="restoreFile" accept=".json" hidden></label>
      <button data-act="report" class="sub">Readable record</button>
    </div></div>`;
}



// ===== STATUS SCREEN =====
// ---------------- home ----------------
async function home() {
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
async function settings() {
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



// ===== LEARN SCREEN =====
let lnQ = null, lnStart = 0, lnTick = null;
let lnUnit = null, lnQuiz = false, lnTab = 'units', lnReview = null;

async function learnView() {
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

function learnWire() {
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

async function learnHandle(act, ev, render) {
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

// ===== BACKTEST SCREEN =====
let btBrowsing = null, btMsg = '';

async function backtestView() {
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

async function backtestHandle(act, ev, render) {
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

// ===== JOURNAL SCREEN =====
let jShots = [];   // compressed screenshots waiting to attach
let jMode = 'paper';

async function journalView() {
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
function journalWire(render) {
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

async function journalHandle(act, ev, render) {
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

async function edgeView() {
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

function edgeWire(render) {
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

async function edgeHandle(act, ev, render) {
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

// ===== REGIME SCREEN =====
let rgWall = null, rgPicked = null;

async function marketView() {
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

async function marketHandle(act, ev, render) {
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

async function brokerView() {
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

function brokerWire(render) {
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

async function brokerHandle(act, ev, render) {
  if (act === 'b-recon') { brLast = await journal.reconcile(); return render(); }
  if (act === 'b-clear') {
    if (!await confirmToast('Remove all imported broker fills? Your trades are untouched.', 'Remove')) return;
    await journal.clearFills(); brLast = null; return render();
  }
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

async function startView() {
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

async function startHandle(act, ev, render) {
  if (act === 'o-done') { await markSeen(); return render(); }
}

// ===== PSYCH SCREEN =====
async function mindView() {
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

async function mindHandle(act, ev, render) {
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
async function drillsView() {
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

async function drillsHandle(act, ev, render) {
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

// ===== INTRADAY SCREEN =====
async function dayView() {
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

function dayWire(render) { mountTV(); }

async function dayHandle(act, ev, render) {
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

// ===== STATUS & SETTINGS ACTIONS =====
async function statusHandle(act, ev, render) {
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


// ===== FOCUS SCREEN =====
// Most profitable traders end up running one or two setups. This screen finds
// which ones are his, using his own data, and then makes trading outside them a
// deliberate act rather than a casual one.
let fcPicked = null, fcMastery = null, fcMsg = '';

async function focusView() {
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

async function focusHandle(act, ev, render) {
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


// ===== PLAYBOOK SCREEN =====
// Prose in a unit is for learning. This is for 09:40 at a chart, deciding in
// thirty seconds whether the thing in front of you qualifies.
let pbOpen = null, pbTicks = {}, pbFamily = 'swing';

async function playbookView() {
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
      ${stats.partialPct ? `· <span class="${stats.partialPct > 30 ? 'bad' : 'warn'}">${stats.partialPct}% of the trades you took were only partly qualified</span>` : ''}</p>` 
