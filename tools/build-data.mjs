/**
 * Builds data/world.js from Natural Earth + mledoze/countries.
 *   npm run build:data
 *
 * Output: one geometry library (deduplicated) + per-view unit lists + per-unit info for popups.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea } from 'd3-geo';
import pc from 'polygon-clipping';
import { VIEWS, DEFAULT_VIEW } from './views.config.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(fs.readFileSync(path.join(here, 'sources', f), 'utf8'));

const base = read('ne_50m_admin_0_countries.geojson').features;
const overlays = read('ne_50m_admin_0_breakaway_disputed_areas.geojson').features;
const mledoze = read('mledoze-countries.json');

const R = 6371.0088;
const PRECISION = 1000; // 0.001° ≈ 110 m

// ---------- geometry helpers ----------
const toMulti = g => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const round = mp => mp.map(poly => poly.map(ring => ring.map(([x, y]) => [Math.round(x * PRECISION) / PRECISION, Math.round(y * PRECISION) / PRECISION])));
function polyAreaKm2(poly) {
  let a = geoArea({ type: 'Polygon', coordinates: poly });
  if (a > 2 * Math.PI) a = 4 * Math.PI - a; // winding-order agnostic
  return a * R * R;
}
function ringAreaKm2(ring) { return polyAreaKm2([ring]); }
const areaKm2 = mp => mp.reduce((s, p) => s + polyAreaKm2(p), 0);
function bbox(mp) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of mp) for (const [x, y] of p[0]) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  return b;
}
const bboxHit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

/** Remove slivers/pinholes that appear after boolean ops but did not exist in the original. */
function clean(mp, original, minKm2 = 40) {
  const origPolyAreas = original.map(polyAreaKm2);
  const origHoleAreas = original.flatMap(p => p.slice(1).map(ringAreaKm2));
  const similar = (a, list) => list.some(b => Math.abs(a - b) <= Math.max(0.5, b * 0.02));
  return mp
    .filter(p => { const a = polyAreaKm2(p); return a >= minKm2 || similar(a, origPolyAreas); })
    .map(p => [p[0], ...p.slice(1).filter(h => { const a = ringAreaKm2(h); return a >= minKm2 || similar(a, origHoleAreas); })]);
}

// ---------- info (popup data) ----------
const md = new Map(mledoze.map(c => [c.cca3, c]));
const MD_ALIAS = { KOS: 'UNK', SDS: 'SSD', PSX: 'PSE', SAH: 'ESH', SOL: null, CYN: null, KAS: null };
function findMd(p) {
  const tries = [MD_ALIAS[p.ADM0_A3], p.ISO_A3, p.ISO_A3_EH, p.ADM0_A3].filter(Boolean);
  if (p.ADM0_A3 in MD_ALIAS && MD_ALIAS[p.ADM0_A3] === null) return null;
  for (const t of tries) if (md.has(t)) return md.get(t);
  return null;
}
const num = v => (v == null || v < 0 ? null : v);
function infoFromNE(p, isOverlay = false) {
  const m = isOverlay ? null : findMd(p);
  return {
    name: isOverlay ? p.BRK_NAME : p.NAME_EN || p.NAME,
    formal: isOverlay ? null : (m?.name?.official || p.FORMAL_EN || null),
    flag: m?.flag || null,
    iso2: m?.cca2 || (p.ISO_A2 !== '-99' ? p.ISO_A2 : null),
    capital: m?.capital?.join(', ') || null,
    pop: num(p.POP_EST), popYear: num(p.POP_YEAR),
    gdp: num(p.GDP_MD), gdpYear: num(p.GDP_YEAR),
    continent: p.CONTINENT || null, subregion: m?.subregion || p.SUBREGION || null,
    income: p.INCOME_GRP ? p.INCOME_GRP.replace(/^\d\.\s*/, '') : null,
    languages: m ? Object.values(m.languages || {}).slice(0, 4) : [],
    currencies: m ? Object.values(m.currencies || {}).map(c => c.name).slice(0, 2) : [],
    unMember: m ? !!m.unMember : false,
    sovereign: p.SOVEREIGNT && p.SOVEREIGNT !== p.ADMIN ? p.SOVEREIGNT : null,
    status: isOverlay ? p.NOTE_BRK : (p.NOTE_ADM0 || null),
    landlocked: m ? !!m.landlocked : null,
    areaOfficial: m?.area > 0 ? m.area : null,
    wikidata: p.WIKIDATAID || null,
    cca3: m?.cca3 || null,
    bordersMd: m?.borders || [],
    alt: m ? [m.name?.common, ...(m.altSpellings || [])].filter(a => a && a.length > 3 && a !== (p.NAME_EN || p.NAME)).slice(0, 6) : [],
  };
}

// ---------- base units ----------
const baseUnits = new Map();
for (const f of base) {
  const p = f.properties;
  baseUnits.set(p.ADM0_A3, { key: p.ADM0_A3, geom: round(toMulti(f.geometry)), color: p.MAPCOLOR9, info: infoFromNE(p), kind: p.TYPE === 'Dependency' ? 'territory' : 'country' });
}
const overlayByName = new Map(overlays.map(f => [f.properties.BRK_NAME, { name: f.properties.BRK_NAME, geom: round(toMulti(f.geometry)), info: infoFromNE(f.properties, true), props: f.properties }]));

// map mledoze cca3 → our unit keys, then resolve each country's land neighbours to unit keys
const cca3ToKey = new Map();
for (const f of base) {
  const p = f.properties, k = p.ADM0_A3, u = baseUnits.get(k);
  if (!u.info.cca3) continue;
  const prev = cca3ToKey.get(u.info.cca3);
  if (!prev || p.TYPE === 'Sovereign country' || p.TYPE === 'Country') cca3ToKey.set(u.info.cca3, k);
}
for (const u of baseUnits.values()) {
  u.info.borders = [...new Set(u.info.bordersMd.map(c => cca3ToKey.get(c)).filter(Boolean))];
  delete u.info.bordersMd; delete u.info.cca3;
}
for (const o of overlayByName.values()) { o.info.borders = []; delete o.info.bordersMd; delete o.info.cca3; }

const slug = s => s.normalize('NFD').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').toUpperCase();

// ---------- views ----------
const geomLib = [];
const geomIndex = new Map();
function geomId(mp) {
  const key = JSON.stringify(mp);
  if (!geomIndex.has(key)) { geomIndex.set(key, geomLib.length); geomLib.push(mp); }
  return geomIndex.get(key);
}

const info = {};
const out = { views: {}, defaultView: DEFAULT_VIEW };

for (const [vk, view] of Object.entries(VIEWS)) {
  const units = new Map([...baseUnits].map(([k, u]) => [k, { ...u, geom: u.geom, orig: u.geom, members: [k] }]));

  // merges
  for (const [target, others] of Object.entries(view.merge || {})) {
    const t = units.get(target);
    for (const o of others) {
      const u = units.get(o); if (!u) continue;
      t.geom = pc.union(t.geom, u.geom); t.members.push(o);
      units.delete(o);
    }
    t.geom = clean(t.geom, t.orig);
  }

  // overlays
  const rules = view.overlays === 'ALL_DISPUTED'
    ? Object.fromEntries([...overlayByName.keys()].map(n => [n, { own: true, kind: 'disputed' }]))
    : (view.overlays || {});
  for (const [oname, rule] of Object.entries(rules)) {
    const ov = overlayByName.get(oname);
    if (!ov) { console.warn(`[${vk}] unknown overlay "${oname}"`); continue; }
    const ob = bbox(ov.geom);
    for (const [k, u] of units) {
      if (!bboxHit(bbox(u.geom), ob)) continue;
      const before = u.geom;
      const diff = pc.difference(u.geom, ov.geom);
      if (areaKm2(diff) < areaKm2(before) - 1) {
        u.geom = clean(diff, u.orig);
        if (!u.geom.length && k !== rule.to) units.delete(k);
      }
    }
    if (rule.to) {
      const t = units.get(rule.to);
      if (!t) { console.warn(`[${vk}] overlay target ${rule.to} missing`); continue; }
      t.geom = clean(t.geom.length ? pc.union(t.geom, ov.geom) : ov.geom, t.orig);
    } else if (rule.own) {
      const key = 'X_' + slug(oname);
      const parent = units.get(ov.props.ADM0_A3) || baseUnits.get(ov.props.ADM0_A3);
      units.set(key, {
        key, geom: ov.geom, orig: ov.geom, members: [], kind: rule.kind || 'disputed',
        color: rule.kind === 'disputed' ? 0 : ((parent?.color ?? 1) + 3) % 9 + 1,
        info: { ...ov.info, name: rule.name || ov.info.name },
        note: rule.note || null,
      });
      info[key] = { ...ov.info, name: rule.name || ov.info.name };
    }
  }

  // annotate + emit
  const list = [];
  for (const [k, u] of units) {
    const a = view.units?.[k] || {};
    if (!info[k]) info[k] = u.info;
    const area = Math.round(areaKm2(u.geom));
    if (area < 0.5) continue;
    list.push({
      k, g: geomId(u.geom),
      n: a.name || u.info.name,
      t: a.kind || u.kind || 'country',
      c: (a.kind || u.kind) === 'disputed' ? 0 : u.color,
      note: a.note || u.note || null,
      m: u.members.length > 1 ? u.members : undefined,
      mod: u.geom !== u.orig ? 1 : undefined,
      area,
    });
  }
  out.views[vk] = { label: view.label, blurb: view.blurb, units: list };
  console.log(`${vk}: ${list.length} units`);
}

// ---------- encode geometry (delta-encoded integers) ----------
function encRing(ring) {
  const outR = []; let px = 0, py = 0;
  for (const [x, y] of ring) { const ix = Math.round(x * PRECISION), iy = Math.round(y * PRECISION); outR.push(ix - px, iy - py); px = ix; py = iy; }
  return outR;
}
out.precision = PRECISION;
out.geoms = geomLib.map(mp => mp.map(poly => poly.map(encRing)));
out.info = info;
out.source = 'Natural Earth 1:50m Admin-0 v5 (public domain) · mledoze/countries (ODbL)';

const js = `// Generated by tools/build-data.mjs — do not edit by hand.\nexport default ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(here, '..', 'data', 'world.js'), js);
console.log('geoms', geomLib.length, 'size', (js.length / 1024).toFixed(0) + ' KB');
