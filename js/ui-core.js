// ui-core.js — OWNS: shared UI helpers used by every screen file.
// Escaping, money formatting, toasts, empty states, the TradingView embed,
// the onboarding copy, and the next-action engine.
// Split out because a 2,300-line file cannot be pasted reliably on a phone.
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

export const $ = id => document.getElementById(id);
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
export function empty(icon, title, detail, action) {
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
export function tvChart(symbol, id, height = 320) {
  const sym = String(symbol || '').trim().toUpperCase().replace(/[^A-Z0-9:_-]/g, '');
  if (!sym) return '';
  const full = sym.includes(':') ? sym : 'NSE:' + sym;
  return `<div class="tvwrap" id="${id}" data-tv="${esc(full)}" data-h="${height}">
    <div class="tvload">Loading ${esc(full)}…</div></div>
    <p class="faint">Live chart from TradingView. Data may be delayed.</p>`;
}

// Iframes are built after render, so a failed embed never blocks the screen.
export function mountTV() {
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



export const rs = n => (n < 0 ? '\u2212\u20b9' : '\u20b9') + Math.abs(Math.round(n)).toLocaleString('en-IN');

// ===== ONBOARDING CONTENT & THE NEXT-ACTION ENGINE =====

// Constitution starting template. Imports db + ledger + learn + backtest.





export const seen = () => store.get('onboarded', false);
export const markSeen = () => store.set('onboarded', true);

// ---------- what this is ----------
export const WHAT_IT_IS = [
  'This app does not tell you what to buy. It decides whether you are allowed to trade yet, and it makes lying to yourself expensive.',
  'The logic is one sentence: learning is free, trading is earned. Every lesson is open from day one, in any order. Live money is not.',
  'The chain is fixed. Read a unit and answer its questions correctly. That unlocks the chart patterns the unit teaches. Mark 30 real historical examples of a pattern — writing down entry and stop BEFORE you look at what happened — and that unlocks paper trading it. Sixty examples with a positive result unlocks live money.',
  'Once you are trading, every trade needs a written plan first, timestamped so you cannot write it afterwards and invent calm reasoning you never had. Your broker\'s own records get checked against your journal.',
  'And it can take permission away. If your rule-following drops below 80%, or you take trades outside your plan, or your account falls 12% from its peak, you go back to paper trading for 15 days. Certification is a lease, not a deed.'
];

export const WHAT_IT_WONT_DO = [
  'It will not prevent losses. Losses are part of trading, not a malfunction.',
  'It will not make you profitable quickly, and it cannot honestly say how long this takes. No reliable data exists.',
  'It cannot certify that you are psychologically ready. It measures behaviour, and only after real money has been at risk.',
  'It cannot prove your journal entries are sincere — only that they were written before the trade.',
  'Three separate SEBI studies found roughly 9 out of 10 individual F&O traders lose money, and over 75% of the losers kept trading anyway. This app exists to interrupt that behaviour. It cannot promise you will be the exception.'
];

export const HOW_MARKING_WORKS = [
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
export const CONSTITUTION_TEMPLATE = `MY TRADING CONSTITUTION
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
export async function nextActions() {
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
export async function banner() {
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


