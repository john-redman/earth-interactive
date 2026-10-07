// Major surface currents painted on the sea, like the type and markings on a real globe: soft, feathered ribbons
// that meander a little, with faint streaks drifting along the flow, and their names (direction, typical speed)
// laid on the surface beside them, curving with the current and the sphere. Ocean names in the same type, larger,
// along their parallel. Everything is fixed to the Earth and turns with it. Decorative: nothing is clickable.
import * as THREE from 'three';
import { lonLatToVec3 } from './geo.js';

/**
 * Waypoints are [lon, lat] in the direction of flow, kept off the coasts. Speeds are typical surface speeds in m/s
 * (textbook figures; the strong western boundary currents peak higher; the Somali Current runs in the summer
 * monsoon). `major` labels appear first as you zoom in; `at` places the label along the line (0…1); `side` is the
 * side of the flow the label sits on ('left' by default; 'right' keeps it off the coast); `label: false` draws the
 * line only.
 */
export const CURRENTS = [
  { name: 'Gulf Stream', side: 'right', strength: 'strong', speed: 2, warm: true, major: true, at: 0.62,
    path: [[-80.5, 25.5], [-79.8, 28], [-79.3, 31], [-76.5, 34], [-73, 36.2], [-68, 38.5], [-60, 40.5], [-50, 42]] },
  { name: 'North Atlantic Drift', strength: 'moderate', speed: 0.3, warm: true, at: 0.45,
    path: [[-47, 44.5], [-40, 47.5], [-30, 51], [-20, 54.5], [-12, 57.5], [-5, 61], [3, 64.5]] },
  { name: 'Labrador Current', strength: 'moderate', speed: 0.3, at: 0.4,
    path: [[-60, 64], [-58, 60], [-55, 56], [-52, 52.5], [-50, 48.5], [-50.5, 45]] },
  { name: 'East Greenland Current', strength: 'moderate', speed: 0.3, at: 0.5,
    path: [[-12, 77], [-16, 73], [-19, 70], [-27, 66.5], [-35, 63.5], [-42, 59.5]] },
  { name: 'Canary Current', side: 'right', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[-14, 42], [-15, 36], [-17, 30], [-19, 25], [-21, 20], [-23, 15.5]] },
  { name: 'North Equatorial Current', strength: 'moderate', speed: 0.3, at: 0.5,
    path: [[-25, 14], [-35, 14], [-45, 14.5], [-57, 15]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.5, at: 0.45,
    path: [[5, -2], [-5, -2.5], [-15, -3.5], [-25, -4.5], [-32, -6]] },
  { name: 'Brazil Current', strength: 'weak', speed: 0.3, warm: true, at: 0.5,
    path: [[-34, -10], [-36.5, -15], [-38, -20], [-40.5, -24], [-45, -28], [-50, -33], [-53, -37]] },
  { name: 'Benguela Current', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[17, -35], [15.5, -30], [12.5, -25], [10.5, -20], [8, -15], [4, -11]] },
  { name: 'Agulhas Current', strength: 'strong', speed: 2, warm: true, major: true, at: 0.45,
    path: [[37.5, -25], [34.5, -29], [31.8, -32.3], [28.5, -34.6], [25, -36.6], [21, -37.6], [18, -38.5]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5,
    path: [[-62, -57.5], [-45, -53.5], [-25, -51.5], [-5, -51], [15, -50], [38, -49]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5,
    path: [[52, -48.5], [72, -50.5], [92, -50.5], [112, -50.5], [132, -52], [152, -54]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5,
    path: [[168, -56], [-172, -57.5], [-150, -58.5], [-130, -59], [-110, -59], [-90, -58.5], [-74, -58.5]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.5, at: 0.5,
    path: [[110, -12], [100, -12.5], [90, -13], [80, -13.5], [70, -14], [62, -14.5], [55, -14.5]] },
  { name: 'Somali Current', side: 'right', strength: 'strong', speed: 2, warm: true, major: true, at: 0.5,
    path: [[43.5, -3], [47, 1.5], [50, 5.5], [52.5, 9.5], [55, 12.5]] },
  { name: 'Kuroshio', side: 'right', strength: 'strong', speed: 1.5, warm: true, major: true, at: 0.5,
    path: [[123, 22], [125, 25.5], [129, 29], [133, 31.8], [137, 33.6], [141.5, 35.3], [146, 36.5], [153, 37]] },
  { name: 'North Pacific Current', strength: 'weak', speed: 0.2, warm: true, at: 0.5,
    path: [[158, 40], [170, 42], [-175, 43], [-160, 43.5], [-145, 44], [-134, 45]] },
  { name: 'California Current', side: 'right', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[-129, 47], [-127, 41], [-124.5, 36], [-121, 31], [-117, 26], [-114, 20.5]] },
  { name: 'North Equatorial Current', strength: 'moderate', speed: 0.4, at: 0.5,
    path: [[-110, 14], [-130, 13.5], [-150, 13.5], [-170, 14], [170, 14], [150, 14], [130, 13.5]] },
  { name: 'Equatorial Counter Current', strength: 'moderate', speed: 0.4, warm: true, at: 0.42,
    path: [[135, 6], [155, 6.5], [180, 7], [-160, 7], [-130, 7.5], [-100, 7.5]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.6, at: 0.5,
    path: [[-87, -2], [-100, -3], [-120, -3.5], [-140, -4], [-160, -5], [-180, -6], [168, -7.5]] },
  { name: 'Humboldt Current', strength: 'weak', speed: 0.2, at: 0.5,
    path: [[-76, -42], [-76.5, -36], [-75, -30], [-74, -24], [-77, -17], [-80.5, -11], [-83, -6]] },
  { name: 'East Australian Current', strength: 'strong', speed: 1, warm: true, major: true, at: 0.45,
    path: [[156, -20], [155, -25], [154.4, -28.5], [153.6, -32], [152.2, -35.5], [151, -38]] },
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
  { name: 'Arctic Ocean', at: [-20, 84] },
];

const R_LINE = 1.0016, R_TEXT = 1.0022;  // just above the sea, under the country fills
const WIDTH = { strong: 0.0095, moderate: 0.0072, weak: 0.0056 }; // ribbon half-width (radians)
const FLOW = { strong: 1.0, moderate: 0.6, weak: 0.4 };          // streak drift speed, relative
const TEXT_H = { current: 0.0125, ocean: 0.03 };                  // cap height on the globe (radians)
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const fmtSpeed = s => `${s < 1 ? s.toFixed(1) : s} m/s`;
const NORTH = new THREE.Vector3(0, 1, 0);

/** A smooth path through the waypoints on the sphere, with a gentle meander so it never runs ruler-straight. */
function makePath(path, seed) {
  const pts = path.map(([lon, lat]) => lonLatToVec3(lon, lat));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const len = curve.getLength();                                     // ≈ radians on the unit sphere
  const waves = Math.max(1.5, len / 0.11), amp = 0.0042;
  const at = u => {
    const p = curve.getPointAt(Math.min(1, Math.max(0, u))).normalize();
    const q = curve.getPointAt(Math.min(1, Math.max(0, u + 0.002))).normalize();
    const side = new THREE.Vector3().crossVectors(p, q.sub(p)).normalize();  // left of the flow
    const m = Math.sin(u * waves * 6.2832 + seed) * 0.7 + Math.sin(u * waves * 2.3 * 6.2832 + seed * 1.7) * 0.3;
    return p.addScaledVector(side, amp * m * Math.sin(Math.PI * u)).normalize(); // still at the ends
  };
  return { at, len };
}

/** Left-of-direction vector at p for a path heading along d (both on the unit sphere). */
const leftOf = (p, d) => new THREE.Vector3().crossVectors(p, d).normalize();

/**
 * A strip laid on the sphere along centre(t), t 0…1, `half` radians either side. Pushes positions, uv (x along, y
 * across −1…1 or 0…1) and per-vertex extras into the given arrays.
 */
function strip(out, centre, n, half, r, uvy, extra) {
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

    // ---- the currents: soft feathered ribbons, one merged mesh
    const R = { pos: [], uv: [], idx: [], aLen: [], aFlow: [] };
    CURRENTS.forEach((c, i) => {
      const p = makePath(c.path, i * 1.618);
      c._path = p;
      const n = Math.max(24, Math.round(p.len * 220));
      strip(R, p.at, n, WIDTH[c.strength], R_LINE, [-1, 1], { aLen: p.len, aFlow: FLOW[c.strength] });
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(R.pos, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(R.uv, 2));
    rg.setAttribute('aLen', new THREE.Float32BufferAttribute(R.aLen, 1));
    rg.setAttribute('aFlow', new THREE.Float32BufferAttribute(R.aFlow, 1));
    rg.setIndex(R.idx);
    this.ribbonMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
      vertexShader: SHARED_VERT.replace('varying vec2 vUv;', 'attribute float aLen; attribute float aFlow; varying float vLen; varying float vFlow; varying vec2 vUv;')
        .replace('vUv = uv;', 'vUv = uv; vLen = aLen; vFlow = aFlow;'),
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uOpacity;
        varying vec2 vUv; varying float vFace; varying float vLen; varying float vFlow;
        void main(){
          if (vFace < 0.0) discard;
          float across = 1.0 - vUv.y * vUv.y;                       // feathered edges
          float ends = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          float s = vUv.x * vLen * 140.0 - uTime * vFlow * 0.35;      // faint streaks drifting with the flow
          float streak = 0.75 + 0.25 * sin(s) * sin(s * 0.37 + 1.3);
          float a = across * across * ends * streak * 0.34 * uOpacity * smoothstep(0.0, 0.2, vFace);
          gl_FragColor = vec4(0.02, 0.08, 0.2, a);
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
    const PX = { current: 44, ocean: 60 }, PAD = 8, W = 2048;
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const font = k => k === 'ocean' ? `600 ${PX.ocean}px "Plus Jakarta Sans", sans-serif` : `600 ${PX.current}px "Plus Jakarta Sans", sans-serif`;
    // decide each current's reading direction now: the text must read upright when north is up
    for (const it of items) {
      if (it.kind !== 'current') continue;
      const { c } = it, at = c.at ?? 0.5, p = c._path.at(at), d = c._path.at(at + 0.01).sub(c._path.at(at - 0.01));
      it.forward = leftOf(p, d).dot(NORTH) >= 0;   // the text's "up" (left of reading) must point north-ish
      const meta = `${c.strength} · ${fmtSpeed(c.speed)}`;
      it.text = it.forward ? `${c.name}   ${meta}  →` : `←  ${c.name}   ${meta}`;
    }
    // measure and pack into rows
    let x = 0, y = 0, rowH = 0;
    for (const it of items) {
      ctx.font = font(it.kind);
      const spacing = it.kind === 'ocean' ? 0.3 * PX.ocean : 0;
      it.w = Math.ceil(ctx.measureText(it.text).width + spacing * it.text.length) + PAD * 2;
      it.h = Math.ceil(PX[it.kind] * 1.35) + PAD * 2;
      if (x + it.w > W) { x = 0; y += rowH; rowH = 0; }
      it.x = x; it.y = y; x += it.w; rowH = Math.max(rowH, it.h);
    }
    const H = THREE.MathUtils.ceilPowerOfTwo(y + rowH);
    cv.width = W; cv.height = H;
    for (const it of items) {
      ctx.font = font(it.kind); ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      if (it.kind === 'ocean') ctx.letterSpacing = `${0.3 * PX.ocean}px`;
      else ctx.letterSpacing = '0px';
      ctx.fillText(it.text, it.x + PAD, it.y + it.h / 2);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = Math.min(8, globe.renderer.capabilities.getMaxAnisotropy());
    tex.colorSpace = THREE.NoColorSpace;

    // lay every label on the sphere as a curved strip
    const L = { pos: [], uv: [], idx: [], aRect: [], aKind: [] };
    const push = (it, centre, half, kind) => {
      const before = L.pos.length / 3;
      strip(L, centre, 28, half, R_TEXT, [1, 0], {});
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
        const [lon, lat] = it.o.at, halfDeg = (wRad / 2) / Math.max(0.2, Math.cos(lat * Math.PI / 180)) * 180 / Math.PI;
        push(it, t => lonLatToVec3(lon - halfDeg + 2 * halfDeg * t, lat), hRad / 2, 2);
      } else {
        const { c } = it, p = c._path, at = c.at ?? 0.5, du = Math.min(0.48, (wRad / p.len) / 2);
        const u0 = Math.max(0, Math.min(1 - 2 * du, at - du)), u1 = u0 + 2 * du;
        const sideSign = c.side === 'right' ? -1 : 1;                      // left of the flow by default
        const off = (WIDTH[c.strength] + hRad * 0.55) * sideSign;
        const centre = t => {
          const u = it.forward ? u0 + (u1 - u0) * t : u1 - (u1 - u0) * t;
          const q = p.at(u), d = p.at(u + 0.004).sub(p.at(u - 0.004));
          return q.addScaledVector(leftOf(q, d), off).normalize();
        };
        push(it, centre, hRad / 2, c.major ? 1 : 0);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
    lg.setAttribute('uv', new THREE.Float32BufferAttribute(L.uv, 2));
    lg.setAttribute('aKind', new THREE.Float32BufferAttribute(L.aKind, 1));
    lg.setIndex(L.idx);
    this.labelMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uMap: { value: tex }, uMinor: { value: 0 }, uMajor: { value: 0 }, uOcean: { value: 1 } },
      vertexShader: SHARED_VERT.replace('varying vec2 vUv;', 'attribute float aKind; varying float vKind; varying vec2 vUv;')
        .replace('vUv = uv;', 'vUv = uv; vKind = aKind;'),
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uMinor; uniform float uMajor; uniform float uOcean;
        varying vec2 vUv; varying float vFace; varying float vKind;
        void main(){
          if (vFace < 0.0) discard;
          float a = texture2D(uMap, vUv).a;
          float k = vKind < 0.5 ? uMinor : vKind < 1.5 ? uMajor : uOcean;
          a *= k * smoothstep(0.05, 0.35, vFace);                     // printed on the globe: fades towards the rim
          vec3 col = vKind > 1.5 ? vec3(0.80, 0.88, 1.0) : vec3(0.84, 0.91, 1.0);
          gl_FragColor = vec4(col, a * (vKind > 1.5 ? 0.55 : 0.88));
        }`,
    });
    const labels = new THREE.Mesh(lg, this.labelMat);
    labels.renderOrder = -4;
    this.group.add(labels);
  }

  /** Show or hide the whole layer. */
  setVisible(on) { this.visible = on; }

  /** Every frame: drift the streaks; fade the type by zoom and around the UI. */
  tick(now) {
    const body = document.body.classList;
    this.group.visible = this.visible && !body.contains('lens-on');
    if (!this.group.visible) return;
    this.ribbonMat.uniforms.uTime.value = reduced.matches ? 0 : now / 1000;
    if (!this.labelMat) return;
    const g = this.globe, d = g.camera.position.length() / g.fitDistance;
    const busy = body.contains('quiz-on') || body.contains('comparing') || body.contains('card-open');
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
