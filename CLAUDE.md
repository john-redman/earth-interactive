# CLAUDE.md

Working notes for Claude Code (and humans) on EarthInteractive. Read this before changing code.

## What this is

A static, no-build web app: a true-to-scale Three.js globe with country cards, three border views, a true-size compare mode, data lenses, geography games and a "rollercoaster" audio easter egg. Product owner: John.
Design brief: modern, minimal, globe fills the screen, no menus/tabs beyond the small floating controls.

## Commands

```bash
npm run dev          # static server :5173 (no bundler, plain ES modules + importmap)
npm install          # only for the data build (d3-geo, polygon-clipping)
npm run build:data   # regenerate data/world.js and data/ocean.png — never hand-edit them
npm run check        # module syntax + data consistency (same as CI)
```

## Architecture in one breath

`index.html` holds every UI container and an importmap (`three` → `vendor/three/three.module.min.js`).
`js/main.js` owns app state (`mode`: browse | pick | compare | quiz), pointer & keyboard routing, deep links and the render loop, and wires the modules together. See `docs/architecture.md` for the per-module map.

Data flow: `tools/sources/*` + `tools/views.config.mjs` → `tools/build-data.mjs` → `data/world.js` (→ `tools/build-ocean.mjs` → `data/ocean.png`)
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
- **Service worker** (`sw.js`) serves everything stale-while-revalidate. The deploy stamps `VERSION` with the commit so each deploy gets a fresh cache; it is skipped on localhost. New files the app needs offline go in `CORE`. When a new worker takes control within 10 s of page load (and there was a previous worker), `main.js` reloads once per session so returning visitors see the new deploy, not the cached one.
- **Data loads via `js/load.js`** (streamed fetch → blob `import()`), not a static import, so the loader can show progress. The first view is built with `layer.buildAsync()` in 12 ms slices.
- **Phone layout**: the country card is a bottom sheet that opens as a 196 px peek; `js/sheet-drag.js` makes it (and the compare stats panel) follow the finger and settle by position + flick velocity. Below 1100 px wide the side ads give way to one bottom banner; the stage shrinks by `--ad-h` so nothing overlaps it.
- **Draw order is fixed per country** (`renderOrder` 1.x fills / 2.x borders by type then index; 3 = highlighted). Don't go back to equal render orders: three.js would sort coincident shared borders by camera distance and they flicker as the globe turns. Phone borders use `simplifyShared()` (cut where the neighbour set changes, DP per stretch) so neighbours stay identical — independent per-country simplification makes double lines.
- **Card placement**: on desktop the card docks on the right; `frameBesideCard()` then flies the globe so the country's main landmass (`compare.shapeFor(o)`: centroid + reach) fills the free space left of it (above the 196 px peek on phones), using the exact perspective projection. Pins, fly-tos and game distances use `compare.anchorFor(o)`: the main-landmass centre if it is on land, else the nearest point that is (France's whole-country centroid lies in Spain, Japan's main-landmass centre in the Sea of Japan; 34 countries per view needed this).
- **View switch** clears the pin, tag and card: the same spot can belong to another country in the new view. **Games** switch to the UN view (`GAME_VIEW`) and restore the previous view on exit unless the player changed it.
- **Games lock the view** (switching mid-round would lose its highlights; a toast explains) and hide the dock on both sizes. Compare keeps the dock on both sizes.
- **Phone half-rate**: on the low tier `frame()` draws every other frame while nothing moves (no flight, zoom, spin, drag, compare animation or touch). Anything that animates on its own and must stay smooth needs to be added to that `calm` check.
- **Search focuses synchronously** in `open()`: iOS only raises the keyboard for a focus made inside the tap. Don't move it back into a `requestAnimationFrame`.
- **Share image** keeps the last rendered PNG; if the share sheet is refused (slow render outlived the tap), it returns `'retry'` and the second tap shares at once.
- **Phone card sheet**: growing or shrinking it calls `onSheet` → `frameBesideCard()` so the country stays visible above it.
- **Selection flow**: tap → `openCountry()` shows the SVG pin (`js/pin.js`, a DOM overlay placed at the projected anchor each frame, crisp at any DPR) and the DOM tag; the card opens only via `openInfo()`. Escape / card ✕ go card → tag → nothing. Compare shows `#compare-pill`; the full `#compare-bar` opens from it.
- **Backend** (`server/`, Cloudflare Worker + D1) is not published by Pages. `js/net/profanity.js` is the one copy of the name filter; the Worker re-exports it. With `API_BASE` empty in `js/net/api.js` every call resolves to null and the leaderboard stays hidden. Run `cd server && npm test`. See `docs/backend.md`.
- **Fills are opaque** (`uOpacity` 1, `uMix` tones the palette towards ocean blue per state) and **border lines discard back-facing fragments** (`vFace` injected via `onBeforeCompile` in `lineMaterial()`). Both are needed: the ocean sphere is faceted, so depth testing alone lets far-side lines poke out at the horizon.
- **UI sounds** live in `js/sfx.js`: synthesised tones (keep them, the owner likes them) plus recorded samples from `sounds/` for the airy parts (swipe/reversed swipe for open/close, plop for the pin, click/reversed click for compare pieces). One delegated click listener maps buttons to sounds; toggles with `aria-expanded="true"` play `close`. Respects `thrills.muted`. Music (`js/music.js`) is separate, off by default, remembered in localStorage. `sw.js` skips `/sounds/` and Range requests.
- **Highlights**: `CountryLayer.raise()` lifts the selected country (steady white glow) and quiz answers (`target`/`good`: thick white border + bright dashes running round a smoothed outline). Raised fills draw over neighbours (stencil Always while raised).
- **Quiz guesses** are two-step: a tap drops the pin with a Confirm / Not here tag (`proposeGuess` → `confirmGuess`); Enter confirms, Escape cancels. The Enter handlers call `preventDefault()`: answering moves focus to "Next country", and the same Enter would otherwise press it and skip the result.
- **Card animations**: `.in`/`.out` classes with `animation-fill-mode` backwards/forwards only, so `sheet-drag` can still move cards; `hideAnimated()` hides after the out animation.
- **LineMaterial resolution** is in CSS pixels (`layer.resizeLines()` on resize); extra line materials must be registered.
- **Rotation is owned by `js/spin.js`**, not OrbitControls (`enableRotate = false`). OrbitControls only does pinch zoom. Pointer-down stops the spin immediately; release velocity becomes momentum. The idle auto-rotate is also spin's (`globe.autoRotate`, eased in/out; OrbitControls' own auto-rotate is off because it stops during a pinch). **Zoom never stops or starts rotation**: wheel and +/- use the eased `globe.zoomBy()`, and a second finger within `PINCH_MS` gives the spin back (`spin.pinch()`). Idle auto-rotate restarts 12 s after the last grab unless something holds it (`globe.hold('card', true)` while a country card is open; `globe.lockAuto` during compare). `globe.flyHome()` + `globe.resumeAuto()` power the recenter button.
- **Click vs drag**: a click is < 6 px movement and < 650 ms; anything else is a spin. Keep this — it's a core UX promise.
- **Audio** must be unlocked from a pointer gesture (`thrills.unlock()`). A hidden tab suspends the ride audio (the render loop that fades it stops). The ride audio is only the owner's screaming recording (`THRILLS.samples`), played straight — no wind, drone/dread bed, synthesised voices, HRTF orbit or playback-rate changes (the owner heard them as hum and wobble). The context suspends after 3 s of silence.
- **Compare has no sound of its own** on pressing Compare (the owner disliked the bell; a recorded one will come) — only the piece's snap-out click.
- **Pin drop sound**: `tap` is just the plop, scheduled at `PIN_LANDS` (0.16 s, the landing frame of `@keyframes pinDrop`) minus its 22 ms peak. Change both together.
- **Compare pick**: pressing Compare calls `compare.preview(a)` — the first piece lifts out at once and can be dragged while choosing; `start(a, b)` reuses it. `end()` sinks it back; `flushEnd()` finishes a pending sink before anything new starts.
- **Ocean** (`oceanMaterial()` in `globe.js`): calm and still (owner: "calming and still"; no swell lines: they read as stretch marks). Medium satellite blue with a broad still tone variation, subtle teal shallows, and slowly wandering patches where the light shifts a little. **Crests**: sparse crusty, snowy white foam patches, one possible per cell of a 3D grid (`P * 48`), each with its own random position, angle, size, shape and frayed edge (hashes only, no extra noise), modelled as a small ellipsoid inside its cell so cell faces never slice it; lit on the upper-left with a soft offset shadow. Density = `data/ocean.png` G (light baseline everywhere, more along the storm tracks, Southern Ocean toned down, calm shallows and pack ice) × a broad noise so patches cluster naturally. Crests fade out when smaller than a few pixels. No clouds. Glint follows the real Sun while day & night is on.
- **Currents** (`js/currents.js`): painted on the globe like the type on a real globe, fixed to the Earth. Currents are soft feathered ribbons (one merged mesh, `renderOrder` −5, radius 1.0016) along a gently meandering path, with faint streaks drifting with the flow. Names (strength, typical m/s, an arrow drawn as a shape since the font has no arrow glyph, soft dark halo) and ocean names are text from one canvas atlas laid on strips on the sphere (one merged mesh, `renderOrder` −4), spaced evenly by arc length so letters keep their size: current names sit on **one smooth bow** (quadratic arc through the start, middle and end of their stretch, softened) on the given `side`; ocean names follow their parallel below 55°, and run straight (great circle) nearer the poles. `currents.spots` lists every label's centre for checks. Reading direction is chosen so text is upright with north up. Fade by zoom (major currents first, ocean names step back up close), toward the rim, and current names hide in games/compare/card (body classes); a data lens hides everything. No DOM labels, nothing clickable.
- **Stars** (`stars()` in `globe.js`) are spread over the whole sky, but the 35° camera sees only ~5% of it: the counts in `perf.js` (2600 / 3800) give roughly 150 on screen. Normal blending with alpha falloff, never additive (the canvas is transparent and additive paints dark squares).
- **Day & night switch** (`#daynight-toggle`, `ei-daynight` in localStorage, on by default): `tickNight()` eases `SKY.uNight` (a 0–1 strength) to 1 or 0 (always 0 under a data lens); the look of night (dark moonlit blue, sharp terminator, warm dusk line) lives in the ocean and fill shaders. Don't set `uNight` directly elsewhere.
- **Games**: a wrong guess draws `MissLine` (guess → answer centroid, the same points the km figure uses) and `flyToBoth()` frames both; `onMiss(null)` clears it on next/finish/exit. Right/wrong chimes (`sounds/game-correct.mp3`, `game-wrong.mp3`) play only for real guesses, not "Show me".
- **Country of the day** (`js/daily-country.js`): same seed scheme as the Daily Challenge (local date) with its own salt; only countries in all three views. Chip shows once a day until opened or dismissed (`ei-cotd-seen`); also in the Play menu. Its facts appear as a note in that country's card.
- **Compare share image** (`js/share-image.js`): drawn on a 2D canvas with a Lambert equal-area projection per country at one shared km scale, so sizes stay true. Flags are fetched as SVG text and given a width/height before `drawImage`.
- **Phone footer**: `--links-h` (a ResizeObserver on `.site-links`) lifts the brand, quiz and legend above however many lines the links wrap to.
- **Border views are editorial and politically sensitive.** Change `tools/views.config.mjs` only on explicit request, explain the change in the PR, and update `docs/border-views.md`.
- `data/world.js` is ~1.1 MB and generated; CI fails if it is stale relative to the sources.
- Quiz questions only use keys that are a `country` in **all three** views, so a game survives view switches.
- **Text/SEO pages** (`docs/seo.md`): `about.html` … `contact.html` are hand-written; `countries/` (incl. `countries/region/`, `countries/ranking/`), `compare/`, `404.html`, `sitemap.xml`, `robots.txt`, `llms.txt` and the IndexNow key file are generated at deploy by `tools/build-pages.mjs _site` and never committed (`npm run build:pages` → `dist-pages/` to preview). Shared head/header/footer live in the script; after changing them run `node tools/build-pages.mjs --sync`. Config is `tools/site.config.mjs`; its `url` must equal `SITE_URL` in `js/site.js` and `goatcounter` must equal `GOATCOUNTER_CODE` in `js/analytics.js` (the build fails otherwise). Slugs are public URLs — don't rename them.
- **Service worker navigation**: only the scope root / `index.html` is mapped to the cached globe; every other navigation is network-first with a cached fallback. Never map all navigations to `./` again — it would serve the globe for `/countries/...`.

## Workflow

Owner's standing instruction: after finishing a change, open a PR, wait for CI, **merge it to `main` and confirm the Pages deploy** — unless told otherwise in that request.

## Testing

No unit-test framework yet. Verify changes by:
1. `npm run check`
2. Running the page and exercising the feature (Playwright works headless with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`; it renders ~1 fps, so wait on frames, not time).
   `window.EarthInteractive` exposes `globe, layer, compare, spin, thrills, quiz, search, setView(), setLens(), compareKeys()` for scripted checks.
3. Checking desktop (1280×800) and phone (390×844) layouts.
4. `npm run preview:pages` then `npm run smoke` (`tools/smoke.mjs`, needs Playwright): 24 scripted checks over search, pin/tag, card, compare, lenses, views, quiz, recenter and deep links on both sizes.
5. `npm run qa` (`tools/qa.mjs`, BASE = a running dev server): ~65 checks per size with real taps on the globe (selection, card, compare UI + drag + share image, lenses, search, keyboard, games with Confirm/Enter and the miss line, daily, toggles, deep links, resizes, overlapping controls) and a warm-up leak check. ~20 min headless; wait on state (`globe.flight`, body classes), never fixed timeouts.

Layout rule: phones and desktop show the same controls and links; panels (legend, quiz, compare) sit above the footer row and corner buttons, never over them.

## Open items

See `docs/roadmap.md`. Highest priority before launch: fresher population/GDP data, editorial review of border views, real recorded crowd audio, ad network integration, custom domain. Hosting: GitHub Pages via `.github/workflows/pages.yml` (deploys on push to `main`; publishes `index.html`, `manifest.webmanifest`, `sw.js`, `og-image.png`, `css/`, `js/`, `data/`, `vendor/` (incl. the self-hosted font), `icons/`, `sounds/` — add new top-level files there).
