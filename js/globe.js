// Scene, camera, controls, animated ocean, atmosphere.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SKY } from './sun.js';
import { QUALITY, ResolutionGovernor } from './perf.js';

/** A second finger within this many ms of the first starts a pinch (zoom) rather than a grab. */
export const PINCH_MS = 280;

export const LIGHT_DIR_VIEW = new THREE.Vector3(-0.45, 0.55, 0.7).normalize(); // light fixed relative to the viewer

const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/**
 * The baked ocean map (tools/build-ocean.mjs): R closeness to the coast, G unused, B land. Until it arrives the
 * shader sees open sea everywhere.
 */
function oceanMap() {
  const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  empty.needsUpdate = true;
  const uniform = { value: empty };
  new THREE.TextureLoader().load(new URL('../data/ocean.png', import.meta.url).href, t => {
    t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping;
    t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
    uniform.value = t;
  });
  return uniform;
}

/**
 * The sea as seen from orbit, calm and still: a medium ocean blue with a broad, gentle tone variation and a touch of
 * teal over the coastal shallows. Here and there, in slowly wandering patches, the light on the water shifts a little.
 * Scattered over it are a few crusty white crests, each placed, turned, sized and frayed at random (hashed on a 3D
 * grid, so they never line up or repeat a pattern), lit on one side with a soft shadow on the other so they read as
 * raised. The baked map (G) sets how many: a few everywhere, more along the storm tracks. Crests too small for the
 * pixels fade out instead of shimmering.
 */
function oceanMaterial() {
  return new THREE.ShaderMaterial({
    defines: { OCTAVES: QUALITY.oceanOctaves },
    uniforms: { uTime: { value: 0 }, uLight: { value: LIGHT_DIR_VIEW }, uSun: SKY.uSun, uNight: SKY.uNight, uMap: oceanMap() },
    vertexShader: /* glsl */`
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      void main(){
        vPos = position;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uLight; uniform vec3 uSun; uniform float uNight; uniform sampler2D uMap;
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      ${NOISE}
      float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main(){
        vec3 N = normalize(vN), P = normalize(vPos);
        float t = uTime;
        float lon = atan(P.x, P.z), lat = asin(clamp(P.y, -1.0, 1.0));
        vec2 map = texture2D(uMap, vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5)).rg;
        float shelf = map.r, storm = map.g;
        float n1 = snoise(P * 2.3);                  // broad, still: the tone of the water
        float n2 = snoise(P * 9.0 + n1 * 0.4);       // finer, still
        #if OCTAVES > 2
        float n3 = snoise(P * 34.0);
        #else
        float n3 = n2 * 0.6;
        #endif
        float facing = clamp(dot(N, vView), 0.0, 1.0);
        // medium ocean blue, deeper towards the limb, a touch of teal over the coastal shallows
        vec3 col = mix(vec3(0.060, 0.170, 0.400), vec3(0.120, 0.300, 0.610), pow(facing, 1.1));
        col *= 0.95 + 0.07 * n1 + 0.03 * n2;
        col = mix(col, vec3(0.110, 0.380, 0.600), pow(shelf, 1.8) * 0.32);
        // the water moves only here and there: slowly wandering patches where the light shifts a little
        float flow = smoothstep(0.62, 0.95, 0.5 + 0.5 * sin(dot(P, vec3(2.7, 1.9, 2.3)) * 3.0 + n1 * 4.0 + t * 0.02));
        col *= 1.0 + flow * 0.018 * sin(n2 * 5.0 + t * 0.2);

        // crusty white crests, scattered at random: one possible crest per cell of a 3D grid through the sphere
        float open = (1.0 - 0.85 * shelf) * (1.0 - smoothstep(1.13, 1.30, abs(lat)));  // calm shallows and pack ice
        vec3 q = P * 48.0, ci = floor(q), cf = fract(q);
        float h0 = hash3(ci), h1 = hash3(ci + 17.31), h2 = hash3(ci + 41.97), h3 = hash3(ci + 73.13);
        float dens = mix(0.014, 0.12, storm) * (0.35 + 1.3 * smoothstep(-0.5, 0.7, n1)) * open;
        float fwCell = length(fwidth(q));
        float crest = 0.0, shadow = 0.0;
        if (h0 < dens && fwCell < 0.6) {
          vec3 E = normalize(vec3(cos(lon), 0.0, -sin(lon)) + 1e-5), Nn = cross(P, E);
          vec3 d = cf - (0.3 + 0.4 * vec3(h1, h2, h3));                           // its centre, somewhere in the cell
          vec2 xy = vec2(dot(d, E), dot(d, Nn));                                  // on the surface
          float ang = h1 * 6.2832, ca = cos(ang), sa = sin(ang);
          float A = 0.14 + 0.15 * h2, B = A * (0.42 + 0.38 * h3);                  // own size and shape
          vec2 uv = vec2(ca * xy.x + sa * xy.y, -sa * xy.x + ca * xy.y);
          float rad = dot(d, P) / A;                                              // a small ellipsoid inside the cell, so the
          float r = length(vec3(uv / vec2(A, B), rad));                           // cell's faces never slice a crest
          float grain = hash3(floor(q * 40.0)), grain2 = hash3(floor(q * 95.0) + 5.1);
          float th = atan(uv.y / B, uv.x / A);
          float edge = 0.92 - 0.12 * sin(th * 3.0 + h2 * 9.0) - 0.07 * sin(th * 7.0 + h3 * 13.0) - 0.16 * grain; // crumbly
          float aa = fwidth(r) + 0.02;
          float m = 1.0 - smoothstep(edge - aa, edge + aa, r);
          vec2 Ld = normalize(vec2(-0.55, 0.83));                                 // light from the upper left
          float lit = 0.72 + 0.32 * dot(normalize(xy + 1e-4), Ld) * smoothstep(0.2, 0.9, r);
          vec2 xs = xy + Ld * A * 0.45;                                           // the shadow falls away from the light
          vec2 us = vec2(ca * xs.x + sa * xs.y, -sa * xs.x + ca * xs.y);
          float ms = 1.0 - smoothstep(edge - aa, edge + aa * 3.0, length(vec3(us / vec2(A, B), rad)));
          float snow = mix(0.62, 1.0, smoothstep(0.25, 0.75, grain2)) * (0.7 + 0.3 * smoothstep(edge, 0.15, r)); // snowy speckle
          crest = m * lit * snow;
          shadow = ms * (1.0 - m);
          float near = smoothstep(0.6, 0.25, fwCell);                             // too small to draw → fade out
          crest *= near; shadow *= near;
        }
        col = mix(col, col * 0.6, shadow * 0.45);
        col = mix(col, vec3(0.90, 0.94, 0.985), clamp(crest, 0.0, 1.0) * 0.85);

        vec3 Np = normalize(N + vec3(n2, n3, n1) * 0.04);
        float diff = clamp(dot(Np, uLight), 0.0, 1.0);
        col *= 0.66 + 0.46 * diff;

        // day & night; the glint follows the real Sun while it is on
        float sd = dot(P, uSun), day = smoothstep(-0.05, 0.10, sd);
        vec3 sunV = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
        vec3 L = normalize(mix(uLight, sunV, uNight * 0.85));
        vec3 H = normalize(L + vView);
        vec3 Ns = normalize(N + vec3(n1, n2 * 0.5, -n1) * 0.03);           // a calm surface for the glint, so it isn't blotchy
        float spec = pow(max(dot(Ns, H), 0.0), 140.0) * mix(1.0, day, uNight);
        col += vec3(0.62, 0.78, 1.0) * spec * 0.3;
        vec3 lit = mix(col * vec3(0.15, 0.19, 0.34), col * 1.05, day);            // night sea: dark, moonlit
        lit += vec3(1.0, 0.55, 0.25) * 0.06 * (1.0 - smoothstep(0.0, 0.09, abs(sd - 0.01))); // dusk glow
        col = mix(col, lit, uNight);
        float rim = pow(1.0 - facing, 3.0) * mix(1.0, 0.3 + 0.7 * day, uNight); // limb glow, dimmer on the night side
        col += vec3(0.20, 0.45, 1.0) * rim * 0.45;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function atmosphere() {
  const m = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vView;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */`
      varying vec3 vN; varying vec3 vView;
      void main(){ float x = clamp(-dot(vN, vView), 0.0, 1.0); float i = pow(smoothstep(0.0, 0.55, x), 2.6); gl_FragColor = vec4(0.32, 0.52, 1.0, 1.0) * i * 0.75; }`,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1.16, ...QUALITY.atmosphereSegments), m);
}

function graticule() {
  const pts = [];
  const v = (lon, lat) => { const cl = Math.cos(lat * Math.PI / 180); return [cl * Math.sin(lon * Math.PI / 180) * 1.0006, Math.sin(lat * Math.PI / 180) * 1.0006, cl * Math.cos(lon * Math.PI / 180) * 1.0006]; };
  for (let lon = -180; lon < 180; lon += 30) for (let lat = -80; lat < 80; lat += 2) pts.push(...v(lon, lat), ...v(lon, lat + 2));
  for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 2) pts.push(...v(lon, lat), ...v(lon + 2, lat));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.07, depthWrite: false }));
}

/**
 * A light scatter of soft stars, like the backdrop of a solar-system model: mostly faint pinpoints, a few
 * brighter ones with a gentle glow, faintly blue or warm, each twinkling slowly at its own pace.
 */
function stars() {
  const n = QUALITY.stars, p = new Float32Array(n * 3), seed = new Float32Array(n), tint = new Float32Array(n * 3);
  const warm = [1.0, 0.86, 0.72], cool = [0.76, 0.86, 1.0], white = [1, 1, 1];
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(50);
    p.set([v.x, v.y, v.z], i * 3);
    seed[i] = Math.random();
    const r = Math.random();
    tint.set(r < 0.18 ? warm : r < 0.5 ? cool : white, i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute float seed; attribute vec3 tint; uniform float uTime; uniform float uPR;
      varying float vA; varying vec3 vTint; varying float vGlow;
      void main(){
        float bright = pow(seed, 6.0);                       // most stars faint, a handful bright
        float tw = 0.5 + 0.5 * sin(uTime * (0.35 + seed * 0.9) + seed * 61.0);
        vA = (0.22 + 0.7 * bright) * (0.55 + 0.45 * tw);
        vGlow = bright;
        vTint = tint;
        gl_PointSize = (1.6 + bright * 5.5) * uPR;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying float vA; varying vec3 vTint; varying float vGlow;
      void main(){
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(0.55, 0.0, d);
        float halo = exp(-d * d * 5.0) * 0.45 * vGlow;   // soft glow only around the brighter ones
        gl_FragColor = vec4(vTint, clamp((core + halo) * vA, 0.0, 1.0)); // alpha falloff: the canvas is transparent
      }`,
  });
  return new THREE.Points(g, m);
}

export function createGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY.antialias, alpha: true, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
  const HOME_DIR = new THREE.Vector3(0, 0.35, 3.2).normalize(); // start-up framing; recenter() returns here
  camera.position.copy(HOME_DIR).multiplyScalar(3.2); // fit() sets the real distance

  const world = new THREE.Group(); // everything on the globe lives here
  scene.add(world);

  const ocean = new THREE.Mesh(new THREE.SphereGeometry(1, ...QUALITY.oceanSegments), oceanMaterial());
  ocean.renderOrder = -10;
  world.add(ocean, graticule());
  scene.add(atmosphere());
  const starField = stars(); starField.material.uniforms.uPR.value = renderer.getPixelRatio();
  scene.add(starField);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 1.25; controls.maxDistance = 7;
  // The idle auto-rotate is driven by js/spin.js (globe.autoRotate), not OrbitControls: OrbitControls pauses
  // its own auto-rotate while a pinch is in progress, and zooming must never stop or start the rotation.
  controls.autoRotate = false;

  // Idle → gentle auto-rotate; grabbing the globe pauses it. Holds (e.g. an open country card) keep it off.
  // Zooming (wheel, pinch, +/-) leaves it alone.
  let idleTimer;
  const holds = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const autoAllowed = () => !globe.lockAuto && !holds.size && !reducedMotion.matches;
  const pauseAuto = () => { globe.autoRotate = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (autoAllowed()) globe.autoRotate = true; }, 12000); };
  // a second finger arriving straight after the first is a pinch, not a grab: undo the pause
  const touches = new Set(); let grab = null;
  canvas.addEventListener('pointerdown', e => {
    touches.add(e.pointerId);
    if (touches.size === 1) { grab = { t: performance.now(), auto: globe.autoRotate }; pauseAuto(); }
    else if (grab && performance.now() - grab.t < PINCH_MS && grab.auto && autoAllowed()) globe.resumeAuto();
  });
  const lift = e => touches.delete(e.pointerId);
  addEventListener('pointerup', lift); addEventListener('pointercancel', lift);

  const globe = {
    renderer, scene, camera, controls, world, ocean, lockAuto: false, pauseAuto,
    autoRotate: !reducedMotion.matches,
    autoRotateSpeed: 0.0367, // rad/s (about 2¾ minutes per turn)
    /** Keep the idle auto-rotate off while `reason` is held. Releasing returns whether it was held. */
    hold(reason, on) { if (on) { holds.add(reason); globe.autoRotate = false; return true; } return holds.delete(reason); },
    /** Start the idle auto-rotate now instead of after the idle delay. */
    resumeAuto() { clearTimeout(idleTimer); globe.autoRotate = autoAllowed(); },
    /** Fly back to the start-up framing. */
    flyHome(ms = 1100) { globe.flyTo(HOME_DIR, globe.fitDistance, ms); },
    insetX: 0, // horizontal px reserved by side banners
    fitDistance: 3.2,
    size: new THREE.Vector2(),
    resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      globe.size.set(w, h);
      // fit the globe into the free area (between banners), ~84% of the smaller side
      const freeW = Math.max(240, w - globe.insetX * 2);
      const targetPx = Math.min(freeW * 0.47, h * 0.42); // globe radius in px
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const alpha = Math.atan((targetPx / (h / 2)) * tanHalf);
      const prevFit = globe.fitDistance;
      globe.fitDistance = 1 / Math.sin(alpha);
      const dist = camera.position.length();
      camera.position.setLength(THREE.MathUtils.clamp(dist * (globe.fitDistance / prevFit), controls.minDistance, controls.maxDistance));
      controls.maxDistance = Math.max(4, globe.fitDistance * 1.6);
      globe.onResize?.(w, h);
    },
    /** Zoom by a factor (keyboard +/-), eased, without touching the rotation. */
    zoomBy(f) {
      if (globe.flight) return;
      const d0 = camera.position.length(), to = THREE.MathUtils.clamp((globe.zoom?.to ?? d0) * f, controls.minDistance, controls.maxDistance);
      globe.zoom = { from: d0, to, t0: performance.now() };
    },
    /** Smoothly turn the camera to face `dir` (unit vector) at distance `dist`. */
    flyTo(dir, dist = camera.position.length(), ms = 1100) {
      if (reducedMotion.matches) ms = 1; // jump instead of flying
      globe.zoom = null;
      const from = camera.position.clone().normalize(); const to = dir.clone().normalize();
      const d0 = camera.position.length(); const t0 = performance.now();
      const q = new THREE.Quaternion().setFromUnitVectors(from, to);
      const qI = new THREE.Quaternion();
      globe.flight = (now) => {
        const k = Math.min(1, (now - t0) / ms); const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        qI.identity().slerp(q, e);
        camera.position.copy(from).applyQuaternion(qI).setLength(d0 + (dist - d0) * e);
        camera.lookAt(0, 0, 0);
        if (k >= 1) globe.flight = null;
      };
    },
  };
  globe.fitDistance = 3.2;
  // drop resolution on devices that can't hold the frame rate (never above the starting ratio)
  globe.governor = new ResolutionGovernor(renderer.getPixelRatio(), pr => {
    renderer.setPixelRatio(pr);
    renderer.setSize(globe.size.x, globe.size.y, false);
    starField.material.uniforms.uPR.value = pr;
  });
  window.addEventListener('resize', () => globe.resize());
  return globe;
}

const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
export function tickGlobe(globe, t) {
  if (reducedMotionQuery.matches) t = 0;          // reduced motion: still water, steady stars
  globe.ocean.material.uniforms.uTime.value = t;
  globe.scene.children.forEach(c => c.material?.uniforms?.uTime && (c.material.uniforms.uTime.value = t));
  if (globe.zoom) {
    const z = globe.zoom, k = Math.min(1, (performance.now() - z.t0) / (reducedMotionQuery.matches ? 1 : 260));
    globe.camera.position.setLength(z.from + (z.to - z.from) * (1 - Math.pow(1 - k, 3)));
    if (k >= 1) globe.zoom = null;
  }
}
