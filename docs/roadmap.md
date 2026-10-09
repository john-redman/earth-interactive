# Roadmap

## Before launch
- [ ] Editorial review of the three border views (`docs/border-views.md`)
- [x] Fresher population & GDP (World Bank WDI: population 2025, GDP mostly 2024) — feeds ranks, density and data lenses
- [ ] Current line of control for eastern Ukraine in De Facto view
- [x] Recorded crowd-scream loop (`sounds/crowd-panic.mp3`); the synthesised crowd, wind and drone are gone
- [ ] Ad network integration (`js/ads.js`) and policy check for animated pages
- [x] Hosting (GitHub Pages)
- [x] Open Graph / link-preview image (`og-image.png`), installable PWA with offline cache
- [ ] Custom domain (Cloudflare Registrar when affordable), analytics code (GoatCounter) and Search Console sitemap
- [ ] Leaderboard live: deploy `server/` (Cloudflare Worker + D1 recommended) and set `API_BASE`
- [x] Fast first load without a bundler: every module is modulepreloaded, the map data streams with progress (~740 KB gzipped in all on a first visit; repeat visits come from the offline cache)
- [ ] Test on a real iPhone (Safari): audio unlock, the bottom sheet, the share sheet
- [x] Flag images (Windows doesn't render flag emoji) — `vendor/flags/`

## Next features
- [ ] Higher-detail borders when zoomed in (Natural Earth 1:10m, loaded on demand)
- [ ] Country labels that fade in with zoom
- [x] Shareable compare cards (image export)
- [ ] Flag and capital game modes; teacher mode (custom rounds by region)
- [ ] Accounts + daily streaks (needs a backend)
- [ ] Historical borders time slider (1914 / 1945 / 1991)
- [x] Unit tests in CI (`npm test`: geo maths, triangulated areas, Sun position, population clock, lens breaks, currents table, game pool, country of the day)
- [ ] Playwright smoke test in CI (`tools/smoke.mjs` and `tools/qa.mjs` exist for local runs)
- [x] Fewer draw calls on phones: the country layer is ~3 draw calls on every device (was ~400)
