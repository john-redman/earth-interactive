# Third-Party Notices

EarthInteractive uses the following open-source projects:

## Runtime

| Component | License | Usage | Attribution |
|-----------|---------|-------|-------------|
| **three.js** (r170) | MIT | Vendored at `vendor/three/` | © 2010–2024 three.js authors |
| **Natural Earth** | Public Domain | Borders (Admin-0, breakaway/disputed areas) at 1:50m | [naturalearthdata.com](https://www.naturalearthdata.com) |
| **mledoze/countries** | ODbL 1.0 | Country facts (capital, languages, currency) | Attribution required; shown in footer |
| **World Bank WDI** | CC BY 4.0 | Population (SP.POP.TOTL) and GDP, current US$ (NY.GDP.MKTP.CD) | Attribution required; shown in footer |
| **flag-icons** (7.5.0) | MIT | Flag SVGs vendored at `vendor/flags/` (only the codes the map uses) | © 2013 Panayiotis Lipiridis |
| **Plus Jakarta Sans** (v12, variable 400–800) | OFL 1.1 | UI typography; latin + latin-ext WOFF2 subsets self-hosted at `vendor/fonts/plus-jakarta-sans/` (from Google Fonts), licence text in `OFL.txt` there | © 2020 The Plus Jakarta Sans Project Authors (Tokotype) |

## Build-time only

| Component | License | Usage |
|-----------|---------|-------|
| **d3-geo** | ISC | Spherical geometry calculations in data build |
| **polygon-clipping** | MIT | Border polygon operations in data build |

---

## Attribution

**Borders**: © [Natural Earth](https://www.naturalearthdata.com). Used under public domain.

**Country Data**: Data sourced from [mledoze/countries](https://github.com/mledoze/countries) under the [ODbL 1.0 license](https://opendatacommons.org/licenses/odbl/). Attribution: shown in the page footer.

**Population & GDP**: The World Bank, *World Development Indicators*: Population, total (SP.POP.TOTL) and
GDP (current US$) (NY.GDP.MKTP.CD), latest available year per country (population 2025, GDP mostly 2024),
retrieved October 2026. Source: [data.worldbank.org](https://data.worldbank.org), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Figures are unchanged apart from rounding
(GDP to millions of US$); the app keeps the Natural Earth estimate (mostly 2019) for places the World Bank
does not report separately (e.g. Taiwan, Somaliland, Northern Cyprus, Western Sahara, small territories)
or where its figure is older. The year shown next to each value says which applies.

**Audio**: the recorded files under `sounds/` are listed in the Audio section below.

---

## License compliance

- ✅ Natural Earth: Public domain, attribution appreciated
- ✅ mledoze/countries: ODbL attribution shown in footer of `index.html`
- ✅ World Bank WDI: CC BY 4.0 attribution shown in footer of `index.html` and above
- ✅ three.js: MIT, included in this file
- ✅ Plus Jakarta Sans: OFL 1.1, self-hosted Google Fonts subsets with the licence file alongside (the font declares no Reserved Font Name)
- ✅ d3-geo & polygon-clipping: Build-time only, not bundled

## Audio

Supplied by the owner as licence-free files (Pixabay Content License: free for commercial use, no attribution required). Credited here anyway.

| File | Source file | Use |
|------|-------------|-----|
| `sounds/pin-drop.mp3` | "Plop sound made with my mouth" (freesound_community, Pixabay #100690) | Pin drop |
| `sounds/crowd-panic.mp3` | "Time traveling city crowd panic scream 1" (Pixabay #390796), trimmed into a seamless loop | Rollercoaster screams |
| `sounds/swipe.mp3` | "Swipe" (u_nharq4usid, Pixabay #255512) | Cards opening (reversed when closing) |
| `sounds/click.mp3` | "Click sound" (justsomesounds, Pixabay #432501) | Compare pieces snapping out (reversed when snapping back) |
| `sounds/game-correct.mp3` | "Correct choice" (freesound_community, Pixabay #43861) | Right answer in the games |
| `sounds/game-wrong.mp3` | "Error notification 08" (Universfield, Pixabay #206492) | Wrong answer in the games |
| `sounds/celestial-drift.mp3` | "Celestial Drift" (lilliben, Pixabay #365162) | Optional background music |

All other interface tones are synthesised in the browser.
