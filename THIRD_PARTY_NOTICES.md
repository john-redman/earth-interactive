# Third-Party Notices

EarthInteractive uses the following open-source projects:

## Runtime

| Component | License | Usage | Attribution |
|-----------|---------|-------|-------------|
| **three.js** (r170) | MIT | Vendored at `vendor/three/` | © 2010–2024 three.js authors |
| **Natural Earth** | Public Domain | Borders (Admin-0, breakaway/disputed areas) at 1:50m | [naturalearthdata.com](https://www.naturalearthdata.com) |
| **mledoze/countries** | ODbL 1.0 | Country facts (capital, languages, currency) | Attribution required; shown in footer |
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

**Population & GDP**: Estimates from Natural Earth (mostly 2019 data).

**Audio**: All rollercoaster sounds (crowd, dread bed, fly-by screams, wind) are synthesised in the
browser by `js/thrills.js`; no third-party recordings are bundled. Any recorded loop added under
`sounds/` must be CC0 / public domain and listed here with title, author, URL and licence.

---

## License compliance

- ✅ Natural Earth: Public domain, attribution appreciated
- ✅ mledoze/countries: ODbL attribution shown in footer of `index.html`
- ✅ three.js: MIT, included in this file
- ✅ Plus Jakarta Sans: OFL, loaded from Google Fonts
- ✅ d3-geo & polygon-clipping: Build-time only, not bundled
