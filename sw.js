// sw.js — OWNS: offline caching. Lives at the repo root, next to index.html.
// Without this the app only works offline while the browser cache happens to
// hold the files. That cache gets evicted. This does not.

const VERSION = 'tcs-v11';

const SHELL = [
  './', './index.html', './css/styles.css',
  './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
  './js/app.js', './js/ui.js', './js/ui-core.js', './js/ui-today.js', './js/ui-learn.js',
  './js/ui-trade.js', './js/ui-review.js', './js/store.js', './js/rules.js',
  './js/ledger.js', './js/journal.js', './js/mind.js', './js/learn.js',
  './js/analytics.js', './js/charts.js', './js/replay.js', './js/specialise.js', './js/playbook.js', './js/content-equity.js', './js/content-options.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Added individually: addAll fails entirely if one file 404s, which would
    // silently leave no cache at all.
    await Promise.all(SHELL.map(u =>
      cache.add(u).catch(err => console.warn('sw: could not cache', u, err))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network first, cache fallback. Fresh code when online, a working app when not.
// Never the reverse — a stale cache serving old gate logic would be worse than
// having no offline support at all.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(VERSION);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return new Response('Offline and not cached.', { status: 503 });
    }
  })());
});
