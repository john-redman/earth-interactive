# Changelog

All notable changes to EarthInteractive are documented here.

## [Unreleased]

### Changed
- **Terrifying ride audio**: the rollercoaster crowd now panics instead of cheering: shrieks, wails and distant groans in a dissonant cluster, a throbbing sub-bass dread drone that swells with spin speed, and blood-curdling fly-by screams that rush past via HRTF. Still fully synthesised (no recordings bundled).
- **Steady borders**: every country gets a fixed draw order (overlays last), so shared borders and overlapping fills no longer swap places as the globe turns. Phone borders are simplified per shared stretch, so neighbours still meet on exactly the same line (98k → 32k segments).
- **HD pin**: the map pin is a crisp SVG overlay at full device resolution, with a drop-in bounce and ground shadow.
- **Cards follow your finger**: the phone card and the compare stats panel track the drag 1:1 and settle by position and flick speed (short ↔ full ↔ closed). Swipe up on the compare pill to open the stats.
- **Leaderboard names** start with a witty geography suggestion ("Tectonic Toucan 42", "Lord of the Fjords"); *Shuffle* for another, or type your own.
- **Less covering the globe**: tapping a country now drops a 3D pin with a small tag (flag, name, *Compare*, *Info*). The full card opens only from *Info*; closing it returns to the tag. Comparisons show only a *Compare stats* pill (plus ✕ to end) at the bottom; the full stats panel opens from it.
- **Livelier ocean**: faster, cross-warped swells, rolling swell bands, stronger glints and glittering crests.

### Added
- **Leaderboard scaffold**: Cloudflare Worker + D1 API (`server/`), browser client (`js/net/`), name entry with a profanity filter and top-10 boards on the quiz end screen. Dormant until `API_BASE` is set — see `docs/backend.md`.
- **Compare stats**: pull up the compare bar (handle, swipe up, or *Compare stats*) for a side-by-side table: population, area, density, GDP, GDP per person, neighbours, capital, region, languages and currency, with the larger value highlighted and the ratio shown.
- **Phone country card** opens as a short peek (name, flag, key facts) so the globe stays visible; swipe up or tap the handle for everything, swipe down to close.
- **Flag images** in the country card and search (Windows doesn't render flag emoji).
- **Installable app + offline**: web app manifest, icons and a service worker; repeat visits load from cache.
- **Link previews**: Open Graph / X card tags and a 1200×630 preview image.
- **Loading progress**: the loader shows the data download and country drawing, with a progress bar.
- **Bottom ad banner** on phones and tablets (728×90 / 468×60 / 320×50); the stage shrinks so it never covers controls.
- **Recenter button** (bottom right, or <kbd>R</kbd> / <kbd>Home</kbd>): closes cards and compare, flies back to the start-up framing and resumes the idle spin.

### Changed
- Phones draw simplified borders (98k → 31k segments); fills keep full detail.
- With *reduce motion* on, the globe no longer auto-rotates and flights jump straight to their target.
- The globe no longer starts auto-rotating while a country card is open; the idle spin resumes after the card is closed.
- **Mobile performance**: phones and tablets render with a lighter quality tier (no MSAA, pixel ratio capped at 1.5, cheaper ocean shader, lighter spheres, solid panels instead of live background blur), and an adaptive governor lowers resolution further when the frame rate drops. Force a tier with `?quality=low|high`.
- Countries entirely behind the horizon are no longer drawn (roughly 25–80% fewer draw calls depending on the view).
- Triangulation measures edge length on the sphere, cutting fill triangles from ~307k to ~101k (Antarctica alone was ~208k) and speeding up start-up.

## [0.4.0] – 2026-10-02

### Added
- **Search**: Countries, capitals, and alternative names via `/` or Ctrl/⌘K
- **Daily Challenge**: Same 5 countries for everyone each day; shareable emoji result grid
- **Find it game**: 10 rounds of increasing difficulty; distance-based scoring
- **Data lenses**: Recolour globe by population, density, GDP per person, or area (quantile choropleth with legend)
- **Live day/night**: Real-time shading from sub-solar point calculation
- **Country cards**: Capital, population/area ranks, density, GDP, languages, currency, clickable neighbours
- **Deep linking**: `?c=FRA`, `?compare=FRA,DEU`, `?play=daily`, `?view=un` combinations
- **GitHub Actions CI**: Validates all modules parse and data is consistent on every push

### Changed
- **Spin mechanics**: Globe now maintains momentum (friction-based slowdown); rollercoaster audio only at high speed thresholds
- **Triangulation**: Switched from 4-way to longest-edge bisection (max 6° edge) for better performance on large polygons

### Fixed
- Stencil blending for country fills to prevent bright seams on shared edges
- Line resolution in CSS pixels with proper resize handling

---

## [0.3.0] – 2026-09-20

### Added
- **True-size compare mode**: Pop-out curved puzzle pieces with side-by-side layout
- **Three border views**: UN Standard, De Facto Control, Recognition Neutral
- **Country picking**: Click countries to open details card
- **Dragging support**: Move globe pieces and compare mode components

---

## [0.2.0] – 2026-09-05

### Added
- **Ocean shader**: Animated water with normal mapping
- **Atmosphere**: Procedurally rendered glow around sphere
- **Stars**: Background starfield with realistic distribution
- **Keyboard controls**: Arrow keys to spin, +/- to zoom, Esc to close dialogs
- **Sound toggle**: Mute/unmute button for audio

---

## [0.1.0] – 2026-08-15

### Added
- Initial globe renderer with Three.js
- Camera and OrbitControls (zoom only)
- Flywheel rotation system with momentum
- Basic country rendering
- Ad slot placeholder HTML
- Vendored Three.js r170
