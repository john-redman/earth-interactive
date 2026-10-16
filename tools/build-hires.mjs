/**
 * Builds data/world-hi.js: the same units as data/world.js, drawn from Natural Earth 1:10m instead of 1:50m, for
 * close zoom. Run after build-data.mjs (npm run build:data runs both).
 *
 * The views are made the same way (merges, then the disputed overlays), with two differences:
 *  - the overlays stay the 1:50m "breakaway & disputed areas" (the 1:10m set is a different list), so each one is
 *    clipped to the 1:10m land and cut out of the 1:10m countries: every bit of land ends up in exactly one unit,
 *    and the cut lines are identical on both sides.
 *  - the small 1:10m units 1:50m doesn't have (Baikonur, Akrotiri, Gibraltar…) join the 1:50m unit they lie in;
 *    those in open sea (Spratlys, Clipperton…) are left out, as in world.js.
 * Then borders are simplified to about a kilometre, shared stretches identically on both sides (as on phones).
 *
 * Output: { precision, tolerance, views: { un|defacto|neutral: { KEY: geomId } }, geoms }. Units missing from a
 * view here keep their 1:50m shape.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea, geoContains, geoCentroid } from 'd3-geo';
import pc from 'polygon-clipping';
import { VIEWS } from './views.config.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(fs.readFileSync(path.join(here, 'sources', f), 'utf8'));
const t0 = Date.now();

const base10 = read('ne_10m_admin_0_countries.geojson').features;
const base50 = read('ne_50m_admin_0_countries.geojson').features;
const overlays = read('ne_50m_admin_0_breakaway_disputed_areas.geojson').features;
const { default: lo } = await import(path.join(here, '..', 'data', 'world.js'));

const R = 6371.0088;
const PRECISION = 1000;     // same grid as world.js (0.001° ≈ 110 m)
const TOLERANCE = 0.008;    // simplification (degrees, ≈ 0.9 km): about a pixel at the closest zoom
const SLIVER_KM2 = 40;      // new pieces under this left by a cut go with the cut-out area (as clean() in build-data)

const toMulti = g => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const q = v => Math.round(v * PRECISION);
/** Snap to the grid and drop repeated points and degenerate rings. */
function snap(mp) {
  return mp.map(poly => poly.map(ring => {
    const out = [];
    for (const [x, y] of ring) { const p = [q(x) / PRECISION, q(y) / PRECISION]; const l = out[out.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p); }
    if (out.length && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) out.push(out[0]);
    return out;
  }).filter(r => r.length >= 4)).filter(p => p.length);
}
function polyAreaKm2(poly) {
  let a = geoArea({ type: 'Polygon', coordinates: poly });
  if (a > 2 * Math.PI) a = 4 * Math.PI - a;
  return a * R * R;
}
const areaKm2 = mp => mp.reduce((s, p) => s + polyAreaKm2(p), 0);
function bbox(mp) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of mp) for (const [x, y] of p[0]) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  return b;
}
const bboxHit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

// polygon-clipping now and then fails on nearly collinear edges ("Unable to complete output ring"): retry with the
// operands tidied up on their own first, then with the second nudged by a hair (1e-7°, far below the grid)
function op(name, a, ...rest) {
  try { return pc[name](a, ...rest); } catch { /* retry below */ }
  const tidy = g => snap(pc.union(g));
  try { return pc[name](tidy(a), ...rest.map(tidy)); } catch { /* retry below */ }
  const nudge = g => g.map(p => p.map(r => r.map(([x, y]) => [x + 1e-7, y + 1e-7])));
  return pc[name](a, ...rest.map(nudge));
}

// ---------- shared-border simplification (as simplifyShared() in js/geo.js) ----------
function topology(mps) {
  const owners = new Map();
  mps.forEach((mp, id) => {
    for (const poly of mp) for (const ring of poly) for (const [x, y] of ring) {
      const k = (q(x) + 200000) * 400000 + (q(y) + 100000), o = owners.get(k);
      if (!o) owners.set(k, [id]); else if (!o.includes(id)) o.push(id);
    }
  });
  const sig = new Map();
  for (const [k, o] of owners) sig.set(k, o.sort((a, b) => a - b).join(','));
  return (x, y) => sig.get((q(x) + 200000) * 400000 + (q(y) + 100000)) || '';
}
function dpKeep(pts, a, b, tol2, keep) {
  const stack = [[a, b]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const [ax, ay] = pts[i0], [bx, by] = pts[i1], dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let worst = -1, wd = tol2;
    for (let i = i0 + 1; i < i1; i++) {
      const [px, py] = pts[i];
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const ex = px - ax - t * dx, ey = py - ay - t * dy, d = ex * ex + ey * ey;
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst > 0) { keep[worst] = 1; stack.push([i0, worst], [worst, i1]); }
  }
}
function simplifyRing(ring, tol, ownerOf) {
  const n = ring.length - 1;
  if (n < 4) return ring;
  const sig = ring.slice(0, n).map(([x, y]) => ownerOf(x, y));
  const fixed = [];
  for (let i = 0; i < n; i++) if (sig[i] !== sig[(i + n - 1) % n] || sig[i] !== sig[(i + 1) % n]) fixed.push(i);
  if (fixed.length < 2) { fixed.length = 0; fixed.push(0, n >> 1); }
  const start = fixed[0], pts = [];
  for (let i = 0; i <= n; i++) pts.push(ring[(start + i) % n]);
  const anchors = fixed.map(i => (i - start + n) % n).concat(n);
  const keep = new Uint8Array(n + 1);
  for (const a of anchors) keep[a] = 1;
  for (let j = 0; j < anchors.length - 1; j++) dpKeep(pts, anchors[j], anchors[j + 1], tol * tol, keep);
  const out = pts.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring;
}
const simplify = (mp, ownerOf) => mp.map(poly => poly.map(r => simplifyRing(r, TOLERANCE, ownerOf)));

// ---------- base units: 1:10m, snapped and simplified once (so every later cut works on light shapes) ----------
const keys50 = new Set(base50.map(f => f.properties.ADM0_A3));
const shapes50 = base50.map(f => ({ key: f.properties.ADM0_A3, geom: f.geometry }));
const rawBase = new Map();
for (const f of base10) {
  const k = f.properties.ADM0_A3;
  rawBase.set(k, snap(toMulti(f.geometry)));
}
{
  const list = [...rawBase.values()], ownerOf = topology(list);
  for (const [k, g] of rawBase) rawBase.set(k, snap(simplify(g, ownerOf)));
}
const baseUnits = new Map();
const extra = [];
for (const [k, g] of rawBase) {
  if (keys50.has(k)) { baseUnits.set(k, g); continue; }
  // a 1:10m-only unit: give it to the 1:50m unit it lies in (by its biggest part's first point)
  const big = g.reduce((a, p) => (polyAreaKm2(p) > polyAreaKm2(a) ? p : a), g[0]);
  const pt = geoCentroid({ type: 'Polygon', coordinates: big });
  const host = shapes50.find(s => geoContains(s.geom, pt));
  extra.push([k, g, host?.key]);
}
for (const [k, g, host] of extra) {
  if (!host) { console.log(`  ${k}: open sea, left out`); continue; }
  baseUnits.set(host, op('union', baseUnits.get(host), g));
  console.log(`  ${k} → ${host}`);
}
const overlayByName = new Map(overlays.map(f => [f.properties.BRK_NAME, { geom: snap(toMulti(f.geometry)), props: f.properties }]));
const slug = s => s.normalize('NFD').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').toUpperCase();

// ---------- views ----------
const geomLib = [], geomIndex = new Map();
function geomId(mp) {
  const key = JSON.stringify(mp);
  if (!geomIndex.has(key)) { geomIndex.set(key, geomLib.length); geomLib.push(mp); }
  return geomIndex.get(key);
}
const out = { precision: PRECISION, tolerance: TOLERANCE, views: {}, geoms: null };

for (const [vk, view] of Object.entries(VIEWS)) {
  const units = new Map([...baseUnits].map(([k, g]) => [k, g]));
  for (const [target, others] of Object.entries(view.merge || {})) {
    for (const o of others) {
      if (!units.has(o)) continue;
      units.set(target, op('union', units.get(target), units.get(o)));
      units.delete(o);
    }
  }
  const rules = view.overlays === 'ALL_DISPUTED'
    ? Object.fromEntries([...overlayByName.keys()].map(n => [n, { own: true }]))
    : (view.overlays || {});
  for (const [oname, rule] of Object.entries(rules)) {
    const ov = overlayByName.get(oname);
    if (!ov) continue;
    const ob = bbox(ov.geom);
    const cut = [];   // the land under the overlay, from whichever units held it
    for (const [k, g] of units) {
      if (!g.length || !bboxHit(bbox(g), ob)) continue;
      const inside = op('intersection', g, ov.geom);
      if (!inside.length) continue;
      cut.push(inside);
      const rest = op('difference', g, ov.geom);
      // slivers the cut leaves behind (the 1:50m cut line wanders a little across 1:10m borders) go with the cut
      const keep = [], before = g.map(polyAreaKm2);
      for (const p of rest) {
        const a = polyAreaKm2(p);
        if (a < SLIVER_KM2 && !before.some(b => Math.abs(a - b) <= Math.max(0.5, b * 0.02))) cut.push([p]); else keep.push(p);
      }
      if (keep.length || k === rule.to) units.set(k, keep); else units.delete(k);
    }
    if (!cut.length) continue;
    const land = op('union', ...cut);
    if (rule.to) {
      if (!units.has(rule.to)) continue;
      const t = units.get(rule.to);
      units.set(rule.to, t.length ? op('union', t, land) : land);
    } else if (rule.own) units.set('X_' + slug(oname), land);
  }
  // only the units world.js has (same keys, same view)
  const wanted = new Set(lo.views[vk].units.map(u => u.k));
  const map = {};
  for (const [k, g] of units) if (wanted.has(k) && g.length && areaKm2(g) >= 0.5) map[k] = geomId(snap(g));
  const missing = [...wanted].filter(k => !(k in map));
  out.views[vk] = map;
  console.log(`${vk}: ${Object.keys(map).length} units${missing.length ? ` (1:50m only: ${missing.join(' ')})` : ''}`);
}

function encRing(ring) {
  const r = []; let px = 0, py = 0;
  for (const [x, y] of ring) { const ix = q(x), iy = q(y); r.push(ix - px, iy - py); px = ix; py = iy; }
  return r;
}
out.geoms = geomLib.map(mp => mp.map(poly => poly.map(encRing)));
const js = `// Generated by tools/build-hires.mjs — do not edit by hand.\nexport default ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(here, '..', 'data', 'world-hi.js'), js);
let pts = 0; for (const mp of geomLib) for (const p of mp) for (const r of p) pts += r.length;
console.log('geoms', geomLib.length, 'points', pts, 'size', (js.length / 1024).toFixed(0) + ' KB', `${((Date.now() - t0) / 1000).toFixed(1)} s`);
