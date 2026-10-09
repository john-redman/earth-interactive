// Major surface currents painted on the sea, like the type and markings on a real globe: a faint lighter sheen that
// meanders like the real thing, threaded with fine streamlines whose streaks drift downstream, and their names (direction, typical speed)
// laid on the surface beside them, curving with the current and the sphere. Ocean names in the same type, larger,
// along their parallel. Everything is fixed to the Earth and turns with it. Decorative: nothing is clickable.
import * as THREE from 'three';
import { lonLatToVec3 } from './geo.js';

/**
 * Waypoints are [lon, lat] in the direction of flow, along the mean axis of each current as charted in the
 * oceanographic literature (shelf-break jets kept just off the coast; the Kuroshio Extension on its 35° N mean axis,
 * the Gulf Stream leaving the coast at Cape Hatteras, the Agulhas turning back on itself south of Africa). Speeds are
 * typical surface speeds in m/s (textbook figures; the strong western boundary currents peak higher; the Somali Current
 * runs in the summer monsoon). `major` labels appear first as you zoom in; `at` places the label along the line (0…1);
 * `side` is the side of the flow the label sits on ('left' by default; 'right' keeps it off the coast); `free` is where
 * the current leaves the coast and starts to meander (0…1, default 0); `meander` scales the meander.
 */
export const CURRENTS = [
  // ---- North Atlantic: the subtropical gyre and its northern spill
  { name: 'Caribbean Current', side: 'right', strength: 'moderate', speed: 0.4, warm: true, at: 0.4,
    path: [[-63.5, 14.2], [-68, 14.3], [-73, 14], [-77, 14.2], [-80.5, 15.6], [-83, 17.6], [-85.5, 20.6], [-85.7, 21.7]] },
  { name: 'Loop Current', side: 'right', strength: 'strong', speed: 1.5, warm: true, at: 0.5,
    path: [[-85.7, 22.3], [-86.2, 24], [-86, 25.8], [-84.8, 26.5], [-83.8, 25.6], [-83.4, 24.4]] },
  { name: 'Gulf Stream', side: 'right', strength: 'strong', speed: 2, warm: true, major: true, at: 0.66, free: 0.4, meander: 1.4,
    path: [[-83, 24], [-81.5, 24.1], [-80, 25.1], [-79.85, 26], [-79.85, 27.5], [-79.9, 29], [-79.8, 30.3], [-78.9, 31.6],
      [-77.6, 32.8], [-76.4, 33.9], [-75, 35.1], [-73.5, 36.2], [-71, 37.3], [-68, 38.2], [-65, 38.9], [-61, 39.7],
      [-57, 40.4], [-53, 41.2], [-50, 42]] },
  { name: 'North Atlantic Drift', strength: 'moderate', speed: 0.3, warm: true, at: 0.55, meander: 1.3,
    path: [[-47.5, 42.8], [-45.5, 45], [-44, 47.5], [-43.5, 49.5], [-41, 51.2], [-36, 51.5], [-30, 51.8], [-24, 52.8],
      [-18, 54.5], [-13, 56.5], [-9, 58.5], [-5, 60.5], [0, 61.8]] },
  { name: 'Norwegian Current', strength: 'moderate', speed: 0.3, warm: true, at: 0.45,
    path: [[2, 62.6], [5, 65], [9, 67.5], [13, 69.5], [17, 70.8], [22, 71.8], [30, 72.6]] },
  { name: 'East Greenland Current', strength: 'moderate', speed: 0.3, at: 0.25,
    path: [[-8, 79.5], [-11, 77], [-15, 74.5], [-17, 72], [-19.5, 69.5], [-24, 67.8], [-30, 66.4], [-35, 64.8],
      [-39, 62.8], [-41.5, 60.2], [-43.5, 59.4], [-45.5, 59.2]] },
  { name: 'Labrador Current', strength: 'moderate', speed: 0.3, at: 0.45,
    path: [[-61, 61.5], [-60, 59.5], [-58.5, 57.5], [-56.5, 55.8], [-54, 54], [-52, 52.3], [-50.8, 50.3], [-50, 48.3],
      [-49.8, 46.3], [-50.5, 44.3]] },
  { name: 'Canary Current', side: 'right', strength: 'weak', speed: 0.2, at: 0.3,
    path: [[-11, 40], [-12, 36.5], [-13, 33.5], [-14.5, 31], [-15.3, 29.6], [-17.2, 26.5], [-19.2, 23], [-20.5, 20.5],
      [-21.5, 18.5]] },
  { name: 'North Equatorial Current', strength: 'moderate', speed: 0.3, warm: true, at: 0.5,
    path: [[-26, 18.5], [-32, 17.5], [-40, 16.5], [-48, 15.5], [-57, 14.8]] },
  // ---- tropical and South Atlantic
  { name: 'Equatorial Counter Current', strength: 'moderate', speed: 0.4, warm: true, at: 0.5,
    path: [[-50, 6.5], [-42, 6.8], [-33, 7], [-24, 6.5], [-17, 5.5]] },
  { name: 'Guinea Current', side: 'right', strength: 'moderate', speed: 0.5, warm: true, at: 0.5,
    path: [[-14, 5.5], [-10, 4.6], [-6, 3.9], [-2, 3.9], [2, 4.6], [5.5, 3.6]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.5, warm: true, at: 0.45,
    path: [[8, -1.5], [0, -1.8], [-10, -2.5], [-20, -3.5], [-28, -4.5], [-32.5, -5.2]] },
  { name: 'North Brazil Current', side: 'right', strength: 'strong', speed: 1, warm: true, at: 0.5,
    path: [[-34.3, -4.5], [-36.5, -2.6], [-40, -1.5], [-44, -0.6], [-47, 1], [-48.8, 3], [-50.5, 5.5], [-53.5, 8]] },
  { name: 'Brazil Current', strength: 'weak', speed: 0.3, warm: true, at: 0.55,
    path: [[-34.8, -11], [-36.8, -15], [-37.6, -19.5], [-39.8, -23.2], [-44.5, -25.8], [-47.5, -28.5], [-50, -32.5],
      [-52.5, -36.5], [-53.5, -38.5]] },
  { name: 'Falkland Current', side: 'right', strength: 'moderate', speed: 0.4, at: 0.5,
    path: [[-57, -53], [-57, -51], [-58.8, -49.5], [-59.6, -47], [-59, -44], [-57.5, -41.5], [-56, -39.5]] },
  { name: 'Benguela Current', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[17, -34], [16, -32], [14.5, -29], [13, -26], [11.8, -22], [10.5, -18.5], [9.5, -16], [7.5, -14], [5, -12.5],
      [2, -11]] },
  // ---- Indian Ocean
  { name: 'Agulhas Current', strength: 'strong', speed: 2, warm: true, major: true, at: 0.42, free: 0.75,
    path: [[33.6, -27.5], [32.2, -29.6], [30.5, -31.6], [28.8, -33.3], [26.5, -34.5], [24, -35.5], [22, -36.6],
      [20.5, -37.8], [19.5, -39.3]] },
  { name: 'Agulhas Return Current', strength: 'moderate', speed: 0.5, warm: true, at: 0.45, meander: 1.6,
    path: [[21, -40.2], [24, -40], [28, -39.7], [32, -40], [36, -39.8], [40, -40.5], [48, -41], [56, -41.8]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.5, warm: true, at: 0.5,
    path: [[114, -11.5], [105, -12], [96, -13], [88, -13.5], [80, -14], [72, -14.5], [64, -15], [57.5, -15.5]] },
  { name: 'Somali Current', side: 'right', strength: 'strong', speed: 2, warm: true, major: true, at: 0.5,
    path: [[43.5, -2.5], [46, 0.8], [49, 3.8], [51, 6.8], [52.6, 9.6], [53.6, 11.5]] },
  { name: 'Leeuwin Current', side: 'right', strength: 'moderate', speed: 0.5, warm: true, at: 0.3,
    path: [[113, -22], [112.3, -26], [113.6, -30], [114.3, -33.5], [114.6, -35.2], [116.5, -35.6], [119, -35.5],
      [122, -34.6], [125, -34.3]] },
  // ---- Southern Ocean: the Antarctic Circumpolar Current, all the way round (in three stretches, one name each)
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5, meander: 1.4,
    path: [[-66, -58.2], [-62, -58], [-52, -55.8], [-40, -52.8], [-25, -50.5], [-5, -49.5], [15, -48.5], [30, -48], [42, -48]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5, meander: 1.4,
    path: [[46, -48.2], [50, -48.5], [58, -47.5], [66, -46.5], [75, -45.5], [90, -46.5], [110, -48.5], [130, -51],
      [152, -53.5]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5, meander: 1.4,
    path: [[162, -56], [170, -56.3], [-170, -57], [-150, -58], [-130, -58.5], [-110, -58], [-90, -58], [-70, -58.5]] },
  // ---- North Pacific
  { name: 'Kuroshio', side: 'right', strength: 'strong', speed: 1.5, warm: true, major: true, at: 0.78,
    path: [[123.5, 15.5], [122.6, 19], [122.4, 21.5], [122.8, 23.5], [123.8, 25.5], [126.5, 27.8], [129, 29.5],
      [131.5, 31], [133.5, 32.4], [136, 33], [138.5, 33.8], [141, 35], [143, 35.5]] },
  { name: 'Kuroshio Extension', side: 'right', strength: 'strong', speed: 1, warm: true, at: 0.45, free: 0.04, meander: 1.5,
    path: [[143.6, 35.5], [147, 35.4], [151, 35.6], [155, 34.9], [160, 34.6], [165, 34.9], [170, 35.4], [175, 35.8],
      [-178, 36.5], [-172, 37.5]] },
  { name: 'North Pacific Current', strength: 'weak', speed: 0.2, warm: true, at: 0.5,
    path: [[-170, 39], [-160, 41.5], [-150, 43], [-140, 44], [-132, 45]] },
  { name: 'Oyashio', strength: 'moderate', speed: 0.3, at: 0.4,
    path: [[160.5, 52.5], [158.5, 50.5], [156, 48.5], [153.2, 46.6], [150, 45], [147, 42.4], [145.2, 41.4],
      [143.5, 40], [143, 38.5]] },
  { name: 'Alaska Current', strength: 'moderate', speed: 0.5, warm: true, at: 0.3,
    path: [[-133, 49], [-136, 52.5], [-139, 55.5], [-142.5, 57.8], [-147, 58.7], [-150.8, 56.8], [-155, 55],
      [-160, 54], [-165, 53.3], [-170, 52.2], [-175, 51.2]] },
  { name: 'California Current', side: 'right', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[-128, 48], [-127.5, 44], [-126.5, 40], [-124.5, 36.5], [-122, 33], [-119.5, 29.5], [-117, 26],
      [-115, 22.5], [-115, 19]] },
  { name: 'North Equatorial Current', strength: 'moderate', speed: 0.4, warm: true, at: 0.5,
    path: [[-112, 14], [-125, 13.5], [-140, 13], [-155, 13], [-170, 13], [175, 13.5], [160, 13.5], [152, 13],
      [146, 12.5], [140, 12.8], [128, 13.5]] },
  // ---- tropical and South Pacific
  { name: 'Equatorial Counter Current', strength: 'moderate', speed: 0.4, warm: true, at: 0.42,
    path: [[130, 5.5], [140, 6], [150, 6.5], [160, 6.8], [170, 7], [180, 7], [-170, 7], [-150, 7], [-130, 7],
      [-110, 7], [-95, 6.5], [-90, 7]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.6, warm: true, at: 0.5,
    path: [[-87, -3], [-92, -2.6], [-100, -2.5], [-110, -2.5], [-125, -3], [-140, -4], [-155, -5], [-170, -6.5],
      [178, -8], [172, -9]] },
  { name: 'Humboldt Current', strength: 'weak', speed: 0.2, at: 0.5,
    path: [[-76.5, -44], [-75.5, -38], [-74, -32], [-73, -26], [-73, -20], [-76.5, -15], [-79.5, -10], [-82.3, -6.5],
      [-84, -4], [-86.5, -3]] },
  { name: 'East Australian Current', strength: 'strong', speed: 1, warm: true, major: true, at: 0.45, free: 0.55,
    path: [[155, -22], [154.6, -24.5], [154.4, -27], [154.4, -29], [153.9, -31], [153.1, -32.8], [152.4, -34.6],
      [151.4, -36.4], [150.8, -38]] },
];

/** Ocean names: [lon, lat]; they follow the parallel through that point. */
export const OCEANS = [
  { name: 'North Pacific Ocean', at: [-160, 30] },
  { name: 'South Pacific Ocean', at: [-125, -27] },
  { name: 'North Atlantic Ocean', at: [-44, 26] },
  { name: 'South Atlantic Ocean', at: [-14, -22] },
  { name: 'Indian Ocean', at: [78, -25] },
  { name: 'Southern Ocean', at: [0, -62], group: 'southern' },
  { name: 'Southern Ocean', at: [120, -62], group: 'southern' },
  { name: 'Southern Ocean', at: [-120, -66], group: 'southern' },
  { name: 'Arctic Ocean', at: [-168, 82] },
];

const R_LINE = 1.0016, R_TEXT = 1.0022;  // just above the sea, under the country fills
const WIDTH = { strong: 0.012, moderate: 0.0095, weak: 0.0078 };  // ribbon half-width (radians)
const FLOW = { strong: 1.0, moderate: 0.6, weak: 0.4 };          // streak drift speed, relative
const MEANDER = { strong: 0.01, moderate: 0.006, weak: 0.004 };   // meander amplitude (radians), × c.meander
const WAVE = { strong: 0.075, moderate: 0.12, weak: 0.16 };       // meander wavelength (radians)
const TEXT_H = { current: 0.0125, ocean: 0.03 };                  // cap height on the globe (radians)
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const fmtSpeed = s => `${s < 1 ? s.toFixed(1) : s} m/s`;
const NORTH = new THREE.Vector3(0, 1, 0);

/**
 * A smooth path through the waypoints on the sphere, with meanders: still where the current hugs the coast, loops
 * growing once it is `free` of it (like the Gulf Stream past Cape Hatteras), and two wavelengths mixed so they never
 * repeat like a rule. `base` is the path without meanders (labels sit beside it).
 */
function makePath(c, seed) {
  const pts = c.path.map(([lon, lat]) => lonLatToVec3(lon, lat));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const len = curve.getLength();                                     // ≈ radians on the unit sphere
  const waves = Math.max(1.5, len / WAVE[c.strength]), amp = MEANDER[c.strength] * (c.meander ?? 1), free = c.free ?? 0;
  const base = u => curve.getPointAt(Math.min(1, Math.max(0, u))).normalize();
  const at = u => {
    const p = base(u), q = base(u + 0.002);
    const side = new THREE.Vector3().crossVectors(p, q.sub(p)).normalize();  // left of the flow
    const ph = u * waves * 6.2832 + seed;
    const m = Math.sin(ph + 0.6 * Math.sin(ph * 0.5 + seed)) * 0.75 + Math.sin(ph * 2.3 + seed * 1.7) * 0.25; // uneven loops
    const env = smooth(free, free + 0.15, u) * smooth(0, 0.12, u) * smooth(1, 0.88, u); // still at the ends and the coast
    return p.addScaledVector(side, amp * m * env).normalize();
  };
  return { at, base, len, amp };
}

/** Left-of-direction vector at p for a path heading along d (both on the unit sphere). */
const leftOf = (p, d) => new THREE.Vector3().crossVectors(p, d).normalize();

/**
 * A strip laid on the sphere along centre(t), t 0…1, `half` radians either side. Pushes positions, uv (x along, y
 * across −1…1 or 0…1) and per-vertex extras into the given arrays.
 */
function strip(out, centre, n, half, r, uvy, extra, even = false) {
  if (even) centre = evenly(centre);
  const base = out.pos.length / 3;
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = centre(t), d = centre(Math.min(1, t + 1 / n)).sub(centre(Math.max(0, t - 1 / n)));
    const l = leftOf(c, d);
    for (const s of [-1, 1]) {
      const v = c.clone().addScaledVector(l, s * half).normalize().multiplyScalar(r);
      out.pos.push(v.x, v.y, v.z);
      out.uv.push(t, s < 0 ? uvy[0] : uvy[1]);
      for (const [k, val] of Object.entries(extra)) out[k].push(...(typeof val === 'function' ? val(t) : [val]).flat());
    }
    if (i < n) { const a = base + i * 2; out.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
}

/** Re-parameterise centre(t) by arc length, so equal steps of t are equal distances (text keeps its proportions). */
function evenly(centre) {
  const K = 160, pts = [], acc = [0];
  for (let i = 0; i <= K; i++) pts.push(centre(i / K));
  for (let i = 1; i <= K; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = acc[K] || 1;
  return t => {
    const target = Math.min(1, Math.max(0, t)) * total;
    let i = 1; while (i < K && acc[i] < target) i++;
    const k = (target - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]);
    return pts[i - 1].clone().lerp(pts[i], k).normalize();
  };
}

const SHARED_VERT = /* glsl */`
  varying vec2 vUv; varying float vFace;
  void main(){
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFace = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz)); // > 0 facing the camera
    gl_Position = projectionMatrix * mv;
  }`;

export class Currents {
  constructor(globe) {
    this.globe = globe;
    this.group = new THREE.Group();
    this.visible = true;
    this.fade = { minor: 0, major: 0, ocean: 1, ui: 1 };

    // ---- the currents: a whisper of light along the flow (lighter than the sea, never a dark band), threaded with a
    // few fine streamlines that weave across it, each carrying soft streaks downstream, fastest in the core, the way
    // a real current reads from above; a faint warm or cool tint, as on a printed globe.
    const R = { pos: [], uv: [], idx: [], aLen: [], aFlow: [], aWarm: [], aSeed: [] };
    CURRENTS.forEach((c, i) => {
      const p = makePath(c, i * 1.618);
      c._path = p;
      const n = Math.max(32, Math.round(p.len * 320));
      strip(R, p.at, n, WIDTH[c.strength], R_LINE, [-1, 1], { aLen: p.len, aFlow: FLOW[c.strength], aWarm: c.warm ? 1 : 0, aSeed: (i * 0.618) % 1 });
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(R.pos, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(R.uv, 2));
    for (const k of ['aLen', 'aFlow', 'aWarm', 'aSeed']) rg.setAttribute(k, new THREE.Float32BufferAttribute(R[k], 1));
    rg.setIndex(R.idx);
    this.ribbonMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: SHARED_VERT.replace('varying vec2 vUv;', 'attribute float aLen; attribute float aFlow; attribute float aWarm; attribute float aSeed; varying float vLen; varying float vFlow; varying float vWarm; varying float vSeed; varying vec2 vUv;')
        .replace('vUv = uv;', 'vUv = uv; vLen = aLen; vFlow = aFlow; vWarm = aWarm; vSeed = aSeed;'),
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uOpacity;
        varying vec2 vUv; varying float vFace; varying float vLen; varying float vFlow; varying float vWarm; varying float vSeed;
        void main(){
          if (vFace < 0.0) discard;
          float y = vUv.y, x = vUv.x * vLen;                                 // across −1…1; along, in radians
          float ends = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
          float sheen = 1.0 - y * y; sheen *= sheen;                         // the faintest lift of the water
          float px = fwidth(y);                                              // one screen pixel, across
          float a = sheen * 0.045;
          for (int i = 0; i < 4; i++) {
            float k = float(i), c = abs(k - 1.5) / 1.5;                      // 0 in the core, 1 at the edges
            // each streamline weaves gently across the ribbon (two wavelengths, so the braid never repeats)
            float lane = (k - 1.5) / 2.3 + 0.1 * sin(x * (31.0 + 7.0 * k) + vSeed * 9.0 + k * 2.1)
                       + 0.05 * sin(x * (83.0 - 9.0 * k) + k * 4.0);
            // streaks drifting downstream, fastest in the core, at uneven spacing
            float s = x * (19.0 + 3.0 * k) - uTime * vFlow * 0.075 * (1.0 - 0.45 * c) + vSeed * 5.0 + k * 0.37;
            s += 0.22 * sin(s * 0.57 + k * 1.3 + vSeed * 4.0);
            float f = fract(s);
            float streak = pow(f, 3.0) * smoothstep(1.0, 0.93, f);          // a bright head, a long fading tail
            float w0 = 0.045 + 0.075 * streak, w = max(w0, px * 0.9);        // never thinner than a pixel
            float d = (y - lane) / w;
            a += exp(-d * d) * streak * (w0 / w) * 0.34 * (1.0 - 0.3 * c);
          }
          vec3 tint = mix(vec3(0.72, 0.87, 1.0), vec3(1.0, 0.87, 0.76), vWarm);
          gl_FragColor = vec4(tint, min(a, 0.6) * ends * uOpacity * smoothstep(0.0, 0.25, vFace));
        }`,
    });
    const ribbons = new THREE.Mesh(rg, this.ribbonMat);
    ribbons.renderOrder = -5;          // over the ocean (−10), under every country fill (1.x)
    this.group.add(ribbons);
    globe.world.add(this.group);

    // ---- the type: painted once the font is ready
    const ready = document.fonts?.load ? Promise.all(['600 40px', '500 40px'].map(f => document.fonts.load(`${f} "Plus Jakarta Sans"`))).catch(() => {}) : Promise.resolve();
    ready.then(() => this.buildLabels(globe));
  }

  buildLabels(globe) {
    // one atlas for every label: rows of text, white on transparent (tinted in the shader)
    const items = [];
    for (const c of CURRENTS) if (c.label !== false) items.push({ kind: 'current', c, text: null });
    for (const o of OCEANS) items.push({ kind: 'ocean', o, text: o.name.toUpperCase() });
    const PX = { current: 44, ocean: 60 }, PAD = 16, W = 2048;
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const font = k => k === 'ocean' ? `600 ${PX.ocean}px "Plus Jakarta Sans", sans-serif` : `600 ${PX.current}px "Plus Jakarta Sans", sans-serif`;
    // decide each current's reading direction now: the text must read upright when north is up
    for (const it of items) {
      if (it.kind !== 'current') continue;
      const { c } = it, at = c.at ?? 0.5, p = c._path.at(at), d = c._path.at(at + 0.01).sub(c._path.at(at - 0.01));
      it.forward = leftOf(p, d).dot(NORTH) >= 0;   // the text's "up" (left of reading) must point north-ish
      const meta = `${c.strength} · ${fmtSpeed(c.speed)}`;
      it.text = `${c.name}   ${meta}`;
      it.arrow = it.forward ? 'end' : 'start';   // drawn as a shape: the font has no arrow glyph
    }
    // measure and pack into rows
    let x = 0, y = 0, rowH = 0;
    for (const it of items) {
      ctx.font = font(it.kind);
      const spacing = it.kind === 'ocean' ? 0.3 * PX.ocean : 0;
      it.w = Math.ceil(ctx.measureText(it.text).width + spacing * it.text.length) + PAD * 2 + (it.arrow ? Math.round(PX.current * 1.3) : 0);
      it.h = Math.ceil(PX[it.kind] * 1.35) + PAD * 2;
      if (x + it.w > W) { x = 0; y += rowH; rowH = 0; }
      it.x = x; it.y = y; x += it.w; rowH = Math.max(rowH, it.h);
    }
    const H = THREE.MathUtils.ceilPowerOfTwo(y + rowH);
    cv.width = W; cv.height = H;
    for (const it of items) {
      ctx.font = font(it.kind); ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(2, 12, 36, 0.85)'; ctx.shadowBlur = it.kind === 'ocean' ? 10 : 8;   // a soft dark halo
      if (it.kind === 'ocean') ctx.letterSpacing = `${0.3 * PX.ocean}px`;
      else ctx.letterSpacing = '0px';
      const aw = it.arrow ? Math.round(PX.current * 1.3) : 0, cy = it.y + it.h / 2;
      ctx.fillText(it.text, it.x + PAD + (it.arrow === 'start' ? aw : 0), cy);
      if (it.arrow) {                       // a slim arrow pointing with the flow
        const s = PX.current, x0 = it.arrow === 'start' ? it.x + PAD + s * 0.95 : it.x + it.w - PAD - aw + s * 0.3, x1 = x0 + (it.arrow === 'start' ? -s * 0.8 : s * 0.8);
        const dir = Math.sign(x1 - x0);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy);
        ctx.moveTo(x1 - dir * s * 0.28, cy - s * 0.24); ctx.lineTo(x1, cy); ctx.lineTo(x1 - dir * s * 0.28, cy + s * 0.24);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = Math.min(8, globe.renderer.capabilities.getMaxAnisotropy());
    tex.colorSpace = THREE.NoColorSpace;

    // lay every label on the sphere as a curved strip
    const L = { pos: [], uv: [], idx: [], aRect: [], aKind: [] };
    this.spots = [];
    const push = (it, centre, half, kind) => {
      this.spots.push({ text: it.text, kind: it.kind, at: centre(0.5).clone() });
      const before = L.pos.length / 3;
      strip(L, centre, 40, half, R_TEXT, [1, 0], {}, true);
      // map uv into the atlas rect; aKind: 0 minor current, 1 major current, 2 ocean
      for (let v = before; v < L.pos.length / 3; v++) {
        const u = L.uv[v * 2], w = L.uv[v * 2 + 1];
        L.uv[v * 2] = (it.x + u * it.w) / W; L.uv[v * 2 + 1] = 1 - (it.y + w * it.h) / H;
        L.aKind.push(kind);
      }
    };
    for (const it of items) {
      const hRad = TEXT_H[it.kind] * (it.h / (PX[it.kind] * 1.35)); // whole row height incl. padding
      const wRad = hRad * it.w / it.h;
      if (it.kind === 'ocean') {
        const [lon, lat] = it.o.at;
        if (Math.abs(lat) < 55) {                                         // along its parallel: a gentle arc
          const halfDeg = (wRad / 2) / Math.cos(lat * Math.PI / 180) * 180 / Math.PI;
          push(it, t => lonLatToVec3(lon - halfDeg + 2 * halfDeg * t, lat), hRad / 2, 2);
        } else {                                                          // near the poles a parallel bends too tightly:
          const c0 = lonLatToVec3(lon, lat), e0 = new THREE.Vector3().crossVectors(NORTH, c0).normalize(); // run straight
          push(it, t => c0.clone().multiplyScalar(Math.cos((t - 0.5) * wRad)).addScaledVector(e0, Math.sin((t - 0.5) * wRad)), hRad / 2, 2);
        }
      } else {
        const { c } = it, p = c._path, at = c.at ?? 0.5, du = Math.min(0.48, (wRad / p.len) / 2);
        const u0 = Math.max(0, Math.min(1 - 2 * du, at - du)), u1 = u0 + 2 * du;
        const sideSign = c.side === 'right' ? -1 : 1;                      // left of the flow by default
        const off = (WIDTH[c.strength] + p.amp + hRad * 0.55) * sideSign;      // clear of the ribbon and its meanders
        // one smooth bow (no wiggles): a quadratic arc through the start, middle and end of the label's stretch
        const side = u => { const q = p.base(u), d = p.base(u + 0.004).sub(p.base(u - 0.004)); return q.addScaledVector(leftOf(q, d), off).normalize(); };
        const A = side(u0), M = side((u0 + u1) / 2), B = side(u1);
        const C = A.clone().add(B).multiplyScalar(0.5);
        C.lerp(M.clone().multiplyScalar(2).sub(C), 0.6);                     // a softer bow than the current itself
        const bow = t => A.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(C, 2 * t * (1 - t)).addScaledVector(B, t * t).normalize();
        const centre = t => bow(it.forward ? t : 1 - t);
        push(it, centre, hRad / 2, c.major ? 1 : 0);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
    lg.setAttribute('uv', new THREE.Float32BufferAttribute(L.uv, 2));
    lg.setAttribute('aKind', new THREE.Float32BufferAttribute(L.aKind, 1));
    lg.setIndex(L.idx);
    this.labelMat = new THREE.ShaderMaterial({
      // drawn after the ships and clouds so the type stays readable, but only where no country fill has marked the
      // stencil (fills write 1 on land, compare pieces 100+), so names never print over land or a lifted piece
      transparent: true, depthWrite: false, depthTest: false,
      stencilWrite: true, stencilRef: 0, stencilFunc: THREE.EqualStencilFunc,
      stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
      uniforms: { uMap: { value: tex }, uMinor: { value: 0 }, uMajor: { value: 0 }, uOcean: { value: 1 } },
      vertexShader: SHARED_VERT.replace('varying vec2 vUv;', 'attribute float aKind; varying float vKind; varying vec2 vUv;')
        .replace('vUv = uv;', 'vUv = uv; vKind = aKind;'),
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uMinor; uniform float uMajor; uniform float uOcean;
        varying vec2 vUv; varying float vFace; varying float vKind;
        void main(){
          if (vFace < 0.0) discard;
          vec4 tx = texture2D(uMap, vUv);
          float a = tx.a;
          float k = vKind < 0.5 ? uMinor : vKind < 1.5 ? uMajor : uOcean;
          a *= k * smoothstep(0.05, 0.35, vFace);                     // printed on the globe: fades towards the rim
          vec3 col = tx.rgb * (vKind > 1.5 ? vec3(0.80, 0.88, 1.0) : vec3(0.86, 0.92, 1.0));
          gl_FragColor = vec4(col, a * (vKind > 1.5 ? 0.55 : 0.88));
        }`,
    });
    const labels = new THREE.Mesh(lg, this.labelMat);
    labels.renderOrder = 2.95;       // over ships (2.5) and clouds (2.9), under highlights (3); the stencil keeps it off land
    this.group.add(labels);
  }

  /** Show or hide the whole layer. */
  setVisible(on) { this.visible = on; }

  /** Every frame: drift the trails, fade them by zoom; fade the type by zoom and around the UI. */
  tick(now) {
    const body = document.body.classList;
    this.group.visible = this.visible && !body.contains('lens-on');
    if (!this.group.visible) return;
    const g = this.globe, d = g.camera.position.length() / g.fitDistance;
    const busy = body.contains('quiz-on') || body.contains('comparing') || body.contains('card-open');
    // the flow is barely there from afar and comes up as you lean in; it steps back while you are busy elsewhere
    const ru = this.ribbonMat.uniforms;
    ru.uTime.value = reduced.matches ? 0 : now / 1000;
    ru.uOpacity.value += ((busy ? 0.5 : 1) * (0.45 + 0.55 * smooth(1.0, 0.7, d)) - ru.uOpacity.value) * 0.08;
    if (!this.labelMat) return;
    const target = {
      major: busy ? 0 : smooth(0.92, 0.72, d),   // the big currents' names come in first as you zoom
      minor: busy ? 0 : smooth(0.7, 0.55, d),
      ocean: smooth(0.42, 0.62, d),              // ocean names step back when you are right down at the sea
    };
    const f = this.fade, u = this.labelMat.uniforms;
    for (const k of ['major', 'minor', 'ocean']) f[k] += (target[k] - f[k]) * 0.12;
    u.uMajor.value = f.major; u.uMinor.value = f.minor; u.uOcean.value = f.ocean;
  }
}
