// Service worker: makes repeat visits load instantly and lets the globe work offline.
// Strategy: serve from cache, refresh the cache in the background (stale-while-revalidate).
// The deploy workflow stamps VERSION with the commit, so every deploy installs a fresh cache
// and deletes the old one.
const VERSION = 'dev';
const CACHE = `earth-${VERSION}`;
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/main.js', 'js/load.js', 'js/perf.js', 'js/globe.js', 'js/countries.js', 'js/compare.js', 'js/geo.js',
  'js/spin.js', 'js/thrills.js', 'js/sun.js', 'js/lens.js', 'js/search.js', 'js/quiz.js', 'js/ui.js', 'js/ads.js', 'js/flags.js',
  'js/pin.js', 'js/leaderboard.js', 'js/net/api.js', 'js/net/profanity.js', 'css/leaderboard.css',
  'data/world.js',
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
  // the page itself: ignore query strings (?c=FRA, ?view=…) so deep links work offline
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
