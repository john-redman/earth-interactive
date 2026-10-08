/**
 * Border "views" — the editorial rules behind the three map modes.
 *
 * Base layer  : Natural Earth 1:50m Admin-0 countries (Natural Earth's own default is de facto control).
 * Overlays    : Natural Earth 1:50m "breakaway & disputed areas" (referenced below by their BRK_NAME).
 *
 * For every view you can:
 *   merge    : { TARGET_KEY: [OTHER_KEYS…] }   fold base units into another (borders between them dissolve)
 *   overlays : { "Overlay name": rule }        re-assign a disputed area. Rules:
 *                 { to: "KEY" }                 → becomes part of that unit
 *                 { own: true, kind, name }     → becomes its own unit (kind: "disputed" | "breakaway")
 *              Any overlay not listed stays with whichever base unit already contains it.
 *   units    : { KEY: { name?, kind?, note? } } rename / annotate units for that view
 *
 * kind controls styling & the popup badge:
 *   "country"  (default) · "territory" · "limited" (limited recognition) · "breakaway" · "disputed"
 *
 * ⚠️ These choices are editorial and politically sensitive. They are a reasonable starting point,
 *    not legal advice — please review them (ideally with someone who knows the subject) before launch.
 */

const KASHMIR = ['Jammu and Kashmir', 'Gilgit-Baltistan', 'Aksai Chin', 'Shaksam Valley', 'Siachen Glacier'];

export const VIEWS = {
  // ─────────────────────────────────────────────────────────────── UN STANDARD
  un: {
    label: 'UN Standard',
    blurb: 'Borders as recognised by the United Nations and its member-state system.',
    merge: {
      SRB: ['KOS'],   // UN: Kosovo within the framework of UNSCR 1244
      CHN: ['TWN'],   // UN: "Taiwan, Province of China"
      CYP: ['CYN'],   // Northern Cyprus not recognised
      SOM: ['SOL'],   // Somaliland not recognised
    },
    overlays: {
      'Crimea':          { to: 'UKR' },
      'Golan Heights':   { to: 'SYR' },
      'W. Sahara':       { to: 'SAH' },
      ...Object.fromEntries(KASHMIR.map(n => [n, { own: true, kind: 'disputed', note: 'Final status of Jammu and Kashmir has not yet been agreed upon by the parties.' }])),
      'Abyei':           { own: true, kind: 'disputed', note: 'Special administrative status; final status not yet determined.' },
    },
    units: {
      SRB: { note: 'Includes Kosovo — referenced in the context of UN Security Council resolution 1244 (1999).' },
      CHN: { note: 'Includes Taiwan, referred to by the UN as "Taiwan, Province of China".' },
      CYP: { note: 'Includes the area north of the UN buffer zone.' },
      SOM: { note: 'Includes Somaliland, which is not recognised as a separate state.' },
      SAH: { name: 'Western Sahara', kind: 'territory', note: 'Listed by the UN as a Non-Self-Governing Territory.' },
      PSX: { name: 'State of Palestine', kind: 'limited', note: 'UN non-member observer state.' },
      UKR: { note: 'Includes Crimea (UN General Assembly resolution 68/262).' },
      SYR: { note: 'Includes the Golan Heights (UN Security Council resolution 497).' },
      KAS: { kind: 'disputed' },
    },
  },

  // ─────────────────────────────────────────────────────────── DE FACTO CONTROL
  defacto: {
    label: 'De Facto Control',
    blurb: 'Who actually administers each area on the ground today.',
    merge: {
      IND: ['KAS'],   // Siachen Glacier is held by India
    },
    overlays: {
      'Abkhazia':      { own: true, kind: 'breakaway', name: 'Abkhazia', note: 'Self-administered with Russian backing; claimed by Georgia.' },
      'South Ossetia': { own: true, kind: 'breakaway', name: 'South Ossetia', note: 'Self-administered with Russian backing; claimed by Georgia.' },
      'Transnistria':  { own: true, kind: 'breakaway', name: 'Transnistria', note: 'Self-administered; claimed by Moldova.' },
      "Donetsk People's Republic": { to: 'RUS' },
      "Luhansk People's Republic": { to: 'RUS' },
    },
    units: {
      RUS: { note: 'Shown with Crimea and parts of Donetsk & Luhansk. ⚠️ Source polygons follow the pre-2022 line — the current line of control extends further.' },
      SAH: { name: 'Western Sahara (Polisario-held)', kind: 'limited', note: 'Area east of the Moroccan berm, held by the Polisario Front / SADR.' },
      MAR: { note: 'Shown with the part of Western Sahara it administers.' },
      KOS: { kind: 'limited' }, TWN: { kind: 'limited' },
      // population sources count Northern Cyprus and Somaliland twice when they stand apart: say so (COUNTED_WITHIN)
      CYN: { kind: 'limited', note: 'Its population (a separate estimate) is also part of the figure for Cyprus, which covers the whole island.' },
      SOL: { kind: 'limited', note: 'Its population (a separate estimate) is also part of the figure for Somalia, which covers the whole country.' },
      CYP: { note: 'Population and GDP figures cover the whole island, including Northern Cyprus, which is shown separately here.' },
      SOM: { note: 'Population and GDP figures cover all of Somalia, including Somaliland, which is shown separately here.' },
      PSX: { kind: 'limited' },
    },
  },

  // ─────────────────────────────────────────────────────── RECOGNITION NEUTRAL
  neutral: {
    label: 'Recognition Neutral',
    blurb: 'No side taken — every contested area is shown separately, in grey.',
    merge: {},
    overlays: 'ALL_DISPUTED', // every overlay becomes its own neutral "disputed" unit
    units: {
      KOS: { kind: 'limited' }, TWN: { kind: 'limited' },
      CYN: { kind: 'limited', note: 'Its population (a separate estimate) is also part of the figure for Cyprus, which covers the whole island.' },
      SOL: { kind: 'limited', note: 'Its population (a separate estimate) is also part of the figure for Somalia, which covers the whole country.' },
      CYP: { note: 'Population and GDP figures cover the whole island, including Northern Cyprus, which is shown separately here.' },
      SOM: { note: 'Population and GDP figures cover all of Somalia, including Somaliland, which is shown separately here.' },
      PSX: { kind: 'limited' }, SAH: { kind: 'limited', name: 'Western Sahara (Polisario-held)' }, KAS: { kind: 'disputed' },
    },
  },
};

export const DEFAULT_VIEW = 'defacto';

/**
 * Units whose population and GDP figures are already part of another unit's (the sources count the whole island /
 * country). Totals skip them so nobody is counted twice; their cards say so (notes above).
 */
export const COUNTED_WITHIN = { CYN: 'CYP', SOL: 'SOM' };
