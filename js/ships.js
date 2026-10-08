// Tiny cartoon ships sailing the main sea lanes between the big ports. Purely decorative and cheap: one low-poly
// boat (hull, deck, a few containers, a white bridge, a funnel) drawn for every ship in a single instanced draw
// call, with flat baked shading, plus one more for their soft foam wakes. Ships are small from afar and grow a
// little as you zoom in, sail on the right of their lane, shrink into port at each end and turn round. Fixed to the
// Earth; nothing is clickable.
import * as THREE from 'three';
import { lonLatToVec3 } from './geo.js';
import { LIGHT_DIR_VIEW } from './globe.js';
import { SKY } from './sun.js';

/**
 * Sea lanes as [lon, lat] waypoints, kept off the coasts (canals are crossed). Not charts: close enough to read as
 * "ships go here". `ships` is how many sail it at once, both ways.
 */
export const ROUTES = [
  { name: 'Shanghai – Rotterdam via Suez', ships: 14, path: [
    [122.6, 30.9], [122.4, 28], [120.2, 24.6], [117.8, 22.6], [114.6, 21.7], [111.5, 18.2], [110, 13], [107, 7.5], [104.8, 3],
    [104.5, 1.28], [103.9, 1.24], [103.2, 1.25], [102.3, 2.0], [100.6, 3.3], [98.4, 5.4], [95.2, 6.3], [88, 5.8], [81, 5.2], [76, 6.6], [66, 11.5], [55, 13.4],
    [49, 12.4], [44.6, 12.2], [43.3, 12.7], [41.6, 15.2], [39.2, 19.4], [36.6, 23.6], [34.2, 27.2], [33.55, 27.95], [32.95, 28.9], [32.56, 29.85],
    [32.35, 31.3], [30, 32.4], [25, 33.6], [19, 35.2], [14.2, 36.6], [11.6, 37.55], [7.5, 37.9], [2, 37.4], [-2.5, 36.3],
    [-5.6, 35.95], [-8.5, 36.4], [-9.9, 38.5], [-10, 42.5], [-8.6, 45.5], [-5.6, 48.4], [-3, 49.7], [0, 50.15], [1.6, 50.9],
    [3.2, 51.75], [3.9, 52.05]] },
  { name: 'Shanghai – Los Angeles', ships: 9, path: [
    [122.8, 31.0], [124.6, 30.4], [129.5, 29.8], [134, 31.6], [140.2, 33.4], [148, 36.6], [160, 41], [175, 43.8], [-170, 44.6],
    [-155, 43.3], [-140, 40], [-128, 36.5], [-121.5, 34.0], [-119.2, 33.5], [-118.25, 33.66]] },
  { name: 'Tokyo – Vancouver', ships: 6, path: [
    [139.7, 34.75], [141.3, 35.0], [142.8, 36.8], [150, 41.5], [163, 46], [180, 47.6], [-165, 48.6], [-150, 49.4], [-135, 49.2], [-127.2, 48.4],
    [-125.2, 48.4]] },
  { name: 'Rotterdam – New York', ships: 8, path: [
    [3.9, 52.05], [3.2, 51.75], [1.6, 50.9], [0, 50.15], [-3, 49.7], [-6.2, 49.3], [-15, 48.6], [-30, 46.2], [-45, 43.4],
    [-58, 41.5], [-66, 40.6], [-71, 40.2], [-73.7, 40.3]] },
  { name: 'New York – Los Angeles via Panama', ships: 8, path: [
    [-73.7, 40.3], [-72.2, 37], [-71, 31], [-69, 24], [-67.9, 19.6], [-67.9, 18.3], [-70, 16.2], [-74.5, 13.4], [-78.2, 10.6],
    [-79.85, 9.5], [-79.55, 8.8], [-79.4, 8.1], [-80.4, 7.0], [-84, 8.6], [-88, 11.6], [-94, 14.6], [-101, 16.6],
    [-106, 19.2], [-110.6, 21.6], [-114.4, 25.4], [-117.2, 30.6], [-117.6, 32.3], [-118.25, 33.66]] },
  { name: 'Houston – New York', ships: 5, path: [
    [-94.7, 29.0], [-91, 27.4], [-86.5, 25.6], [-83, 24.2], [-81, 24.1], [-79.7, 25.0], [-79.6, 27.2], [-79.6, 29.6],
    [-77.6, 32.4], [-75, 35.1], [-74.6, 38], [-73.7, 40.3]] },
  { name: 'Singapore – Rotterdam via the Cape', ships: 8, path: [
    [104.5, 1.28], [103.9, 1.24], [103.2, 1.25], [102.3, 2.0], [100.6, 3.3], [98.4, 5.4], [95.2, 6.3], [88, 0], [75, -12], [62, -24], [48, -33.5],
    [35, -37.2], [25, -37.2], [18.4, -35.5], [12.8, -30], [8.4, -20], [4, -8], [-4, 0.5], [-14, 5.5], [-19.2, 13.5], [-20.4, 21],
    [-19.6, 28], [-15, 33.5], [-11.5, 38.5], [-10, 42.5], [-8.6, 45.5], [-5.6, 48.4], [-3, 49.7], [0, 50.15], [1.6, 50.9],
    [3.2, 51.75], [3.9, 52.05]] },
  { name: 'Persian Gulf – Mumbai', ships: 5, path: [
    [50.6, 26.8], [52.4, 26.6], [54.8, 26.4], [56.4, 26.5], [57.6, 25.2], [59.5, 23.6], [63, 21.5], [68, 19.6], [72.3, 18.8]] },
  { name: 'Persian Gulf – Singapore', ships: 6, path: [
    [56.4, 26.5], [57.6, 25.2], [59.5, 23.6], [63, 19], [70, 12], [76, 6.6], [81, 5.2], [88, 5.8], [95.2, 6.3], [98.4, 5.4],
    [100.6, 3.3], [102.3, 2.0], [103.2, 1.25], [103.9, 1.24], [104.5, 1.28]] },
  { name: 'Sydney – Hong Kong', ships: 6, path: [
    [151.6, -33.9], [154, -30], [156.2, -24], [158, -17], [162.4, -12.6], [161.5, -6], [156, 0.5], [146, 6], [134, 13],
    [125, 19.6], [122.6, 21.25], [120.4, 21.5], [117.6, 21.7], [114.6, 21.7]] },
  { name: 'Santos – Lisbon', ships: 5, path: [
    [-46.2, -24.4], [-42.5, -23.8], [-39.6, -21.5], [-37.8, -16], [-34.2, -9], [-33.5, -5], [-30, 2], [-26, 12],
    [-21.5, 22], [-19.6, 28], [-15, 33.5], [-9.9, 38.5]] },
  { name: 'Panama – Valparaíso', ships: 4, path: [
    [-79.4, 8.1], [-79.25, 7.2], [-80.3, 6.6], [-81.4, 3], [-82.4, -2], [-82, -6.5], [-79.2, -11.4], [-77.9, -13.4], [-75, -17], [-72.8, -22], [-72.2, -28],
    [-72.0, -33.0]] },
];

// length on screen: 6 px with the whole globe in view (radius ~335 px), growing with the globe as you zoom in, so they
// stay small from afar and are worth a look up close (~35 px at the closest zoom)
const SHIP_PX = { base: 6, radius: 335, power: 1, min: 4, max: 40 };
const SPEED = 0.0062;          // radians a second (cosmetic: a lane crosses the globe in a few minutes)
const LANE = 0.0012;           // ships keep right of the lane's centre (radians; narrow straits leave little room)
const HULLS = ['#c8423b', '#2f5f9e', '#2e7d5b', '#d9822b', '#3a3f58', '#8a3e8f'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** One boat, about 2 units long along +x, deck at y 0.12, keel under the water. Flat faces, colours per vertex. */
function boatGeometry() {
  const pos = [], col = [], hull = [];
  const tri = (a, b, c, rgb, h = 0) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { col.push(...rgb); hull.push(h); } };
  const quad = (a, b, c, d, rgb, h) => { tri(a, b, c, rgb, h); tri(a, c, d, rgb, h); };
  const box = (x0, x1, y0, y1, z0, z1, rgb) => {
    const p = (x, y, z) => [x, y, z];
    quad(p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0), rgb);       // top
    quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), rgb);       // sides
    quad(p(x1, y0, z0), p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), rgb);
    quad(p(x1, y0, z1), p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), rgb);       // front
    quad(p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0), rgb);       // back
  };
  const T = 0.12, K = -0.2;
  const S0 = [-1, T, -0.27], S1 = [-1, T, 0.27], M0 = [0.42, T, -0.27], M1 = [0.42, T, 0.27], B = [1.08, T + 0.04, 0];
  const s0 = [-0.94, K, -0.2], s1 = [-0.94, K, 0.2], m0 = [0.38, K, -0.2], m1 = [0.38, K, 0.2], b = [0.86, K, 0];
  quad(S0, M0, m0, s0, [1, 1, 1], 1); quad(S1, s1, m1, M1, [1, 1, 1], 1);            // hull sides (instance colour)
  tri(M0, B, b, [1, 1, 1], 1); tri(M0, b, m0, [1, 1, 1], 1);                          // the bow
  tri(M1, m1, b, [1, 1, 1], 1); tri(M1, b, B, [1, 1, 1], 1);
  quad(S0, s0, s1, S1, [1, 1, 1], 1);                                                  // stern
  const deck = [0.82, 0.8, 0.74];
  quad(S0, S1, M1, M0, deck); tri(M0, M1, B, deck);
  box(-0.4, -0.1, T, 0.3, -0.21, 0.21, [0.95, 0.56, 0.22]);                           // containers
  box(-0.06, 0.24, T, 0.3, -0.21, 0.21, [0.27, 0.57, 0.86]);
  box(0.28, 0.5, T, 0.26, -0.19, 0.19, [0.96, 0.8, 0.3]);
  box(-0.96, -0.52, T, 0.5, -0.22, 0.22, [0.97, 0.97, 0.97]);                         // bridge
  box(-0.9, -0.62, 0.5, 0.56, -0.24, 0.24, [0.36, 0.42, 0.55]);                        // its roof and windows' shade
  box(-0.84, -0.68, 0.56, 0.78, -0.08, 0.08, [0.92, 0.32, 0.27]);                     // funnel
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aHull', new THREE.Float32BufferAttribute(hull, 1));
  g.computeVertexNormals(); // non-indexed: flat, per face
  return g;
}

/** The wake: a flat strip behind the stern (aT 0 at the stern → 1 at the end, aS −1…1 across), shaded in the shader. */
function wakeGeometry() {
  const pos = [], t = [], sd = [], idx = [], N = 10, Y = 0.02;
  for (let i = 0; i <= N; i++) {
    const k = i / N, x = -0.9 - k * 2.6, half = 0.18 + 0.42 * Math.sqrt(k); // widens as it spreads out behind
    for (const s of [-1, 0, 1]) { pos.push(x, Y, s * half); t.push(k); sd.push(s); }
    if (i < N) for (const c of [0, 1]) { const a = i * 3 + c; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(sd, 1));
  g.setIndex(idx);
  return g;
}

/** Evenly spaced points along a smooth lane (by arc length), for cheap lookups every frame. */
function lane(path) {
  const curve = new THREE.CatmullRomCurve3(path.map(([lon, lat]) => lonLatToVec3(lon, lat)), false, 'centripetal');
  const len = curve.getLength(), n = Math.max(64, Math.round(len * 400));
  return { pts: curve.getSpacedPoints(n).map(p => p.normalize()), len };
}

export class Ships {
  constructor(globe) {
    this.globe = globe;
    this.lanes = ROUTES.map(r => lane(r.path));
    this.ships = [];
    ROUTES.forEach((r, ri) => {
      for (let i = 0; i < r.ships; i++) {
        const k = (ri * 7 + i * 3) % 997;
        this.ships.push({ lane: this.lanes[ri], u0: (i + 0.5 * ((k * 0.618) % 1)) / r.ships, dir: i % 2 ? -1 : 1, speed: SPEED * (0.85 + 0.3 * ((k * 0.377) % 1)) });
      }
    });
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 0.01 }, uLight: { value: LIGHT_DIR_VIEW }, uSun: SKY.uSun, uNight: SKY.uNight },
      vertexShader: /* glsl */`
        attribute vec3 aCol; attribute float aHull;
        uniform float uScale; uniform vec3 uLight; uniform vec3 uSun; uniform float uNight;
        varying vec3 vCol;
        void main(){
          vec3 at = instanceMatrix[3].xyz;                               // where the ship is (on the unit sphere)
          vec3 c = (modelViewMatrix * vec4(at, 1.0)).xyz;
          float face = dot(normalize(normalMatrix * at), normalize(-c));
          if (face < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; } // round the back of the globe: skip
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position * uScale, 1.0);
          vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
          vec3 rgb = mix(aCol, instanceColor, aHull) * (0.6 + 0.48 * max(dot(n, uLight), 0.0));
          float day = smoothstep(-0.05, 0.1, dot(normalize(at), uSun));
          vCol = rgb * mix(1.0, 0.3 + 0.7 * day, uNight);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vCol;
        void main(){ gl_FragColor = vec4(vCol, 1.0); }`,
    });
    this.mesh = new THREE.InstancedMesh(boatGeometry(), mat, this.ships.length);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const c = new THREE.Color();
    // the shader writes colours as they are (no output conversion), so hand it sRGB values
    this.ships.forEach((s, i) => this.mesh.setColorAt(i, c.set(HULLS[i % HULLS.length]).convertLinearToSRGB()));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2.5;       // over the sea and the fills, under highlights
    // the wakes: soft foam fanning out behind each ship and fading away (shares the ships' matrices; one more draw)
    const wakeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: mat.uniforms.uScale, uTime: { value: 0 }, uShow: { value: 0 }, uSun: SKY.uSun, uNight: SKY.uNight },
      vertexShader: /* glsl */`
        attribute float aT; attribute float aS;
        uniform float uScale; uniform vec3 uSun; uniform float uNight;
        varying float vT; varying float vS; varying float vDim; varying float vSeed;
        void main(){
          vec3 at = instanceMatrix[3].xyz;
          vec3 c = (modelViewMatrix * vec4(at, 1.0)).xyz;
          float face = dot(normalize(normalMatrix * at), normalize(-c));
          if (face < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vT = aT; vS = aS; vSeed = fract(at.x * 53.1 + at.z * 17.7);
          float day = smoothstep(-0.05, 0.1, dot(normalize(at), uSun));
          vDim = mix(1.0, 0.25 + 0.75 * day, uNight) * smoothstep(0.0, 0.15, face);
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position * uScale, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uShow;
        varying float vT; varying float vS; varying float vDim; varying float vSeed;
        void main(){
          float s = abs(vS);
          float arms = exp(-pow((s - 0.78) / 0.2, 2.0));                     // the two spreading wake lines
          float churn = exp(-s * s * 7.0) * (1.0 - smoothstep(0.0, 0.55, vT));  // white water right behind the stern
          float fleck = 0.75 + 0.25 * sin(vT * 26.0 - uTime * 3.0 + vSeed * 40.0 + vS * 3.0); // foam drifting back
          float a = (0.5 * arms + 0.7 * churn) * fleck * pow(1.0 - vT, 1.6) * smoothstep(0.0, 0.08, vT) * vDim;
          gl_FragColor = vec4(0.92, 0.97, 1.0, a * 0.75 * uShow);
        }`,
    });
    this.wake = new THREE.InstancedMesh(wakeGeometry(), wakeMat, this.ships.length);
    this.wake.instanceMatrix = this.mesh.instanceMatrix;
    this.wake.frustumCulled = false;
    this.wake.renderOrder = 2.45;
    globe.world.add(this.wake, this.mesh);
    this._m = new THREE.Matrix4(); this._f = new THREE.Vector3(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this.t0 = performance.now();
  }

  /** Every frame: sail on and keep the boats a steady size on screen. */
  tick(now) {
    this.mesh.visible = this.wake.visible = !document.body.classList.contains('lens-on');
    if (!this.mesh.visible) return;
    const g = this.globe, cam = g.camera;
    const D = cam.position.length(), tanH = Math.tan(cam.fov * Math.PI / 360), H = Math.max(1, g.size.y);
    const perPx = 2 * tanH * Math.max(0.05, D - 1) / H;                       // world units per pixel at the sea
    const radiusPx = H / 2 / tanH / Math.sqrt(Math.max(1e-4, D * D - 1));     // the globe's radius on screen
    const P0 = SHIP_PX, px = Math.min(P0.max, Math.max(P0.min, P0.base * (radiusPx / P0.radius) ** P0.power));
    this.mesh.material.uniforms.uScale.value = px / 2 * perPx;
    const t = reduced.matches ? 0 : (now - this.t0) / 1000;
    this.wake.material.uniforms.uTime.value = t;
    this.wake.material.uniforms.uShow.value = Math.min(1, Math.max(0, (px - 9) / 8)); // wakes only once ships are big enough to read
    this.wake.visible = px > 9;
    const m = this._m, F = this._f, S = this._s, P = this._p;
    this.ships.forEach((s, i) => {
      const { pts, len } = s.lane, n = pts.length - 1;
      const u = (((s.u0 + s.dir * s.speed * t / len) % 1) + 1) % 1;
      const x = u * n, j = Math.min(n - 1, Math.floor(x)), k = x - j;
      P.copy(pts[j]).lerp(pts[j + 1], k).normalize();
      F.subVectors(pts[j + 1], pts[j]).multiplyScalar(s.dir);
      S.crossVectors(F, P).normalize();                      // starboard
      P.addScaledVector(S, LANE).normalize();
      F.addScaledVector(P, -F.dot(P)).normalize();
      S.crossVectors(F, P);
      const grow = Math.min(1, u / 0.012, (1 - u) / 0.012);  // shrink into port at the ends of the lane
      m.makeBasis(F, P, S).scale(S.set(grow, grow, grow)).setPosition(P.x, P.y, P.z);
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
