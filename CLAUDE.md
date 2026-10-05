# CLAUDE.md

Working notes for Claude Code (and humans) on EarthInteractive. Read this before changing code.

## What this is

A static, no-build web app: a true-to-scale Three.js globe with country cards, three border views, a true-size compare mode, data lenses, geography games and a "rollercoaster" audio easter egg. Product owner: John.
Design brief: modern, minimal, globe fills the screen, no menus/tabs beyond the small floating controls.

## Commands

```bash
npm run dev          # static server :5173 (no bundler, plain ES modules + importmap)
npm install          # only for the data build (d3-geo, polygon-clipping)
npm run build:data   # regenerate data/world.js — never hand-edit that file
npm run check        # module syntax + data consistency (same as CI)
```

## Architecture in one breath

`index.html` holds every UI container and an importmap (`three` → `vendor/three/three.module.min.js`).
`js/main.js` owns app state (`mode`: browse | pick | compare | quiz), pointer & keyboard routing, deep links and the render loop, and wires the modules together. See `docs/architecture.md` for the per-module map.

Data flow: `tools/sources/*` + `tools/views.config.mjs` → `tools/build-data.mjs` → `data/world.js`
(`{ views: { un|defacto|neutral: { units: [{k,g,n,t,c,note,area,mod}] } }, geoms: [delta-encoded multipolygons], info: {key: facts} }`).
Unit keys are Natural Earth `ADM0_A3` codes (e.g. `FRA`), or `X_<SLUG>` for disputed overlays.

## Conventions

- Plain modern JS (ES2022), no framework, no TypeScript, no bundler. Keep it that way unless asked.
- Two-space indent, single quotes, semicolons. Small modules with one job each.
- Colours/typography live as tokens in `:root` of `css/style.css`. The app is deliberately dark-only.
- UI text: short, plain, active voice. No emoji in UI chrome (the shareable quiz result is the exception).
- Accessibility: keyboard reachable controls, `aria-*` on custom widgets, `prefers-reduced-motion` respected.
- Third-party code is vendored under `vendor/`; record new ones in `THIRD_PARTY_NOTICES.md`.

## Gotchas (learned the hard way)

- **Country fills** use `depthTest: false` + a per-fragment far-side discard, because large flat triangles sag below the ocean sphere. A **stencil** (`EqualStencilFunc` + `IncrementStencilOp`) makes each pixel blend once — without it shared triangle edges show bright seams. Compare pieces use their own stencil refs (100+id). The renderer needs `stencil: true`.
- **Triangulation**: earcut in lon/lat, then longest-edge bisection (`maxEdge` 6°, measured on the sphere: Δlon × cos lat). 4-way subdivision explodes the triangle count on earcut slivers — don't go back to it. Measuring in raw degrees turned Antarctica alone into ~200k triangles.
- **Mobile performance** (`js/perf.js`): touch devices get the `low` tier — no MSAA, pixel ratio ≤ 1.5, two ocean noise octaves, lighter spheres, borders simplified by 0.06° (98k → 31k segments; fills keep full detail), no `backdrop-filter` (`:root[data-quality="low"]` in CSS). The governor drops the pixel ratio in 0.25 steps when median frame time > 22 ms. `CountryLayer.cull()` hides countries behind the horizon every frame; anything that needs a hidden country drawn must account for it. Test with `?quality=low` on desktop.
- **Service worker** (`sw.js`) serves everything stale-while-revalidate. The deploy stamps `VERSION` with the commit so each deploy gets a fresh cache; it is skipped on localhost. New files the app needs offline go in `CORE`.
- **Data loads via `js/load.js`** (streamed fetch → blob `import()`), not a static import, so the loader can show progress. The first view is built with `layer.buildAsync()` in 12 ms slices.
- **Phone layout**: the country card is a bottom sheet that opens as a 196 px peek (swipe/tap to expand, swipe down to close). Below 1100 px wide the side ads give way to one bottom banner; the stage shrinks by `--ad-h` so nothing overlaps it.
- **Selection flow**: tap → `openCountry()` drops the 3D pin (`js/pin.js`, matcap, `transparent: true` + `renderOrder 6` so it sorts after the depth-less fills) and shows the DOM tag; the card opens only via `openInfo()`. Escape / card ✕ go card → tag → nothing. Compare shows `#compare-pill`; the full `#compare-bar` opens from it.
- **Backend** (`server/`, Cloudflare Worker + D1) is not published by Pages. `js/net/profanity.js` is the one copy of the name filter; the Worker re-exports it. With `API_BASE` empty in `js/net/api.js` every call resolves to null and the leaderboard stays hidden. Run `cd server && npm test`. See `docs/backend.md`.
- **LineMaterial resolution** is in CSS pixels (`layer.resizeLines()` on resize); extra line materials must be registered.
- **Rotation is owned by `js/spin.js`**, not OrbitControls (`enableRotate = false`). OrbitControls still does zoom and idle auto-rotate. Pointer-down stops the spin immediately; release velocity becomes momentum. Idle auto-rotate restarts 12 s after the last interaction unless something holds it (`globe.hold('card', true)` while a country card is open; `globe.lockAuto` during compare). `globe.flyHome()` + `globe.resumeAuto()` power the recenter button.
- **Click vs drag**: a click is < 6 px movement and < 650 ms; anything else is a spin. Keep this — it's a core UX promise.
- **Audio** must be unlocked from a pointer gesture (`thrills.unlock()`); the crowd loops are rendered once in an `OfflineAudioContext` on first unlock (~1–2 s, async). The context suspends after 3 s of silence.
- **Border views are editorial and politically sensitive.** Change `tools/views.config.mjs` only on explicit request, explain the change in the PR, and update `docs/border-views.md`.
- `data/world.js` is ~1.1 MB and generated; CI fails if it is stale relative to the sources.
- Quiz questions only use keys that are a `country` in **all three** views, so a game survives view switches.

## Testing

No unit-test framework yet. Verify changes by:
1. `npm run check`
2. Running the page and exercising the feature (Playwright works headless with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`; it renders ~1 fps, so wait on frames, not time).
   `window.EarthInteractive` exposes `globe, layer, compare, spin, thrills, quiz, search, setView(), setLens(), compareKeys()` for scripted checks.
3. Checking desktop (1280×800) and phone (390×844) layouts.

## Open items

See `docs/roadmap.md`. Highest priority before launch: fresher population/GDP data, editorial review of border views, real recorded crowd audio, ad network integration, custom domain. Hosting: GitHub Pages via `.github/workflows/pages.yml` (deploys on push to `main`; publishes `index.html`, `manifest.webmanifest`, `sw.js`, `og-image.png`, `css/`, `js/`, `data/`, `vendor/`, `icons/` — add new top-level files there).
