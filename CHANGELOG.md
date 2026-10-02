# Changelog

All notable changes to EarthInteractive are documented here.

## [Unreleased]

### Changed
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
