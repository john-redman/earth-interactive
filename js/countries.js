// Country layer: draws every country of a view in a handful of merged draw calls (fills, borders), restyles them
// through a small per-country style texture, lifts highlighted countries into their own objects, and picks.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { decodeGeom, triangulate, borderSegments, borderRings, buildTopology, sphereCentroid, bboxOf, pointInMulti } from './geo.js';
import { QUALITY } from './perf.js';
import { LIGHT_DIR_VIEW } from './globe.js';
import { SKY } from './sun.js';

// Index 0 = neutral grey for disputed areas; 1–9 follow Natural Earth's MAPCOLOR9 (neighbours never share a colour).
export const PALETTE = ['#b9c0cf', '#7cc8ff', '#8ef0c4', '#ffe28a', '#ffadd2', '#c3b1ff', '#ffbf8a', '#ffffff', '#c6f27c', '#7fe7e0'];
const GREY = '#8d93a6';

/** Darker line of the same hue — or a soft slate when the fill is white. Memoised: restyles ask for it a lot. */
const borderMemo = new Map();
export function borderColorFor(hex) {
  let out = borderMemo.get(hex);
  if (!out) borderMemo.set(hex, out = borderColorOf(hex));
  return out;
}
function borderColorOf(hex) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  if (hsl.l > 0.92 && hsl.s < 0.1) return '#9aa2b8'; // white fills: a light slate that defines the edge without shouting
  return '#' + new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.85), hsl.l * 0.62).getHexString();
}

export const R_FILL = 1.0015, R_LINE = 1.0028;
const HATCH_DIRS = [new THREE.Vector3(0.8, 1, 0.6), new THREE.Vector3(-1, 0.7, 0.45), new THREE.Vector3(0.35, -0.6, 1)];
const NO_HATCH = new THREE.Vector3(0.8, 1, 0.6);
const LIFT = { pulse: 1.012, steady: 1.008 };   // how far a highlighted country rises off the globe
const SHIPS_ORDER = 2.5;                         // ships.js draws between the borders of countries and of overlays
const _c = new THREE.Color();

// The fill shader, shared by single fills (fillMaterial: raised countries, compare pieces) and the merged batch.
// Style inputs: uColor, uOpacity, uMix, uHatch, uHatchDir, uBright (uniforms, or per-country values in the batch).
const FILL_VERT = /* glsl */`
        vPos = normalize(position);
        vN = normalize(normalMatrix * vPos);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec4 mvS = modelViewMatrix * vec4(vPos * length(position), 1.0);
        vVis = dot(vN, normalize(-mvS.xyz)); // > 0 on the hemisphere facing the camera
        gl_Position = projectionMatrix * mv;`;
const FILL_FRAG = /* glsl */`
        if (vVis < 0.0) discard; // flat triangles may sag below the ocean, so we cull the far side ourselves instead of depth-testing
        float shade = 0.9 + 0.22 * clamp(dot(normalize(vN), uLight), 0.0, 1.0);
        float sd = dot(vPos, uSun), day = smoothstep(-0.05, 0.10, sd);
        // solid fills: the palette colour toned towards deep ocean blue (uMix) instead of letting the sea show through
        vec3 base = mix(vec3(0.030, 0.070, 0.160), uColor, uMix);
        vec3 col = base * shade + uBright * 0.18;
        // day & night (uNight 0…1): sunlit side a touch brighter, night side dark and moonlit blue, warm dusk between
        vec3 lit = mix(col * vec3(0.26, 0.31, 0.50), col * 1.06, day);
        lit += vec3(1.0, 0.5, 0.2) * 0.05 * (1.0 - smoothstep(0.0, 0.05, abs(sd - 0.01)));
        col = mix(col, lit, uNight);
        float a = uOpacity;
        if (uHatch > 0.5) { float s = fract(dot(vPos, uHatchDir) * 140.0); col *= mix(0.7, 1.08, step(0.5, s)); }
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        #include <colorspace_fragment>`;
const FILL_FLAGS = {
  transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  // each pixel is blended at most once → no bright seams where triangles meet
  stencilWrite: true, stencilRef: 0, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.IncrementStencilOp,
};

export function fillMaterial(hex, { hatch = false, opacity = 0.42, pieceId = null } = {}) {
  const m = new THREE.ShaderMaterial({
    ...FILL_FLAGS,
    uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: opacity }, uMix: { value: 1 }, uHatch: { value: hatch ? 1 : 0 }, uHatchDir: { value: new THREE.Vector3(0.8, 1, 0.6) }, uLight: { value: LIGHT_DIR_VIEW }, uBright: { value: 0 }, uSun: SKY.uSun, uNight: SKY.uNight },
    vertexShader: /* glsl */`
      varying vec3 vPos; varying vec3 vN; varying float vVis;
      void main(){${FILL_VERT}
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; uniform float uMix; uniform float uHatch; uniform vec3 uHatchDir; uniform vec3 uLight; uniform float uBright; uniform vec3 uSun; uniform float uNight;
      varying vec3 vPos; varying vec3 vN; varying float vVis;
      void main(){${FILL_FRAG}
      }`,
  });
  if (pieceId !== null) { // compare pieces: blend once per piece, but let different pieces overlap
    m.stencilRef = 100 + pieceId; m.stencilFunc = THREE.NotEqualStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp;
  }
  return m;
}

// Per-country style texture: one column per unit of the view, one row per group of values.
//   0 fill rgb (linear) + opacity · 1 hatch direction xyz + hatch flag · 2 mix, bright, show fill
//   3 line rgb (linear) + opacity · 4 width (CSS px), dashed flag, show line
const ROWS = 5;

/** All fills of a view in one draw: the fill shader, with each vertex's style read from the view's style texture. */
function batchFillMaterial(styleTex) {
  return new THREE.ShaderMaterial({
    ...FILL_FLAGS,
    uniforms: { uStyle: { value: styleTex }, uLight: { value: LIGHT_DIR_VIEW }, uSun: SKY.uSun, uNight: SKY.uNight },
    vertexShader: /* glsl */`
      attribute float country;
      uniform sampler2D uStyle;
      varying vec3 vPos; varying vec3 vN; varying float vVis;
      flat varying vec4 vFillA; flat varying vec4 vFillB; flat varying vec4 vFillC;
      void main(){
        int ci = int(country + 0.5);
        vFillC = texelFetch(uStyle, ivec2(ci, 2), 0);
        // hidden (behind the horizon, or drawn by its own raised copy): collapse outside the clip volume
        if (vFillC.z < 0.5) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
        vFillA = texelFetch(uStyle, ivec2(ci, 0), 0);
        vFillB = texelFetch(uStyle, ivec2(ci, 1), 0);${FILL_VERT}
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uLight; uniform vec3 uSun; uniform float uNight;
      varying vec3 vPos; varying vec3 vN; varying float vVis;
      flat varying vec4 vFillA; flat varying vec4 vFillB; flat varying vec4 vFillC;
      #define uColor vFillA.rgb
      #define uOpacity vFillA.a
      #define uHatchDir vFillB.xyz
      #define uHatch vFillB.w
      #define uMix vFillC.x
      #define uBright vFillC.y
      void main(){${FILL_FRAG}
      }`,
  });
}

function swap(src, from, to) {
  if (!src.includes(from)) throw new Error('countries.js: line shader changed, cannot find ' + from);
  return src.replace(from, to);
}

export function lineMaterial(hex, { width = 1.1, dashed = false, opacity = 0.95 } = {}) {
  const m = new LineMaterial({ color: new THREE.Color(hex), linewidth: width, transparent: true, opacity, depthWrite: false, dashed, dashSize: 0.006, gapSize: 0.004, dashScale: 1 });
  // Like the fills, drop the part of a border on the far side of the globe. Depth testing alone isn't enough:
  // the ocean is a faceted sphere, so lines just behind the horizon poke out past its flat edges and flicker.
  m.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying float vFace;\nvoid main() {')
      .replace('vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation',
        'vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation\n'
        + 'vFace = dot( normalize( normalMatrix * ( position.y < 0.5 ? instanceStart : instanceEnd ) ), normalize( -mvPosition.xyz ) );');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'varying float vFace;\nvoid main() {\n  if ( vFace < 0.0 ) discard;');
  };
  m.customProgramCacheKey = () => 'earth-line';
  return m;
}

/**
 * All borders of a view in one draw: lineMaterial() with colour, opacity, width and dashing per segment, read from
 * the style texture by the segment's country (`instanceCountry`). Dash distances restart at every country.
 */
function batchLineMaterial(styleTex) {
  const m = lineMaterial('#ffffff', { dashed: true });
  m.uniforms.uStyle = { value: styleTex };
  const face = m.onBeforeCompile;
  m.onBeforeCompile = shader => {
    face(shader);
    let v = swap(shader.vertexShader, 'void main() {', [
      'attribute float instanceCountry;', 'uniform sampler2D uStyle;', 'flat varying vec4 vLineCol;', 'flat varying float vDash;',
      'void main() {',
      '  int ci = int( instanceCountry + 0.5 );',
      '  vec4 ls = texelFetch( uStyle, ivec2( ci, 4 ), 0 );',
      '  if ( ls.z < 0.5 ) { gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 ); return; } // hidden: collapse outside the clip volume',
      '  vLineCol = texelFetch( uStyle, ivec2( ci, 3 ), 0 );',
      '  vDash = ls.y;',
      '  float lw = ls.x;'].join('\n'));
    shader.vertexShader = swap(v, 'offset *= linewidth;', 'offset *= lw;');
    let f = swap(shader.fragmentShader, 'void main() {', 'flat varying vec4 vLineCol;\nflat varying float vDash;\nvoid main() {');
    f = swap(f, 'if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps', 'if ( vDash > 0.5 && ( vUv.y < - 1.0 || vUv.y > 1.0 ) ) discard;');
    f = swap(f, 'if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX',
      'if ( vDash > 0.5 && mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard;');
    f = swap(f, 'float alpha = opacity;', 'float alpha = vLineCol.a;');
    shader.fragmentShader = swap(f, 'vec4 diffuseColor = vec4( diffuse, alpha );', 'vec4 diffuseColor = vec4( vLineCol.rgb, alpha );');
  };
  m.customProgramCacheKey = () => 'earth-line-batch';
  return m;
}

export class CountryLayer {
  constructor(globe, data) {
    this.globe = globe; this.data = data;
    this.geomCache = new Map();      // geom id → { multi, tri, bbox, centroid, spread, fillPos, segs }
    this.viewCache = new Map();      // view key → { group, objects, byKey, grid, styleTex, batch }
    this.lineMaterials = new Set();  // the merged border materials (one per built view)
    this.pool = { fill: [], line: [] }; // materials of the per-country overlays, reused (their shaders stay compiled)
    this.poolLines = new Set();
    this.view = null; this.hover = null; this.selected = null;
    this.dim = null;                 // Set of keys kept in colour during compare (others greyed)
    this.sockets = new Set();        // keys whose pieces are popped out
    this.fade = 1;
    this.camLocal = new THREE.Vector3();
  }

  geom(id) {
    let g = this.geomCache.get(id);
    if (g) return g;
    const multi = decodeGeom(this.data.geoms[id], this.data.precision);
    const tri = triangulate(multi);
    const fillPos = new Float32Array(tri.positions.length);
    for (let i = 0; i < fillPos.length; i++) fillPos[i] = tri.positions[i] * R_FILL;
    // phones draw lighter borders (fills keep full detail, so coastlines still read the same)
    if (QUALITY.borderTolerance > 0) this.ownerOf ||= buildTopology(this.data); // once, ~100 ms
    const rings = QUALITY.borderTolerance > 0 ? borderRings(multi, QUALITY.borderTolerance, this.ownerOf) : tri.rings;
    const segs = borderSegments(rings, R_LINE);
    const centroid = sphereCentroid(tri.positions, tri.index);
    // angular radius around the centroid, so cull() can tell when the whole shape is behind the horizon
    let minDot = 1;
    for (let i = 0; i < tri.positions.length; i += 3) {
      const x = tri.positions[i], y = tri.positions[i + 1], z = tri.positions[i + 2];
      minDot = Math.min(minDot, (x * centroid.x + y * centroid.y + z * centroid.z) / Math.hypot(x, y, z));
    }
    g = { multi, tri, bbox: bboxOf(multi), centroid, spread: Math.acos(Math.max(-1, minDot)), fillPos, segs };
    this.geomCache.set(id, g);
    return g;
  }

  build(viewKey) {
    if (this.viewCache.has(viewKey)) return this.viewCache.get(viewKey);
    const steps = this.buildSteps(viewKey);
    let r; while (!(r = steps.next()).done);
    return r.value;
  }

  /** Same as build(), in ~12 ms slices so the page stays responsive; onProgress(0…1). */
  async buildAsync(viewKey, onProgress) {
    if (this.viewCache.has(viewKey)) return this.viewCache.get(viewKey);
    const steps = this.buildSteps(viewKey);
    let r, t = performance.now();
    while (!(r = steps.next()).done) {
      if (performance.now() - t > 12) { onProgress?.(r.value); await new Promise(res => setTimeout(res, 0)); t = performance.now(); }
    }
    onProgress?.(1);
    return r.value;
  }

  *buildSteps(viewKey) {
    const v = this.data.views[viewKey], N = v.units.length;
    const group = new THREE.Group(); group.name = 'view:' + viewKey;
    const styleData = new Float32Array(N * ROWS * 4);
    const styleTex = new THREE.DataTexture(styleData, N, ROWS, THREE.RGBAFormat, THREE.FloatType);
    const entry = { key: viewKey, group, objects: [], byKey: new Map(), grid: new Map(), N, styleData, styleTex, batch: null };
    for (const [n, unit] of v.units.entries()) {
      const g = this.geom(unit.g);
      const color = PALETTE[unit.c] ?? PALETTE[1];
      const hatch = unit.t === 'disputed';
      // fixed draw order per country (overlays last): neighbours share border lines and overlapping fills, and
      // three.js would otherwise re-sort them by camera distance every frame, so they flicker as the globe turns.
      // The merged fills and borders keep exactly this order in their buffers.
      const layerRank = { country: 0, limited: 0, territory: 1, breakaway: 2, disputed: 3 }[unit.t] ?? 0;
      const order = (layerRank * N + n) / (4 * N) * 0.9;
      // neighbouring disputed areas stripe in different directions, so each reads as its own piece
      const hatchDir = hatch ? HATCH_DIRS[n % HATCH_DIRS.length] : NO_HATCH;
      const o = { key: unit.k, unit, info: this.data.info[unit.k] || {}, g, color, hatch, hatchDir, fillOrder: 1 + order, lineOrder: 2 + order,
        entry, slot: n, vis: true, ovFill: null, ovLine: null };
      const i = (N + n) * 4; styleData[i] = hatchDir.x; styleData[i + 1] = hatchDir.y; styleData[i + 2] = hatchDir.z; styleData[i + 3] = hatch ? 1 : 0;
      styleData[(2 * N + n) * 4 + 2] = 1; styleData[(4 * N + n) * 4 + 2] = 1; // shown
      entry.objects.push(o); entry.byKey.set(unit.k, o);
      // coarse 10° grid for fast picking
      const [x0, y0, x1, y1] = g.bbox;
      for (let gx = Math.floor((x0 + 180) / 10); gx <= Math.floor((x1 + 180) / 10); gx++)
        for (let gy = Math.floor((y0 + 90) / 10); gy <= Math.floor((y1 + 90) / 10); gy++) {
          const k = gx + ':' + gy; if (!entry.grid.has(k)) entry.grid.set(k, []); entry.grid.get(k).push(o);
        }
      yield (n + 1) / N;
    }
    this.viewCache.set(viewKey, entry);
    return entry;
  }

  /**
   * Merge a view into its few draw calls: one fill mesh, and the borders in one or two LineSegments2 (split where
   * the ships draw, so they stay between the same borders as before). Done when the view is first shown, so views
   * that are only pre-built keep no extra buffers.
   */
  ensureBatch(entry) {
    if (entry.batch) return entry.batch;
    const objs = [...entry.objects].sort((a, b) => a.fillOrder - b.fillOrder);
    let nv = 0, ni = 0;
    for (const o of objs) { nv += o.g.fillPos.length / 3; ni += o.g.tri.index.length; }
    const pos = new Float32Array(nv * 3), cid = new Float32Array(nv), idx = new Uint32Array(ni);
    let v = 0, k = 0;
    for (const o of objs) {
      const n = o.g.fillPos.length / 3, ti = o.g.tri.index;
      pos.set(o.g.fillPos, v * 3); cid.fill(o.slot, v, v + n);
      for (let j = 0; j < ti.length; j++) idx[k + j] = ti[j] + v;
      v += n; k += ti.length;
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    fg.setAttribute('country', new THREE.BufferAttribute(cid, 1));
    fg.setIndex(new THREE.BufferAttribute(idx, 1));
    fg.computeBoundingSphere();
    const fill = new THREE.Mesh(fg, batchFillMaterial(entry.styleTex));
    fill.renderOrder = 1;

    const lm = batchLineMaterial(entry.styleTex);
    this.lineMaterials.add(lm);
    const lines = [objs.filter(o => o.lineOrder < SHIPS_ORDER), objs.filter(o => o.lineOrder >= SHIPS_ORDER)].filter(p => p.length).map(part => {
      let ns = 0; for (const o of part) ns += o.g.segs.length / 6;
      const segs = new Float32Array(ns * 6), cs = new Float32Array(ns), dist = new Float32Array(ns * 2);
      let s = 0;
      for (const o of part) {
        const a = o.g.segs, n = a.length / 6;
        segs.set(a, s * 6); cs.fill(o.slot, s, s + n);
        // the same running distances LineSegments2.computeLineDistances() gives a single country's border
        for (let j = 0; j < n; j++) {
          const q = (s + j) * 2, b = j * 6;
          const dx = a[b] - a[b + 3], dy = a[b + 1] - a[b + 4], dz = a[b + 2] - a[b + 5];
          dist[q] = j === 0 ? 0 : dist[q - 1];
          dist[q + 1] = dist[q] + Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        s += n;
      }
      const lg = new LineSegmentsGeometry().setPositions(segs);
      lg.setAttribute('instanceCountry', new THREE.InstancedBufferAttribute(cs, 1));
      const db = new THREE.InstancedInterleavedBuffer(dist, 2, 1);
      lg.setAttribute('instanceDistanceStart', new THREE.InterleavedBufferAttribute(db, 1, 0));
      lg.setAttribute('instanceDistanceEnd', new THREE.InterleavedBufferAttribute(db, 1, 1));
      const line = new LineSegments2(lg, lm);
      line.renderOrder = part[0].lineOrder - 1e-6; // just before the first border it holds (overlays sort after it)
      return line;
    });
    entry.group.add(fill, ...lines);
    entry.batch = { fill, lines, material: lm };
    entry.styleTex.needsUpdate = true;
    this.resizeLines();
    return entry.batch;
  }

  setView(viewKey) {
    const next = this.build(viewKey);
    if (this.view === next) return;
    this.clearRaised();
    if (this.view) { for (const o of this.view.objects) this.dropOverlays(o); this.globe.world.remove(this.view.group); }
    this.ensureBatch(next);
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

  // hover and selection only change the two countries involved (a mouse sweeping the globe hovers a new
  // country every few frames, and restyling all ~250 each time showed up in profiles)
  setHover(o) { if (this.hover !== o) { const was = this.hover; this.hover = o; this.restyleOnly(was, o); } }
  setSelected(o) { if (this.selected !== o) { const was = this.selected; this.selected = o; this.restyleOnly(was, o); } }
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

  /** Restyle just these countries (those of the current view; others restyle when their view is shown). */
  restyleOnly(...objs) {
    if (!this.view) return;
    for (const o of objs) if (o && o.entry === this.view) this.style(o);
  }

  style(o) {
    let fillHex = o.color, lineHex = borderColorFor(o.color), fo = 1, mx = 0.62, lo = 0.95, w = 1.1, bright = 0;
    let dashed = o.hatch || o.unit.t === 'breakaway';
    if (o.hatch) { lineHex = '#e8ecf6'; lo = 0.85; w = 1.35; } // light dashed edge: grey-on-grey disappeared
    if (this.dim && !this.dim.has(o.key)) { fillHex = GREY; lineHex = '#c3c8d6'; mx = 0.16; lo = 0.22; }
    else if (this.lens) {
      const hx = this.lens(o);
      if (hx) { fillHex = hx; mx = 0.92; lineHex = '#0a0f24'; lo = 0.6; } else { fillHex = GREY; mx = 0.22; lineHex = '#8d93a6'; lo = 0.35; }
    }
    const mark = this.marks?.get(o.key);
    if (mark) {
      const M = { good: ['#5ee6a0', '#d4ffe8'], bad: ['#ff6b6b', '#ffd0d0'], target: ['#ffd166', '#fff3cc'] }[mark];
      fillHex = M[0]; lineHex = M[1]; mx = 0.92; lo = 1; w = 2.6; bright = 0.5;
    }
    if (this.sockets.has(o.key)) { fillHex = '#02040c'; lineHex = '#ffffff'; mx = 0.85; lo = 0.6; w = 1.2; dashed = true; }
    else if (o === this.selected) { if (this.lens && !this.dim) { lineHex = '#ffffff'; lo = 1; w = 2.6; } else { mx = 0.86; w = 2.4; bright = 1; } }
    else if (o === this.hover) { if (this.lens && !this.dim) { lineHex = '#ffffff'; lo = 0.9; w = 2; } else { mx = 0.72; w = 1.8; bright = 0.6; } }
    // the answer in a game flashes; the selected country (or the first pick of a compare) glows steadily
    const hl = mark === 'target' || mark === 'good' ? 'pulse' : o === this.selected && !this.sockets.has(o.key) ? 'steady' : null;
    this.raise(o, hl, w, lo);
    this.syncOverlays(o, mark);

    // the merged draws read these
    const { styleData: d, N } = o.entry, i = o.slot * 4;
    _c.set(fillHex); d[i] = _c.r; d[i + 1] = _c.g; d[i + 2] = _c.b; d[i + 3] = fo * this.fade;
    d[2 * N * 4 + i] = mx; d[2 * N * 4 + i + 1] = bright;
    _c.set(lineHex); d[3 * N * 4 + i] = _c.r; d[3 * N * 4 + i + 1] = _c.g; d[3 * N * 4 + i + 2] = _c.b; d[3 * N * 4 + i + 3] = lo * this.fade;
    d[4 * N * 4 + i] = w; d[4 * N * 4 + i + 1] = dashed ? 1 : 0;
    o.entry.styleTex.needsUpdate = true;
    // a country in its own objects (highlighted, raised) is styled there instead
    if (o.ovFill) {
      const u = o.ovFill.material.uniforms;
      u.uColor.value.set(fillHex); u.uOpacity.value = fo * this.fade; u.uMix.value = mx; u.uBright.value = bright;
    }
    if (o.ovLine) {
      const l = o.ovLine.material;
      l.color.set(lineHex); l.opacity = lo * this.fade; l.linewidth = w;
      if (l.dashed !== dashed) { l.dashed = dashed; l.needsUpdate = true; }
      o.ovLine.renderOrder = o === this.selected || o === this.hover || mark ? 3 : o.lineOrder;
    }
  }

  /**
   * Countries that draw out of the merged order get their own objects, created on demand: a border drawn over all
   * others (selected, hovered, quiz marks, and anything raised) and a fill drawn over its neighbours (raised).
   * Their part of the merged draw is hidden meanwhile, so nothing draws twice.
   */
  syncOverlays(o, mark = this.marks?.get(o.key)) {
    const raised = !!this.raised?.has(o);
    const wantLine = raised || o === this.selected || o === this.hover || !!mark;
    if (raised && !o.ovFill) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(o.g.fillPos, 3));
      g.setIndex(new THREE.BufferAttribute(o.g.tri.index, 1));
      g.boundingSphere = (o.g.sphere ||= (g.computeBoundingSphere(), g.boundingSphere)).clone();
      const m = this.pool.fill.pop() || fillMaterial(o.color);
      m.uniforms.uHatch.value = o.hatch ? 1 : 0; m.uniforms.uHatchDir.value.copy(o.hatchDir);
      // drawn after its neighbours, over them: fills are opaque, so drawing a pixel twice is harmless
      m.stencilFunc = THREE.AlwaysStencilFunc;
      o.ovFill = new THREE.Mesh(g, m); o.ovFill.renderOrder = 1.95;
      o.entry.group.add(o.ovFill);
    } else if (!raised && o.ovFill) {
      o.ovFill.removeFromParent(); o.ovFill.geometry.dispose(); this.pool.fill.push(o.ovFill.material); o.ovFill = null;
    }
    if (wantLine && !o.ovLine) {
      o.ovLine = new LineSegments2(new LineSegmentsGeometry().setPositions(o.g.segs), this.takeLine());
      o.ovLine.computeLineDistances();
      o.ovLine.renderOrder = o.lineOrder;
      o.entry.group.add(o.ovLine);
    } else if (!wantLine && o.ovLine) {
      o.ovLine.removeFromParent(); o.ovLine.geometry.dispose(); this.pool.line.push(o.ovLine.material); o.ovLine = null;
    }
    this.writeShow(o);
  }

  dropOverlays(o) {
    for (const k of ['ovFill', 'ovLine']) {
      const m = o[k]; if (!m) continue;
      m.removeFromParent(); m.geometry.dispose(); this.pool[k === 'ovFill' ? 'fill' : 'line'].push(m.material); o[k] = null;
    }
    this.writeShow(o);
  }

  /** A line material from the pool, reset to lineMaterial()'s defaults. */
  takeLine() {
    let m = this.pool.line.pop();
    if (!m) { m = lineMaterial('#ffffff'); this.poolLines.add(m); this.resizeLines(); }
    m.color.set('#ffffff'); m.linewidth = 1.1; m.opacity = 0.95;
    if (m.dashed) { m.dashed = false; m.needsUpdate = true; }
    m.dashSize = 0.006; m.gapSize = 0.004; m.dashScale = 1; m.dashOffset = 0;
    return m;
  }

  /** Show a country's part of the merged draws unless it is behind the horizon or drawn by its own objects. */
  writeShow(o) {
    const { styleData: d, N } = o.entry, i = o.slot * 4 + 2;
    const f = o.vis && !o.ovFill ? 1 : 0, l = o.vis && !o.ovLine ? 1 : 0;
    if (d[2 * N * 4 + i] !== f || d[4 * N * 4 + i] !== l) { d[2 * N * 4 + i] = f; d[4 * N * 4 + i] = l; o.entry.styleTex.needsUpdate = true; }
    if (o.ovFill) o.ovFill.visible = o.vis;
    if (o.ovLine) o.ovLine.visible = o.vis;
  }

  /** Lift a country off the globe with a soft white glow around its edge (kind null = settle back). */
  raise(o, kind, w, lo) {
    this.raised ||= new Map();
    let r = this.raised.get(o);
    if (!kind) { if (r) r.kind = null; return; }
    if (!r) {
      const mat = this.takeLine(); mat.linewidth = 9; mat.opacity = 0;
      // the glow follows a smoothed outline: wide lines on every coastal wiggle look like fuzz
      const geom = new LineSegmentsGeometry().setPositions(borderSegments(borderRings(o.g.multi, 0.12, () => ''), R_LINE));
      const glow = new LineSegments2(geom, mat); glow.renderOrder = 2.99;
      this.view.group.add(glow);
      r = { s: 1, glow, mat }; this.raised.set(o, r);
    }
    if ((kind === 'pulse') !== r.mat.dashed) {
      // the game's answer: a few bright dashes run around the outline (dash lengths scale with the perimeter)
      r.mat.dashed = kind === 'pulse'; r.mat.needsUpdate = true;
      if (r.mat.dashed) {
        r.glow.computeLineDistances();
        const d = r.glow.geometry.attributes.instanceDistanceEnd.data.array;
        r.perimeter = d[d.length - 1] || 1;
        r.mat.dashScale = 1; r.mat.dashSize = r.perimeter * 0.07; r.mat.gapSize = r.perimeter * 0.18;
      }
    }
    Object.assign(r, { kind, w, lo });
  }

  tickRaised(now) {
    if (!this.raised?.size) return;
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.0055);
    for (const [o, r] of this.raised) {
      const target = r.kind ? LIFT[r.kind] : 1;
      r.s += (target - r.s) * 0.16;
      const glowOn = r.kind ? (r.kind === 'pulse' ? 0.95 : 0.2) : 0;
      r.mat.opacity += (glowOn * this.fade - r.mat.opacity) * 0.2;
      if (r.kind === 'pulse') {
        // thick white outline with bright light travelling around it
        const b = o.ovLine.material; b.color.set('#d5ddf3'); b.linewidth = 3.6; b.opacity = 0.95;
        r.mat.color.set('#ffffff'); r.mat.linewidth = 11; r.mat.dashOffset = -(now * 0.00007) * r.perimeter;
      } else r.mat.linewidth = 9;
      for (const m of [o.ovFill, o.ovLine, r.glow]) m.scale.setScalar(r.s);
      r.glow.visible = o.ovLine.visible;
      if (!r.kind && Math.abs(r.s - 1) < 1e-4) { // fully settled: tidy up
        this.dropRaised(o, r);
        o.ovLine?.scale.setScalar(1);
      }
    }
  }

  dropRaised(o, r) {
    r.glow.removeFromParent(); r.glow.geometry.dispose(); this.pool.line.push(r.mat);
    this.raised.delete(o);
    this.syncOverlays(o); // back into the merged draws (the border stays apart while still hovered, selected or marked)
  }

  clearRaised() {
    for (const [o, r] of this.raised || []) { this.dropRaised(o, r); o.ovLine?.scale.setScalar(1); }
  }

  resizeLines() {
    const s = this.globe.size; // CSS pixels → linewidth is in CSS px
    for (const m of this.lineMaterials) m.resolution.set(s.x, s.y);
    for (const m of this.poolLines) m.resolution.set(s.x, s.y);
    for (const m of this.extraLineMaterials || []) m.resolution.set(s.x, s.y);
  }
  registerLineMaterial(m) { (this.extraLineMaterials ||= new Set()).add(m); this.resizeLines(); }
  unregisterLineMaterial(m) { this.extraLineMaterials?.delete(m); }

  /**
   * Hide countries that are entirely behind the horizon: about half the vertices on any frame. The merged draws
   * collapse a hidden country's vertices in the vertex shader (style texture flag), so nothing of it rasterises.
   */
  cull() {
    if (!this.view) return;
    const cam = this.globe.world.worldToLocal(this.camLocal.copy(this.globe.camera.position));
    const d = cam.length(); cam.divideScalar(d);
    const horizon = Math.acos(Math.min(1, 1 / d));
    for (const o of this.view.objects) {
      const reach = horizon + o.g.spread + 0.03; // small margin for line width and the raised border radius
      const vis = reach >= Math.PI || o.g.centroid.dot(cam) > Math.cos(reach);
      if (vis !== o.vis) { o.vis = vis; this.writeShow(o); }
    }
  }

  tick(now) { this.fadeAnim?.(now); this.cull(); this.tickRaised(now); }
}
