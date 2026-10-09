# Architecture

Static site, no bundler. `index.html` loads `js/main.js` as an ES module; an importmap resolves `three` and
`three/addons/` to `vendor/three/`.

## Modules

| Module | Responsibility | Key exports |
|---|---|---|
| `main.js` | App state machine (`browse`, `pick`, `compare`, `quiz`), pointer & keyboard routing, deep links, render loop | `window.EarthInteractive` (debug API) |
| `globe.js` | Renderer, camera, OrbitControls (pinch zoom only), eased `zoomBy()`, idle auto-rotate flag, ocean shader (calm satellite blue, teal shallows from `data/ocean.png`, no waves), atmosphere, twinkling stars in three parallax layers, `fit()` sizing, `flyTo()` | `createGlobe`, `tickGlobe`, `LIGHT_DIR_VIEW`, `PINCH_MS` |
| `geo.js` | lon/lat ⇄ unit sphere, triangulation on the sphere, border segments, walls, centroids, ray–sphere, point-in-polygon | many helpers |
| `countries.js` | Builds each view as a few merged draws (one fill mesh, borders in two `LineSegments2`) styled per country through a float style texture; per-country overlay objects for highlighted / raised countries; palette, style states (hover, selected, dim, sockets, lens, quiz marks), picking grid | `CountryLayer`, `PALETTE`, `fillMaterial`, `lineMaterial` |
| `compare.js` | True-size compare: main-landmass extraction, pop-out pieces (top, walls, rim, shadow), side-by-side layout, dragging | `Compare` |
| `spin.js` | Flywheel rotation of the camera around the globe, plus the eased idle auto-rotate | `Spin`, `SPIN` |
| `thrills.js` | Rollercoaster audio: the recorded crowd loop, faded by spin speed | `Thrills`, `RideAudio`, `THRILLS` |
| `sun.js` | Sub-solar point → shared `uSun` / `uNight` uniforms | `SKY`, `updateSun`, `subsolarPoint` |
| `lens.js` | Quantile choropleths + legend | `LENSES`, `buildLens`, `renderLegend` |
| `search.js` | Search palette (combobox) | `createSearch` |
| `quiz.js` | Daily Challenge (seeded by local date) and Find it | `createQuiz` |
| `ui.js` | View switch pill, country card, compare bar, pick banner, tooltip, toast, first-run hint | `createUI`, `fmtArea` |
| `ads.js` | Side banners (≥ 1100 px) or one bottom banner (narrower screens), sizing; empty slots take no room on the public site (placeholders on localhost or `?ads=preview`) | `ADS`, `mountAds` |
| `pin.js` | Map pin for the selected country: an SVG DOM overlay placed at the projected anchor each frame (crisp at any DPR), with a drop-in animation | `Pin` |
| `load.js` | Streams `data/world.js` with loader progress, then evaluates it via a blob `import()` | `loadWorld`, `setLoader` |
| `miss-line.js` | Games: arc from a wrong guess to the answer, drawn in, with a distance label | `MissLine` |
| `currents.js` | Major ocean currents along their charted mean paths: a faint lighter sheen with meanders and weaving streamlines whose streaks drift downstream, labels (name, direction, strength) and ocean names; decluttered by zoom, hidden under data lenses | `Currents`, `CURRENTS`, `OCEANS` |
| `ships.js` | Low-poly cartoon ships on sea lanes between big ports, one instanced draw call | `Ships`, `ROUTES` |
| `clouds.js` | Light clouds over the open ocean, desktop only, masked away from big landmasses | `Clouds` |
| `intro.js` | First visit: the animated finger that shows the globe can be spun | `showIntro` |
| `site-menu.js` | Phones: the brand opens the site links as a small menu | `mountSiteMenu` |
| `popclock.js` | World population, live (UN WPP 2024 estimate, births and deaths today); fades by zoom and around panels | `createPopClock`, `worldPopulation` |
| `daily-country.js` | Country of the day (seeded by local date), its facts, the top chip | `countryOfTheDay`, `factsFor`, `mountDailyChip` |
| `share-image.js` | Compare → 1080² share image (equal-area silhouettes on a 2D canvas), share sheet or download | `renderCompareImage`, `shareCompareImage` |
| `sfx.js` | UI sounds: synthesised tones + recorded samples (`sounds/`), delegated button sounds | `createSfx` |
| `flags.js` | Flag `<img>` markup from `vendor/flags/` with emoji fallback | `flagImg` |
| `music.js` | Background music (on by default for a first visit, starts with the first tap or key), remembered | `createMusic` |
| `sheet-drag.js` | Finger-following drag for the phone bottom sheets (card, compare stats): settles by position and flick | `attachSheetDrag` |
| `leaderboard.js` | Leaderboard panel under a finished game (name field, top 10); hidden while no API is configured | `createLeaderboard` |
| `net/api.js` | Client for the leaderboard API (`server/`): never throws, resolves to null offline or with `API_BASE` empty | `getPlayer`, `setName`, `submitScore`, `getLeaderboard` |
| `net/profanity.js` | The one copy of the display-name filter (the Worker re-exports it) | `cleanName`, `nameProblem` |
| `net/names.js` | Witty starter names for the leaderboard | `generateName` |
| `analytics.js` | GoatCounter page and event counts plus error reports; does nothing until a code is set | `track` |
| `site.js` | The public site address and the base for share links | `SITE_URL`, `shareBase` |
| `app-links.js` | "Get the app" store links (render nothing until filled in, or inside the app) | `mountStoreBadges` |
| `native.js` | Native app only (Capacitor): AdMob, consent, haptics, back button; never loaded by the website | `initNative` |
| `perf.js` | Device quality tier (`low` on touch/weak devices; `?quality=low\|high` overrides) and the resolution governor that lowers the pixel ratio when frames run long | `TIER`, `QUALITY`, `ResolutionGovernor` |

## Rendering order

1. Ocean sphere (opaque, writes depth, `renderOrder -10`); current ribbons (`-5`, over the sea, under every fill)
2. Country fills: one merged mesh per view (`renderOrder 1`; transparent, no depth test, stencil-once, far side discarded in shader). Buffer order = the fixed per-country order (type, then index). Style per country comes from the view's style `DataTexture`; countries wholly behind the horizon (`CountryLayer.cull()`) or drawn by their own overlay are collapsed in the vertex shader. A raised country's own fill draws at `1.95` (stencil Always).
3. Country borders: two merged `LineSegments2` per view (borders ordered before / after the ships at `renderOrder 2.5`), depth-tested at r = 1.0028, per-segment colour, width and dashing from the style texture. Overlay borders: the country's `lineOrder`, or `3` when selected, hovered or quiz-marked; the raised glow at `2.99`.
   Ships and their wakes (`2.5`, `2.45`) draw between the two border batches; clouds (`2.9`, desktop only) over the fills;
   current and ocean names (`2.95`, no depth test, stencil equal 0 so never over land or a piece).
4. Compare pieces: shadow → walls → top → rim (`renderOrder 10 + 4·z`)
5. Atmosphere (additive, back-side) and the three star layers

## Data model (`data/world.js`)

```js
{
  defaultView: 'defacto',
  precision: 1000,                 // coordinates are integers / precision (degrees)
  views: { un, defacto, neutral }, // each: { label, blurb, units: [ { k, g, n, t, c, note?, area, m?, mod? } ] }
  geoms: [ /* multipolygon → polygons → rings → delta-encoded [dx, dy, …] */ ],
  info:  { [key]: { name, formal, flag, iso2, capital, pop, popYear, gdp, gdpYear, continent, subregion,
                    languages, currencies, unMember, sovereign, status, landlocked, areaOfficial, wikidata,
                    borders: [keys], alt: [names] } },
}
```

`t` (kind): `country | territory | limited | breakaway | disputed`. `c`: palette index (0 = disputed grey,
1–9 = Natural Earth MAPCOLOR9 so neighbours differ). `mod`: geometry was changed by the view's rules.

Geometries are shared between views when identical (292 geometries for ~750 view-units).
