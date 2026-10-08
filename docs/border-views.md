# Border-view policy

The three views are defined in `tools/views.config.mjs` and applied at build time. **These are editorial decisions on
politically sensitive topics** — they are a reasonable starting point, not legal advice, and should be reviewed before
launch. Any change must be documented here.

Base layer: Natural Earth 1:50m Admin-0 (Natural Earth's default is de facto control).
Overlays: Natural Earth 1:50m breakaway & disputed areas, re-assigned per view with polygon boolean ops.

## UN Standard
- Merged: Kosovo → Serbia (UNSCR 1244 note), Taiwan → China ("Taiwan, Province of China"), Northern Cyprus → Cyprus, Somaliland → Somalia.
- Re-assigned: Crimea → Ukraine (GA res. 68/262), Golan Heights → Syria (SC res. 497), Moroccan-administered Western Sahara → Western Sahara (Non-Self-Governing Territory).
- Shown as disputed (grey, hatched): Jammu & Kashmir, Gilgit-Baltistan, Aksai Chin, Shaksam Valley, Siachen Glacier, Abyei.
- Palestine labelled "State of Palestine" (UN non-member observer state).

## De Facto Control
- Natural Earth defaults, plus: Abkhazia, South Ossetia, Transnistria as separate breakaway units; the Donetsk/Luhansk overlay polygons assigned to Russia; Siachen merged into India.
- **Known limitation:** the Donetsk/Luhansk polygons follow the pre-2022 line; the current line of control extends further. Needs a newer source.
- Western Sahara split along the berm (Moroccan-administered / Polisario-held).

## Recognition Neutral
- Every Natural Earth breakaway/disputed area becomes its own grey hatched unit, with "administered by / claimed by" notes.
- States with limited recognition (Kosovo, Taiwan, Northern Cyprus, Somaliland, Palestine, Western Sahara) are shown as their own units with a "Limited recognition" badge.

## Change log
| Date | Change | By |
|---|---|---|
| 2026-10-02 | Initial rules | John / Claude |

## Population double counts (Cyprus, Somalia)

Population and GDP sources count the whole island of Cyprus and the whole of Somalia, so in the De Facto and Neutral
views, where Northern Cyprus and Somaliland stand apart with their own estimates, those people would be counted twice.
The figures are left as published (subtracting would mix sources and years). Instead, each of the four cards carries a
note saying so, and `COUNTED_WITHIN` in `tools/views.config.mjs` (→ `info[k].within` in `data/world.js`) keeps totals,
such as the world and region figures on the text pages, from counting them twice.

