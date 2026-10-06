# Source data

Inputs for `npm run build:data`. Do not edit by hand — replace with a newer upstream copy and rebuild.

| File | Upstream | Revision | Licence |
|---|---|---|---|
| `ne_50m_admin_0_countries.geojson` | [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector) `geojson/` | `ca96624` (2022-06-02, Natural Earth v5.1.x) | Public domain |
| `ne_50m_admin_0_breakaway_disputed_areas.geojson` | same | same | Public domain |
| `mledoze-countries.json` | [mledoze/countries](https://github.com/mledoze/countries) `countries.json` | `c2ac004` (2026-09-29) | ODbL 1.0 |
| `worldbank-wdi-2026-10.json` | World Bank [World Development Indicators](https://data.worldbank.org): `SP.POP.TOTL`, `NY.GDP.MKTP.CD` | retrieved 2026-10-05 (see below) | CC BY 4.0 |

## Population and GDP

`build-data.mjs` takes population and GDP from `worldbank-wdi-*.json` (latest non-null year per economy:
population 2025, GDP mostly 2024) and falls back to Natural Earth's `POP_EST` / `GDP_MD` (mostly 2019) when the
World Bank has no figure for a unit or only an older one. `popYear` / `gdpYear` record which year each value is
from, and the card shows it. GDP is stored in **millions of US$**, as before.

Natural Earth `ADM0_A3` keys map to World Bank codes via `ISO_A3`, plus `WB_ALIAS` in `build-data.mjs`
(`KOS`→`XKX`, `SDS`→`SSD`, `PSX`→`PSE`, `FRA`/`NOR` whose `ISO_A3` is `-99`). Somaliland, Northern Cyprus,
Siachen, Western Sahara, Åland, Jersey and Guernsey are never overwritten (the World Bank does not report them
separately; `CHI` is Jersey + Guernsey combined). Disputed overlays (`X_*`) always keep Natural Earth data.
Note: World Bank figures for Somalia and Cyprus cover the whole internationally recognised territory, so they
include Somaliland / Northern Cyprus.

**Provenance of the 2026-10 pin.** `api.worldbank.org` and the World Bank download sites were blocked by the
build machine's network policy, so the WDI series were taken from GitHub mirrors:

- `SP.POP.TOTL`: [datasets/population](https://github.com/datasets/population) `data/population.csv` @ `d4b1a4a`
  (WDI converted to long CSV; 2025 values for all 217 economies).
- `NY.GDP.MKTP.CD`: the verbatim World Bank bulk file `API_NY.GDP.MKTP.CD_DS2_en_csv_v2_2025.csv`
  ("Last Updated Date" 2026-04-08) in [world-inequality-database/wid-world](https://github.com/world-inequality-database/wid-world)
  `data-input/wb-data/gdp-current-usd/` @ `97f5aa6`.

To refresh, download both indicators (preferably straight from the World Bank, e.g.
`https://api.worldbank.org/v2/en/indicator/SP.POP.TOTL?downloadformat=csv`), then

```bash
node tools/sources/pin-wdi.mjs API_SP.POP.TOTL_….csv API_NY.GDP.MKTP.CD_….csv tools/sources/worldbank-wdi-YYYY-MM.json
```

update `WDI_FILE` in `build-data.mjs`, delete the old pin and run `npm run build:data`. The build never fetches.
