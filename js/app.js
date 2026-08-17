// app.js — OWNS: sections, routing, event delegation, toasts.
// Deliberately the thinnest logic file: if this breaks, everything breaks.

import * as store from './store.js';
import * as ledger from './ledger.js';
import * as learn from './learn.js';
import * as mind from './mind.js';
import * as UI from './ui.js';
const { toast, confirmToast } = UI;

// Five sections rather than fifteen flat tabs. A scrolling row of fifteen
// buttons is a list, not navigation.
const SECTIONS = {
  today:  { label: 'Today',  screens: [['home', 'Status'], ['start', 'Guide'], ['day', 'Market day']] },
  learn:  { label: 'Learn',  screens: [['learn', 'Units'], ['playbook', 'Playbook'], ['backtest', 'Evidence'], ['replay', 'Replay']] },
  trade:  { label: 'Trade',  screens: [['journal', 'Journal'], ['market', 'Regime'], ['broker', 'Reconcile']] },
  review: { label: 'Review', screens: [['edge', 'Edge'], ['focus', 'Focus'], ['mind', 'Mind'], ['drills', 'Drills']] },
  more:   { label: 'More',   screens: [['advanced', 'Advanced'], ['settings', 'Settings']] }
};
const sectionOf = route =>
  Object.keys(SECTIONS).find(s => SECTIONS[s].screens.some(([r]) => r === route)) || 'today';

const el = document.getElementById('app');
let route = 'home';
let section = 'today';

// ---------- render ----------
async function render() {
  el.innerHTML = '<div class="skeleton"><div class="sk-card"></div><div class="sk-card"></div></div>';
  section = sectionOf(route);

  document.getElementById('tbTitle').textContent =
    (SECTIONS[section].screens.find(([r]) => r === route) || [, SECTIONS[section].label])[1];
  document.getElementById('tbSub').textContent = await subtitle();

  // Sub-navigation only when the section holds more than one screen.
  const sub = document.getElementById('subnav');
  const scr = SECTIONS[section].screens;
  sub.innerHTML = scr.length > 1 ? scr.map(([r, l]) =>
    `<button data-go="${r}" class="${r === route ? 'sel' : ''}">${l}</button>`).join('') : '';
  sub.style.display = scr.length > 1 ? '' : 'none';

  document.querySelectorAll('.tabbar button').forEach(b =>
    b.classList.toggle('sel', b.dataset.section === section));

  try {
    el.innerHTML = await UI.VIEWS[route]();
  } catch (e) {
    el.innerHTML = `<div class="card"><h2 class="bad">This screen failed to load</h2>
      <p class="sub">${UI.esc(e.message)}</p>
      <p class="faint">Your data is not affected. Other screens should still work.</p></div>`;
    console.error(route, e);
  }
  window.scrollTo(0, 0);
  const w = UI.WIRE[route];
  if (w) w(render);
  wireRestore();
  await markBadges();
}

// One glanceable line under the title: where you are, and what state you are in.
async function subtitle() {
  try {
    const p = await ledger.profile();
    const ph = `Phase ${p.phase}`;
    const st = { learning: 'learning', paper: 'paper trading', live: 'live',
      locked: 'locked — regression', cooldown: 'cooldown', paused: 'paused' }[p.stage] || p.stage;
    return `${ph} · ${st}`;
  } catch { return ''; }
}

// A dot on a tab means something there needs attention. Nothing else does.
async function markBadges() {
  try {
    const acts = await UI.nextActions();
    const urgent = new Set(acts.filter(a => a.urgent).map(a => sectionOf(a.tab)));
    document.querySelectorAll('.tabbar button').forEach(b => {
      const has = urgent.has(b.dataset.section);
      const old = b.querySelector('.badge');
      if (has && !old) { const d = document.createElement('span'); d.className = 'badge'; b.appendChild(d); }
      if (!has && old) old.remove();
    });
  } catch { /* badges are cosmetic; never let them break a render */ }
}

function wireRestore() {
  const f = document.getElementById('restoreFile');
  if (!f) return;
  f.onchange = async () => {
    if (!f.files[0]) return;
    if (!await confirmToast('This REPLACES all current data with the backup file.', 'Replace everything')) return;
    try { await store.restore(f.files[0]); toast('Restored.', 'ok'); render(); }
    catch (e) { toast('Restore failed: ' + e.message, 'bad'); }
  };
}

// ---------- events ----------
document.addEventListener('click', async ev => {
  const btn = ev.target.closest('button, .btn');
  const t = btn || ev.target;
  const d = t.dataset || {};

  if (d.section) {
    const first = SECTIONS[d.section].screens[0][0];
    route = first;
    return render();
  }
  if (d.go && UI.VIEWS[d.go]) { route = d.go; return render(); }

  const act = d.act;
  if (!act) return;
  for (const [prefix, fn] of UI.HANDLERS) {
    if (act.startsWith(prefix)) return fn(act, ev, render);
  }
  return UI.statusHandle(act, ev, render);
});

// ---------- boot ----------
// A silently-updated service worker means the person can be running old gate
// logic without knowing. Tell them, and let them choose the moment.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (window.__tcsReloading) return;
    toast('A new version is ready. Reload when you are not mid-trade.');
  });
}

(async () => {
  await store.migrate();
  const decayed = await learn.applyDecay();
  const st = await mind.todayState();
  await ledger.tickTrialDay({ blocked: !!(st && st.blocked) });
  await ledger.checkRegression();
  if (!(await UI.onboardSeen())) route = 'start';
  await render();
  if (decayed) toast(`${decayed} unit(s) went stale — reviews unanswered for ${learn.STALE_DAYS}+ days. Their patterns are locked again.`, 'warn');
})();
