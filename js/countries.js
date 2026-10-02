// Country layer: builds translucent fills + darker borders per view, handles styles and picking.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { decodeGeom, triangulate, borderSegments, sphereCentroid, bboxOf, pointInMulti } from './geo.js';
import { LIGHT_DIR_VIEW } from './globe.js';
import { SKY } from './sun.js';

// Index 0 = neutral grey for disputed areas; 1–9 follow Natural Earth's MAPCOLOR9 (neighbours never share a colour).
export const PALETTE = ['#b9c0cf', '#7cc8ff', '#8ef0c4', '#ffe28a', '#ffadd2', '#c3b1ff', '#ffbf8a', '#ffffff', '#c6f27c', '#7fe7e0'];
const GREY = '#8d93a6';

/** Darker line of the same hue — or a soft slate when the fill is white. */
export function borderColorFor(hex) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  if (hsl.l > 0.92 && hsl.s < 0.1) return '#5f6a85'; // white fills: soft slate instead of hard black
  return '#' + new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.85), hsl.l * 0.62).getHexString();
}

export const R_FILL = 1.0015, R_LINE = 1.0028;

export function fillMaterial(hex, { hatch = false, opacity = 0.42, pieceId = null } = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    // each pixel is blended at most once → no bright seams where triangles meet
    stencilWrite: true, stencilRef: 0, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.IncrementStencilOp,
    uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: opacity }, uHatch: { value: hatch ? 1 : 0 }, uLight: { value: LIGHT_DIR_VIEW }, uBright: { value: 0 }, uSun: SKY.uSun, uNight: SKY.uNight },
    vertexShader: /* glsl */`
      varying vec3 vPos; varying vec3 vN; varying float vVis;
      void main(){
        vPos = normalize(position);
        vN = normalize(normalMatrix * vPos);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec4 mvS = modelViewMatrix * vec4(vPos * length(position), 1.0);
        vVis = dot(vN, normalize(-mvS.xyz)); // > 0 on the hemisphere facing the camera
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; uniform float uHatch; uniform vec3 uLight; uniform float uBright; uniform vec3 uSun; uniform float uNight;
      varying vec3 vPos; varying vec3 vN; varying float vVis;
      void main(){
        if (vVis < 0.0) discard; // flat triangles may sag below the ocean, so we cull the far side ourselves instead of depth-testing
        float shade = 0.9 + 0.22 * clamp(dot(normalize(vN), uLight), 0.0, 1.0);
        float day = smoothstep(-0.10, 0.16, dot(vPos, uSun));
        vec3 col = (uColor * shade + uBright * 0.18) * mix(1.0 - uNight, 1.0, day);
        float a = uOpacity;
        if (uHatch > 0.5) { float s = fract((vPos.x * 0.8 + vPos.y + vPos.z * 0.6) * 140.0); a *= mix(0.35, 1.25, step(0.5, s)); }
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
  });
  if (pieceId !== null) { // compare pieces: blend once per piece, but let different pieces overlap
    m.stencilRef = 100 + pieceId; m.stencilFunc = THREE.NotEqualStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp;
  }
  return m;
}

export function lineMaterial(hex, { width = 1.1, dashed = false, opacity = 0.95 } = {}) {
  const m = new LineMaterial({ color: new THREE.Color(hex), linewidth: width, transparent: true, opacity, depthWrite: false, dashed, dashSize: 0.006, gapSize: 0.004, dashScale: 1 });
  return m;
}

export class CountryLayer {
  constructor(globe, data) {
    this.globe = globe; this.data = data;
    this.geomCache = new Map();      // geom id → { multi, tri, bbox, centroid, fillGeom, lineGeom }
    this.viewCache = new Map();      // view key → { group, objects, byKey, grid }
    this.lineMaterials = new Set();
    this.view = null; this.hover = null; this.selected = null;
    this.dim = null;                 // Set of keys kept in colour during compare (others greyed)
    this.sockets = new Set();        // keys whose pieces are popped out
    this.fade = 1;
  }

  geom(id) {
    let g = this.geomCache.get(id);
    if (g) return g;
    const multi = decodeGeom(this.data.geoms[id], this.data.precision);
    const tri = triangulate(multi);
    const fillGeom = new THREE.BufferGeometry();
    const pos = new Float32Array(tri.positions.length);
    for (let i = 0; i < pos.length; i++) pos[i] = tri.positions[i] * R_FILL;
    fillGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    fillGeom.setIndex(new THREE.BufferAttribute(tri.index, 1));
    fillGeom.computeBoundingSphere();
    const lineGeom = new LineSegmentsGeometry().setPositions(borderSegments(tri.rings, R_LINE));
    g = { multi, tri, bbox: bboxOf(multi), centroid: sphereCentroid(tri.positions, tri.index), fillGeom, lineGeom };
    this.geomCache.set(id, g);
    return g;
  }

  build(viewKey) {
    if (this.viewCache.has(viewKey)) return this.viewCache.get(viewKey);
    const v = this.data.views[viewKey];
    const group = new THREE.Group(); group.name = 'view:' + viewKey;
    const objects = []; const byKey = new Map(); const grid = new Map();
    for (const unit of v.units) {
      const g = this.geom(unit.g);
      const color = PALETTE[unit.c] ?? PALETTE[1];
      const hatch = unit.t === 'disputed';
      const fill = new THREE.Mesh(g.fillGeom, fillMaterial(color, { hatch }));
      fill.renderOrder = 1;
      const lm = lineMaterial(borderColorFor(color), { dashed: hatch || unit.t === 'breakaway' });
      this.lineMaterials.add(lm);
      const border = new LineSegments2(g.lineGeom, lm);
      if (lm.dashed) border.computeLineDistances();
      border.renderOrder = 2;
      group.add(fill, border);
      const o = { key: unit.k, unit, info: this.data.info[unit.k] || {}, g, fill, border, color, hatch };
      objects.push(o); byKey.set(unit.k, o);
      // coarse 10° grid for fast picking
      const [x0, y0, x1, y1] = g.bbox;
      for (let gx = Math.floor((x0 + 180) / 10); gx <= Math.floor((x1 + 180) / 10); gx++)
        for (let gy = Math.floor((y0 + 90) / 10); gy <= Math.floor((y1 + 90) / 10); gy++) {
          const k = gx + ':' + gy; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o);
        }
    }
    const entry = { key: viewKey, group, objects, byKey, grid };
    this.viewCache.set(viewKey, entry);
    this.resizeLines();
    return entry;
  }

  setView(viewKey) {
    const next = this.build(viewKey);
    if (this.view === next) return;
    if (this.view) this.globe.world.remove(this.view.group);
    this.view = next; this.globe.world.add(next.group);
    this.hover = null; this.selected = null;
    // quick fade-in
    const t0 = performance.now();
    this.fadeAnim = now => { this.fade = Math.min(1, (now - t0) / 420); this.restyle(); if (this.fade >= 1) this.fadeAnim = null; };
  }

  get(key) { return this.view?.byKey.get(key) || null; }

  pick(lon, lat) {
    if (!this.view) return null;
    const cell = this.view.grid.get(Math.floor((lon + 180) / 10) + ':' + Math.floor((lat + 90) / 10)) || [];
    let best = null;
    for (const o of cell) {
      const [x0, y0, x1, y1] = o.g.bbox;
      if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
      if (pointInMulti(lon, lat, o.g.multi) && (!best || o.unit.area < best.unit.area)) best = o; // smallest wins (enclaves)
    }
    return best;
  }

  setHover(o) { if (this.hover !== o) { this.hover = o; this.restyle(); } }
  setSelected(o) { if (this.selected !== o) { this.selected = o; this.restyle(); } }
  setDim(keep) { this.dim = keep ? new Set(keep) : null; this.restyle(); }
  setSockets(keys) { this.sockets = new Set(keys || []); this.restyle(); }
  /** Data lens: fn(o) → hex colour, or null for "no data". Pass null to go back to political colours. */
  setLens(fn) { this.lens = fn; this.restyle(); }
  /** Quiz feedback marks: 'good' | 'bad' | 'target'. */
  setMark(key, kind) { (this.marks ||= new Map()); if (kind) this.marks.set(key, kind); else this.marks.delete(key); this.restyle(); }
  clearMarks() { this.marks?.clear(); this.restyle(); }

  restyle() {
    if (!this.view) return;
    for (const o of this.view.objects) this.style(o);
  }

  style(o) {
    const f = o.fill.material, l = o.border.material;
    let fillHex = o.color, lineHex = borderColorFor(o.color), fo = 0.56, lo = 0.95, w = 1.1, bright = 0;
    let dashed = o.hatch || o.unit.t === 'breakaway';
    if (this.dim && !this.dim.has(o.key)) { fillHex = GREY; lineHex = '#c3c8d6'; fo = 0.08; lo = 0.22; }
    else if (this.lens) {
      const hx = this.lens(o);
      if (hx) { fillHex = hx; fo = 0.88; lineHex = '#0a0f24'; lo = 0.6; } else { fillHex = GREY; fo = 0.1; lineHex = '#8d93a6'; lo = 0.35; }
    }
    const mark = this.marks?.get(o.key);
    if (mark) {
      const M = { good: ['#5ee6a0', '#d4ffe8'], bad: ['#ff6b6b', '#ffd0d0'], target: ['#ffd166', '#fff3cc'] }[mark];
      fillHex = M[0]; lineHex = M[1]; fo = 0.88; lo = 1; w = 2.6; bright = 0.5;
    }
    if (this.sockets.has(o.key)) { fillHex = '#02040c'; lineHex = '#ffffff'; fo = 0.55; lo = 0.6; w = 1.2; dashed = true; }
    else if (o === this.selected) { if (this.lens && !this.dim) { lineHex = '#ffffff'; lo = 1; w = 2.6; } else { fo = 0.8; w = 2.4; bright = 1; } }
    else if (o === this.hover) { if (this.lens && !this.dim) { lineHex = '#ffffff'; lo = 0.9; w = 2; } else { fo = 0.66; w = 1.8; bright = 0.6; } }
    f.uniforms.uColor.value.set(fillHex);
    f.uniforms.uOpacity.value = fo * this.fade;
    f.uniforms.uBright.value = bright;
    l.color.set(lineHex); l.opacity = lo * this.fade; l.linewidth = w;
    if (l.dashed !== dashed) { l.dashed = dashed; if (dashed) o.border.computeLineDistances(); l.needsUpdate = true; }
    o.border.renderOrder = o === this.selected || o === this.hover || mark ? 3 : 2;
  }

  resizeLines() {
    const s = this.globe.size; // CSS pixels → linewidth is in CSS px
    for (const m of this.lineMaterials) m.resolution.set(s.x, s.y);
    for (const m of this.extraLineMaterials || []) m.resolution.set(s.x, s.y);
  }
  registerLineMaterial(m) { (this.extraLineMaterials ||= new Set()).add(m); this.resizeLines(); }
  unregisterLineMaterial(m) { this.extraLineMaterials?.delete(m); }

  tick(now) { this.fadeAnim?.(now); }
}
