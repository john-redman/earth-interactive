# Roadmap

## Before launch
- [ ] Editorial review of the three border views (`docs/border-views.md`)
- [ ] Fresher population & GDP (World Bank API) — feeds ranks, density and data lenses
- [ ] Current line of control for eastern Ukraine in De Facto view
- [ ] Real recorded crowd-scream loops (`sounds/`, CC0) to replace the synthesised crowd
- [ ] Ad network integration (`js/ads.js`) and policy check for animated pages
- [x] Hosting (GitHub Pages)
- [ ] Custom domain, analytics, Open Graph image
- [ ] Bundle + minify for production (Vite) — `data/world.js` is ~1.1 MB raw
- [ ] Flag images (Windows doesn't render flag emoji)

## Next features
- [ ] Higher-detail borders when zoomed in (Natural Earth 1:10m, loaded on demand)
- [ ] Country labels that fade in with zoom
- [ ] Shareable compare cards (image export)
- [ ] Flag and capital game modes; teacher mode (custom rounds by region)
- [ ] Accounts + daily streaks (needs a backend)
- [ ] Historical borders time slider (1914 / 1945 / 1991)
- [ ] Unit tests (geo math, quiz scoring, lens breaks) + Playwright smoke test in CI
