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
 * The baked ocean map (tools/build-ocean.mjs): R closeness to the coast, G storminess, B land. Until it arrives
 * the shader sees a calm open sea.
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
      void main(){
        vec3 N = normalize(vN), P = normalize(vPos);
        float t = uTime;
        float lon = atan(P.x, P.z), lat = asin(clamp(P.y, -1.0, 1.0));
        vec3 m = texture2D(uMap, vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5)).rgb;
        float shelf = m.r, storm = m.g;
        // slow, swirling water: large domain-warped noise (no repeating bands), finer ripples on top
        float n1 = snoise(P * 3.2 + vec3(t * 0.010, -t * 0.007, t * 0.009));
        float n2 = snoise(P * 10.0 + n1 * 0.7 + vec3(-t * 0.030, t * 0.022, t * 0.026));
        #if OCTAVES > 2
        float n3 = snoise(P * 46.0 + n2 * 0.5 + vec3(t * 0.11, -t * 0.08, t * 0.06));
        #else
        float n3 = n2 * 0.6;
        #endif
        float facing = clamp(dot(N, vView), 0.0, 1.0);
        // realistic, muted palette: deep navy offshore, lighter teal over the coastal shallows
        vec3 deep = vec3(0.016, 0.055, 0.135), mid = vec3(0.032, 0.130, 0.290);
        vec3 col = mix(deep, mid, pow(facing, 1.5));
        col *= 0.92 + 0.16 * (n1 * 0.6 + n2 * 0.4);
        col = mix(col, vec3(0.045, 0.215, 0.27), pow(shelf, 1.7) * 0.6);
        col = mix(col, col * vec3(0.86, 0.94, 1.0) + vec3(0.010, 0.016, 0.022), storm * 0.55); // rough water: greyer, choppier
        vec3 Np = normalize(N + vec3(n2, n3, n1) * (0.05 + 0.06 * storm));
        float diff = clamp(dot(Np, uLight), 0.0, 1.0);
        col *= 0.62 + 0.5 * diff;

        // white crests where the sea is rough: wave fronts lying across the wind, travelling downwind, bent by the
        // swell and broken into short segments that form and fade on their own. A finer set joins in when zoomed
        // in close; each set fades out once it is too fine to draw. Only computed inside the storm areas.
        float foam = 0.0;
        if (storm > 0.03) {
          vec3 E = vec3(cos(lon), 0.0, -sin(lon));                            // east, along the surface
          float alat = abs(lat), dir = alat > 0.56 && alat < 1.15 ? 1.0 : -1.0; // westerlies blow east, trades west
          float along = dot(P, E) * dir;
          float broken = snoise(P * vec3(55.0, 70.0, 55.0) + vec3(t * 0.05, -t * 0.04, t * 0.12));
          float amount = smoothstep(0.08, 0.7, storm);
          // coarse fronts
          float ph = along * 230.0 + n2 * 2.6 + n1 * 4.0 - t * 0.9;
          float f = fract(ph / 6.2831853), fw = fwidth(ph) / 6.2831853 + 0.002;
          float crest = smoothstep(0.80 - fw, 0.95, f) * (1.0 - smoothstep(0.96, 0.96 + fw * 2.0 + 0.02, f)); // sharp front, foam trailing behind
          foam = crest * smoothstep(0.05, 0.5, broken) * smoothstep(0.28, 0.08, fw);
          #if OCTAVES > 2
          // fine fronts, only up close (not on the low tier)
          float fade2 = smoothstep(0.12, 0.03, fw * 3.2);
          if (fade2 > 0.01) {
            float ph2 = along * 740.0 + n3 * 3.0 + n2 * 5.0 - t * 1.7;
            float f2 = fract(ph2 / 6.2831853), fw2 = fwidth(ph2) / 6.2831853 + 0.002;
            float crest2 = smoothstep(0.84 - fw2, 0.96, f2) * (1.0 - smoothstep(0.97, 0.99 + fw2, f2));
            foam = max(foam, crest2 * smoothstep(0.25, 0.7, broken + n3 * 0.5) * fade2 * 0.75);
          }
          #endif
          foam *= amount;
        }
        col = mix(col, vec3(0.78, 0.86, 0.94), foam * 0.6);

        // day & night; the glint follows the real Sun while it is on
        float sd = dot(P, uSun), day = smoothstep(-0.05, 0.10, sd);
        vec3 sunV = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
        vec3 L = normalize(mix(uLight, sunV, uNight * 0.85));
        vec3 H = normalize(L + vView);
        vec3 Ns = normalize(N + vec3(n1, n2 * 0.5, -n1) * 0.03);           // a calmer surface for the glint, so it isn't blotchy
        float spec = pow(max(dot(Ns, H), 0.0), 140.0) * mix(1.0, day, uNight);
        col += vec3(0.62, 0.78, 1.0) * spec * (0.2 + 0.16 * (1.0 - storm));
        vec3 lit = mix(col * vec3(0.17, 0.21, 0.38), col * 1.1, day);            // night sea: dark, moonlit
        lit += vec3(1.0, 0.55, 0.25) * 0.06 * (1.0 - smoothstep(0.0, 0.09, abs(sd - 0.01))); // dusk glow
        col = mix(col, lit, uNight);
        float rim = pow(1.0 - facing, 3.0) * mix(1.0, 0.3 + 0.7 * day, uNight); // limb glow, dimmer on the night side
        col += vec3(0.20, 0.45, 1.0) * rim * 0.5;
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
  globe.ocean.material.uniforms.uTime.value = t;
  globe.scene.children.forEach(c => c.material?.uniforms?.uTime && (c.material.uniforms.uTime.value = t));
  if (globe.zoom) {
    const z = globe.zoom, k = Math.min(1, (performance.now() - z.t0) / (reducedMotionQuery.matches ? 1 : 260));
    globe.camera.position.setLength(z.from + (z.to - z.from) * (1 - Math.pow(1 - k, 3)));
    if (k >= 1) globe.zoom = null;
  }
}
