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
| **Plus Jakarta Sans** | OFL 1.1 | UI typography | © Tokotype (via Google Fonts) |

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

**Audio**: All rollercoaster sounds (crowd, dread bed, fly-by screams, wind) are synthesised in the
browser by `js/thrills.js`; no third-party recordings are bundled. Any recorded loop added under
`sounds/` must be CC0 / public domain and listed here with title, author, URL and licence.

---

## License compliance

- ✅ Natural Earth: Public domain, attribution appreciated
- ✅ mledoze/countries: ODbL attribution shown in footer of `index.html`
- ✅ World Bank WDI: CC BY 4.0 attribution shown in footer of `index.html` and above
- ✅ three.js: MIT, included in this file
- ✅ Plus Jakarta Sans: OFL, loaded from Google Fonts
- ✅ d3-geo & polygon-clipping: Build-time only, not bundled
