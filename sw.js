// Service worker: makes repeat visits load instantly and lets the globe work offline.
// Strategy: serve from cache, refresh the cache in the background (stale-while-revalidate).
// The deploy workflow stamps VERSION with the commit, so every deploy installs a fresh cache
// and deletes the old one.
// Only the globe itself (the scope root / index.html) is served cache-first. The text pages
// (about.html, countries/…, compare/…) are network-first with a cached fallback, so they are never
// answered with the globe and always show the latest deploy when online.
const VERSION = 'dev';
const CACHE = `earth-${VERSION}`;
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/main.js', 'js/load.js', 'js/perf.js', 'js/globe.js', 'js/countries.js', 'js/compare.js', 'js/geo.js',
  'js/spin.js', 'js/thrills.js', 'js/sun.js', 'js/lens.js', 'js/search.js', 'js/quiz.js', 'js/ui.js', 'js/ads.js', 'js/flags.js',
  'js/pin.js', 'js/leaderboard.js', 'js/net/api.js', 'js/net/profanity.js', 'js/net/names.js', 'js/sheet-drag.js', 'js/app-links.js', 'js/site.js', 'js/analytics.js',
  'css/leaderboard.css', 'css/app-links.css',
  'vendor/fonts/plus-jakarta-sans/plus-jakarta-sans-latin.woff2', 'vendor/fonts/plus-jakarta-sans/plus-jakarta-sans-latin-ext.woff2',
  'js/music.js', 'js/sfx.js', 'js/miss-line.js', 'js/currents.js', 'js/popclock.js', 'js/ships.js', 'js/clouds.js', 'js/daily-country.js', 'js/share-image.js',
  'data/world.js', 'data/ocean.png',
  'vendor/three/three.module.min.js', 'vendor/three/controls/OrbitControls.js',
  'vendor/three/lines/LineMaterial.js', 'vendor/three/lines/LineSegments2.js', 'vendor/three/lines/LineSegmentsGeometry.js',
];
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', e => {
  // cache: 'reload' skips the HTTP cache so a new deploy never installs stale files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('earth-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !FONTS.test(req.url)) return; // ad networks, analytics etc. go straight to the network
  // audio: media elements send Range requests, which the cache can't answer; sounds are fetched live
  if (req.headers.has('range') || url.pathname.includes('/sounds/')) return;
  const scope = new URL(self.registration.scope).pathname;
  const isApp = url.pathname === scope || url.pathname === scope + 'index.html';
  if (req.mode === 'navigate' && !isApp) { e.respondWith(networkFirst(req)); return; }
  // the globe page: ignore query strings (?c=FRA, ?view=…) so deep links work offline
  const key = req.mode === 'navigate' ? new Request(new URL('./', self.registration.scope)) : req;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key);
    const fresh = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(key, res.clone());
      return res;
    }).catch(() => hit);
    if (hit) { e.waitUntil(fresh); return hit; }
    return fresh;
  }));
});

/** Text pages: try the network, keep a copy for offline, fall back to the copy (or the 404 page). */
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match(new URL('404.html', self.registration.scope).href))
      || new Response('You are offline and this page is not saved yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
