# Changelog

All notable changes to EarthInteractive are documented here.

## [Unreleased]

### Added
- **Arrow keys move a lifted country** (Move or Compare): it glides up, down, left and right as seen on screen; hold Shift to go faster. In a comparison, 1 and 2 choose which piece.
- **Ships**: tiny cartoon boats (with containers, a white bridge, a red funnel and a little wake) sail the main sea lanes between the big ports: Asia to Europe through Suez and round the Cape, across the Pacific and the Atlantic, through Panama, out of the Gulf and more. One instanced draw call for all of them, on every device.
- **Clouds** (desktop): very light clouds drift slowly over the open ocean with the prevailing winds and thin out before they reach land; they pass over small islands instead of swerving round them.
- **"We love the Earth"**: a link to Lil Dicky's *Earth* video on YouTube in the footer (globe and text pages).
- **World population, live**: a quiet strip at the bottom with an estimate that ticks up in real time (UN World Population Prospects 2024) and today's births and deaths. It fades out as you zoom in and comes back as you zoom out, and steps aside for cards, games, comparisons and data lenses.
- **Move a country freely**: the pin's tag has a **Move** button, or press and hold the pinned country, and it lifts out and follows your finger or mouse anywhere on the globe. Tap another country while it is lifted and the same piece becomes a size comparison; Compare works the same way round (drag first, then choose). One banner, one Put back button for both.
- **A satellite-style ocean with its currents**: a medium ocean blue with fine swell lines in long, gently curving rows that drift over all open water (no more white crests bunched in the storm belts), and about 20 major surface currents drawn as dark lines whose dashes run with the flow, each labelled with its name, direction and typical speed. Ocean names sit on the water in the same type, larger. Labels thin out when zoomed out and step aside for data lenses, games, compare and country cards.
- **Card never covers its country**: the card docks on the right (bottom sheet on phones) and the globe turns and zooms so the country sits in the free space.
- **Games use the UN map** automatically, and your view comes back afterwards.
- **Games: miss line**: after a wrong answer, a line arcs from your guess to the right country with the distance on it, and the camera frames both.
- **Games: right/wrong sounds** (the owner's recordings).
- **Country of the day**: a chip at the top (once a day) and in the Play menu; flies there and opens the card with two facts.
- **Day & night switch** (corner button, on by default, remembered).
- **Compare → Share image**: a square image of both countries at true size with the ratio, population and link, shared via the share sheet or downloaded.
- **Stars**: a light scatter of soft, slowly twinkling stars.

### Fixed
- **Pins and game distances land on the country's own land**: 34 countries (e.g. Japan, whose main island curves round the sea) had their pin, fly-to point and "N km away" distance in the sea or a neighbour.
- **Enter to confirm a guess** no longer skips straight past the result to the next question.
- **Phone app build** now includes the sounds.
- Escape (and the app's back button) closes search from anywhere; the screams pause when the tab is hidden; reduced motion freezes the water patches and the star twinkle; links accept lower-case country codes (`?c=fra`, `?compare=fra,esp`).

### Changed
- **Ships**: smaller from afar and bigger up close (they grow with the globe), and a softer wake: a fan of foam that fades behind each ship, shown once ships are big enough to read.
- **No more waves**: the white crests are gone from the ocean on every device; the sea is calm and still.
- **Current lines no longer look like scars**: the dark bands are gone. Each current is now a faint lighter sheen with soft trails of light drifting slowly downstream, tinted a touch warm or cool. They are barely there at globe view and come up as you zoom in.
- **Phone: the pick banner sits at the top**, under the view switch, so it no longer covers the footer buttons.
- **Ocean**: the swell lines are gone. A few crusty, snowy white crests are scattered at random (each its own shape, size and angle, lit with a soft shadow), more along the stormy tracks.
- **Labels**: current names sit on one smooth arc with a proper arrow and a soft halo; Arctic and Southern Ocean names run straight across open water instead of bending round the pole.
- **Currents and ocean names are printed on the globe**: they curve with the sphere and turn with it, instead of floating upright over it. Current lines are soft, feathered bands that meander a little, with faint streaks drifting along.
- **The ocean is calm and mostly still**: white crests now sit still on the swell (a bright top with a soft shadow, so they look raised), a few everywhere and more along the storm tracks; only here and there does the water sway, slowly. Nothing piles up at the poles any more.
- **Returning visitors see a new deploy straight away** (one quiet reload when the new version takes over in the first seconds of a visit).
- **Games**: the map view is locked to UN while playing, and the Search/Play/Data dock hides on desktop too (it already did on phones). Compare keeps the dock on phones as on desktop.
- **Phones**: search raises the keyboard on iOS; the globe draws at half rate while nothing moves (saves battery); Share image asks for a second tap if the phone refused the share sheet after a slow render; pulling the card sheet up keeps the country visible above it.
- `?compare=X,X` (the same country twice) is ignored.
- **Day & night is clearer**: a darker, moonlit-blue night side, a sharper terminator and a slightly brighter day side.
- **Switching views clears the pin** (a spot can belong to a different country in another view).
- Pins and fly-tos aim at a country's main landmass (France no longer pins into Spain).
- **Rollercoaster is screams only**: the wind, the low drone and the dread bed are gone.
- **Zoom leaves rotation alone**: scrolling, pinching and +/- never stop a spin or the idle rotation; wheel and key zoom ease smoothly. The idle rotation eases in and out.
- **Compare pieces float higher** with a soft shadow that falls away from the light, a light rim and a more solid top.
- **Compare is silent on press** (the bell is gone; the piece's click remains).
- **Spin** slows down a little sooner.
- **Polish**: floating text stays readable over bright countries, tidier text wrapping, aligned numbers in stat tables, slim scrollbars, no grey tap flash on phones; the gesture hint hides once a country is open.
- **Compare**: the first country lifts out (with its click) as soon as you press Compare, and you can drag it around while choosing the second; cancelling sinks it back.
- **Pin drop**: just the plop, landing exactly when the pin hits the globe (shorter drop with a small settle bounce); the extra tones are gone.
- **Rollercoaster**: only the recorded crowd now (no synthesised voices or fly-by screams), played without 3D panning or pitch drift.
- **Game answers stand out**: the correct country lifts off the globe with a thick white border and bright light running round its outline. Guesses are two-step: a tap drops the pin with *Confirm* / *Not here*.
- **Selected country lifts** with a soft white glow.
- **Disputed areas** get a light dashed border and stripes in different directions per piece; white countries get a softer edge.
- **Sound**: recorded swipe (cards open, reversed on close), pin-drop plop, compare click (reversed when pieces return) and a recorded panicking crowd for the rollercoaster, layered with the existing synthesised tones.
- **Cards glide** in and out (sheet slides on phones, fade-rise on desktop) instead of popping.
- **Spin** loses momentum a little faster while staying fluid.
- **SEO**: region and ranking pages, question-style headings, regional breadcrumbs, official areas for small places, share links on compare pages, llms.txt, IndexNow, self-hosted font.
- **Same on phone and desktop**: phones now show all footer links (plus a *Data credits* link where desktop shows the credit line); the data legend and the game panel sit above the footer and corner buttons on both, so nothing overlaps.
- Shared compare links read `?compare=FRA,BRA` instead of `FRA%2CBRA`.
- **Solid countries**: fills are fully opaque (colour toned towards deep ocean blue), so the sea no longer shows through.
- **No border flicker at the horizon**: border segments on the far side of the globe are discarded in the shader, like the fills; depth testing against the faceted ocean let them poke out near the edge.
- **Softer wind** at the start of a fast spin: gentle low-pass, slow swell, lower level.
- **Click feedback**: soft synthesised UI sounds (wooden knock, sail-flap whoosh, low marimba/bell tones; follows the mute button), a ripple where you tap the globe and a gentle press animation on buttons.
- **Fresher population and GDP**: figures now come from the World Bank (World Development Indicators, CC BY 4.0): population for 2025 and GDP mostly for 2024, replacing Natural Earth's 2019 estimates for 215 places. Ranks, density, GDP per person, the data lenses and compare stats all use them; places the World Bank doesn't cover (e.g. Taiwan, Somaliland) keep the older estimate, and every card shows the year.
- **Terrifying ride audio**: the rollercoaster crowd now panics instead of cheering: shrieks, wails and distant groans in a dissonant cluster, a throbbing sub-bass dread drone that swells with spin speed, and blood-curdling fly-by screams that rush past via HRTF. Still fully synthesised (no recordings bundled).
- **Steady borders**: every country gets a fixed draw order (overlays last), so shared borders and overlapping fills no longer swap places as the globe turns. Phone borders are simplified per shared stretch, so neighbours still meet on exactly the same line (98k → 32k segments).
- **HD pin**: the map pin is a crisp SVG overlay at full device resolution, with a drop-in bounce and ground shadow.
- **Cards follow your finger**: the phone card and the compare stats panel track the drag 1:1 and settle by position and flick speed (short ↔ full ↔ closed). Swipe up on the compare pill to open the stats.
- **Leaderboard names** start with a witty geography suggestion ("Tectonic Toucan 42", "Lord of the Fjords"); *Shuffle* for another, or type your own.
- **Less covering the globe**: tapping a country now drops a 3D pin with a small tag (flag, name, *Compare*, *Info*). The full card opens only from *Info*; closing it returns to the tag. Comparisons show only a *Compare stats* pill (plus ✕ to end) at the bottom; the full stats panel opens from it.
- **Livelier ocean**: faster, cross-warped swells, rolling swell bands, stronger glints and glittering crests.

### Fixed
- The service worker no longer answers every navigation with the globe; text pages load from the network with an offline copy.

### Added
- **Background music** (*Celestial Drift*), off by default, with its own button.
- `tools/smoke.mjs` (`npm run smoke`): browser smoke test of the main flows on desktop and phone sizes.
- **Findable on the web**: About, How to play, Why maps lie, Privacy, Terms and Contact pages; one generated page per country (~217) and 150 true-size comparison pages, each with its own facts, Mercator stretch and a link that opens the globe; A–Z and comparison indexes, sitemap, robots.txt and a helpful 404. Built at deploy time by `tools/build-pages.mjs` (`docs/seo.md`).
- **Globe page SEO**: keyword title and description, `WebSite` + `WebApplication` structured data, a small link row under the brand, and a `<noscript>` summary.
- **Analytics and tips, off until configured**: cookieless GoatCounter page and event counts (`js/analytics.js`), and a Ko-fi "Support" link; both are set in `tools/site.config.mjs`.
- **Self-hosted leaderboard server**: the same API now runs on plain Node 22 + SQLite (`server/node/`), with Docker + Caddy (HTTPS), systemd units, nightly backups and a $0 Oracle Cloud guide in `docs/backend.md`. Cloudflare remains an option.
- **Mobile app shell**: Capacitor project in `app/` (iOS + Android), `js/native.js` (AdMob banner/interstitial/rewarded with consent + ATT, haptics, back button), store badges (`js/app-links.js`, hidden until links exist) and the publishing plan in `docs/mobile-app.md`.
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
