# Roadmap

## Before launch
- [ ] Editorial review of the three border views (`docs/border-views.md`)
- [x] Fresher population & GDP (World Bank WDI: population 2025, GDP mostly 2024) — feeds ranks, density and data lenses
- [ ] Current line of control for eastern Ukraine in De Facto view
- [ ] Real recorded crowd-scream loops (`sounds/`, CC0) to replace the synthesised crowd
- [ ] Ad network integration (`js/ads.js`) and policy check for animated pages
- [x] Hosting (GitHub Pages)
- [x] Open Graph / link-preview image (`og-image.png`), installable PWA with offline cache
- [ ] Custom domain, analytics
- [ ] Bundle + minify for production (Vite) — `data/world.js` is ~1.1 MB raw
- [x] Flag images (Windows doesn't render flag emoji) — `vendor/flags/`

## Next features
- [ ] Higher-detail borders when zoomed in (Natural Earth 1:10m, loaded on demand)
- [ ] Country labels that fade in with zoom
- [ ] Shareable compare cards (image export)
- [ ] Flag and capital game modes; teacher mode (custom rounds by region)
- [ ] Accounts + daily streaks (needs a backend)
- [ ] Historical borders time slider (1914 / 1945 / 1991)
- [ ] Unit tests (geo math, quiz scoring, lens breaks) + Playwright smoke test in CI
