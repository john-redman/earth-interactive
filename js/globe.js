// Scene, camera, controls, animated ocean, atmosphere.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SKY } from './sun.js';
import { QUALITY, ResolutionGovernor } from './perf.js';

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

function oceanMaterial() {
  return new THREE.ShaderMaterial({
    defines: { OCTAVES: QUALITY.oceanOctaves },
    uniforms: { uTime: { value: 0 }, uLight: { value: LIGHT_DIR_VIEW }, uSun: SKY.uSun, uNight: SKY.uNight },
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
      uniform float uTime; uniform vec3 uLight; uniform vec3 uSun; uniform float uNight;
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      ${NOISE}
      void main(){
        vec3 N = normalize(vN);
        float t = uTime;
        // two slow drifting swell layers + a fine ripple layer
        float n1 = snoise(vPos * 5.0 + vec3(t*0.020, t*0.012, -t*0.016));
        float n2 = snoise(vPos * 13.0 + vec3(-t*0.045, t*0.030, t*0.038));
        #if OCTAVES > 2
        float n3 = snoise(vPos * 34.0 + vec3(t*0.09, -t*0.07, t*0.05));
        #else
        float n3 = n2 * 0.6; // fine ripples are invisible on small screens; skip the third noise lookup
        #endif
        float waves = n1*0.55 + n2*0.30 + n3*0.15;
        vec3 Np = normalize(N + vec3(n2, n3, n1) * 0.06);
        float facing = clamp(dot(N, vView), 0.0, 1.0);
        vec3 deep = vec3(0.020, 0.062, 0.150);
        vec3 mid  = vec3(0.035, 0.150, 0.330);
        vec3 col = mix(deep, mid, pow(facing, 1.6));
        col += vec3(0.02, 0.06, 0.10) * waves;                 // swell tint
        float diff = clamp(dot(Np, uLight), 0.0, 1.0);
        col *= 0.55 + 0.6 * diff;
        vec3 H = normalize(uLight + vView);
        float spec = pow(max(dot(Np, H), 0.0), 90.0);
        col += vec3(0.55, 0.75, 1.0) * spec * 0.22;             // moving sun glint
        float sparkle = smoothstep(0.55, 0.75, n3 * 0.6 + n2 * 0.4) * 0.05 * diff;
        col += vec3(0.6, 0.85, 1.0) * sparkle;
        // real-time day & night, with a faint warm band along the terminator
        float sd = dot(normalize(vPos), uSun);
        float day = smoothstep(-0.10, 0.16, sd);
        col *= mix(1.0 - uNight * 1.1, 1.0, day);
        col += vec3(1.0, 0.55, 0.25) * 0.045 * uNight * (1.0 - smoothstep(0.0, 0.14, abs(sd - 0.02)));
        float rim = pow(1.0 - facing, 3.0);
        col += vec3(0.20, 0.45, 1.0) * rim * 0.55;              // limb glow
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

function stars() {
  const n = QUALITY.stars, p = new Float32Array(n * 3), s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 20);
    p.set([v.x, v.y, v.z], i * 3); s[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('seed', new THREE.BufferAttribute(s, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float seed; uniform float uTime; uniform float uPR; varying float vA;
      void main(){ vA = 0.25 + 0.35*seed + 0.15*sin(uTime*0.6 + seed*40.0); gl_PointSize = (0.8 + seed*1.4)*uPR; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(0.8,0.87,1.0, vA*smoothstep(0.5,0.1,d)); }`,
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
  controls.rotateSpeed = 0.5; controls.zoomSpeed = 0.7;
  controls.minDistance = 1.25; controls.maxDistance = 7;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;

  // Idle → gentle auto-rotate; any interaction pauses it. Holds (e.g. an open country card) keep it off.
  let idleTimer;
  const holds = new Set();
  const autoAllowed = () => !globe.lockAuto && !holds.size;
  const pauseAuto = () => { controls.autoRotate = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (autoAllowed()) controls.autoRotate = true; }, 12000); };
  canvas.addEventListener('pointerdown', pauseAuto);
  canvas.addEventListener('wheel', pauseAuto, { passive: true });

  const globe = {
    renderer, scene, camera, controls, world, ocean, lockAuto: false, pauseAuto,
    /** Keep the idle auto-rotate off while `reason` is held. Releasing returns whether it was held. */
    hold(reason, on) { if (on) { holds.add(reason); controls.autoRotate = false; return true; } return holds.delete(reason); },
    /** Start the idle auto-rotate now instead of after the idle delay. */
    resumeAuto() { clearTimeout(idleTimer); controls.autoRotate = autoAllowed(); },
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
    /** Smoothly turn the camera to face `dir` (unit vector) at distance `dist`. */
    flyTo(dir, dist = camera.position.length(), ms = 1100) {
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

export function tickGlobe(globe, t) {
  globe.ocean.material.uniforms.uTime.value = t;
  globe.scene.children.forEach(c => c.material?.uniforms?.uTime && (c.material.uniforms.uTime.value = t));
  // rotate faster when zoomed out, slower when close — keeps the surface "under the finger"
  const d = globe.camera.position.length();
  globe.controls.rotateSpeed = THREE.MathUtils.clamp((d - 1) * 0.32, 0.06, 0.9);
}
