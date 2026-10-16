// Easter egg: tap Namibia five times and a cargo ship comes in from the Atlantic, sounds its fog horn and runs
// aground on the Skeleton Coast (the wreck stays for the visit, rusting), then three oryx gallop across the desert
// towards it, ease to a stop and fade away. Only in normal browsing.
import * as THREE from 'three';
import { lonLatToVec3 } from './geo.js';

const TAPS = 5, WITHIN = 6000;           // five taps on Namibia within this many ms
const LAT = -20.4;                       // where on the Skeleton Coast it runs aground
const SAIL_MS = 4200, TIP_MS = 900;      // sailing in, then heeling over on the sand
const RUST_MS = 6000;                    // the hull darkens to rust after it stops
const WRECK_SCALE = 2.2;                 // a little larger than the passing ships, so the scene reads
const ORYX_AT = 3600, ORYX_MS = 7000, ORYX_STAY = 500;  // the oryx set off, run, ease to a stop and fade away
const HERD = [                           // start → end [lon, lat], delay (ms): from inland to the dunes behind the wreck
  { from: [18.6, -21.7], to: [14.35, -21.0], delay: 0 },
  { from: [19.0, -20.9], to: [14.8, -20.3], delay: 300 },
  { from: [19.3, -22.5], to: [14.9, -21.7], delay: 650 },
];
const RUST = new THREE.Color('#6b3a22').convertLinearToSRGB(), HULL = new THREE.Color('#22344f').convertLinearToSRGB();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// An oryx in profile, facing right: sandy body, white belly and face, black flank stripe and mask, long straight
// horns. Two leg poses swap while it runs (.ox-a / .ox-b).
const ORYX_SVG = `<svg viewBox="0 0 64 48" aria-hidden="true">
  <g class="ox-a" stroke="#2a2420" stroke-width="2.6" stroke-linecap="round"><path d="M43 27l7 11M41 28l6 12M18 27l-8 10M21 28l-7 11"/></g>
  <g class="ox-b" stroke="#2a2420" stroke-width="2.6" stroke-linecap="round"><path d="M43 27l-2 12M41 28l-4 11M18 27l4 12M21 28l5 10"/></g>
  <path d="M14 21c-4 3-4 7-5 10" stroke="#2a2420" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M14 23c0-7 8-9 18-9 8 0 13 2 14 6 1 6-4 10-14 10s-18-1-18-7z" fill="#cdb796"/>
  <path d="M18 27c6 4 20 4 26-1v2c-6 5-20 5-26 1z" fill="#f2ede4"/>
  <path d="M16 24c8 2 18 2 29-1" stroke="#1f1b18" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M40 16c4-4 7-7 10-9l5 3c-3 4-7 10-10 13z" fill="#cdb796"/>
  <path d="M46 21l6-10" stroke="#2a2420" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M51 7l-11-9M53 6.5l-9-9.5" stroke="#1f1b18" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M50 7c3-2 8-1 10 2 1 2-1 4-4 4l-4-1z" fill="#f4efe6"/>
  <path d="M51 8l8 3" stroke="#1f1b18" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

export function createNamibiaEgg({ globe, layer, ships, stage, track, muted, onFly }) {
  let taps = [], t0 = -1, coast = null, frozen = null;
  const since = now => frozen ?? now - t0;   // ms into the show (frozen: scripted checks hold one moment)
  const sound = new Audio('sounds/foghorn.mp3'); sound.preload = 'none'; sound.volume = 0.85;

  // the wreck: one more of the ships (same geometry and shader, so it has their size and light). Its material is
  // a transparent copy sharing their uniforms: the land fills draw in the transparent pass, after every opaque
  // object, so an opaque ship lying on the beach would be painted over by Namibia. As a tanker (aKind 1) it has a
  // bare deck, no container stacks standing out sideways.
  const mat = ships.mesh.material.clone();
  mat.uniforms = ships.mesh.material.uniforms; mat.transparent = true;
  const geo = ships.mesh.geometry.clone();
  geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(new Float32Array([1]), 1));
  const wreck = new THREE.InstancedMesh(geo, mat, 1);
  wreck.frustumCulled = false; wreck.renderOrder = 2.5; wreck.visible = false;
  wreck.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  wreck.setColorAt(0, HULL);
  const wake = new THREE.InstancedMesh(ships.wake.geometry, ships.wake.material, 1);
  wake.instanceMatrix = wreck.instanceMatrix; wake.frustumCulled = false; wake.renderOrder = 2.45; wake.visible = false;
  globe.world.add(wake, wreck);

  const herd = HERD.map(h => {
    const el = document.createElement('div');
    el.className = 'oryx'; el.hidden = true; el.innerHTML = ORYX_SVG;
    el.style.animationDelay = `-${(h.delay % 240) / 1000}s`;
    stage.append(el);
    return { ...h, el };
  });

  /** The first water west of Namibia's coast at LAT (from the map itself, so it sits on the drawn coastline). */
  function findCoast() {
    for (let lon = 15; lon > 10; lon -= 0.01) if (layer.pick(lon, LAT)?.key !== 'NAM') return lon;
    return 13.0;
  }

  const m = new THREE.Matrix4(), F = new THREE.Vector3(), P = new THREE.Vector3(), S = new THREE.Vector3(), q = new THREE.Quaternion();
  const _k = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), v = new THREE.Vector3(), w = new THREE.Vector3(), c = new THREE.Color();

  function start() {
    coast ??= findCoast();
    lonLatToVec3(coast - 2.7, LAT + 1.1, 1, A);      // out at sea, north-west
    lonLatToVec3(coast + 0.02, LAT, 1, B);            // on the shoreline
    t0 = performance.now(); frozen = null;
    wreck.setColorAt(0, HULL); wreck.instanceColor.needsUpdate = true;
    for (const h of herd) h.el.hidden = true;
    onFly?.(lonLatToVec3(coast + 2.4, LAT - 0.4, 1, new THREE.Vector3()), 1.5);
    if (!muted()) { try { sound.currentTime = 0; sound.play().catch(() => {}); } catch { /* no audio */ } } // the fifth tap is the gesture
    track('egg/namibia');
  }

  function placeShip(now) {
    const t = reduced.matches ? SAIL_MS + TIP_MS : since(now);
    const u = Math.min(1, t / SAIL_MS);
    // forward along the great circle A → B; a slight slow-down only in the last moment, then the sudden stop
    const k = u < 0.9 ? u : 0.9 + 0.1 * Math.sin((u - 0.9) / 0.1 * Math.PI / 2);
    P.copy(A).lerp(B, k).normalize();
    F.copy(B).sub(A); F.addScaledVector(P, -F.dot(P)).normalize();
    S.crossVectors(F, P).normalize();
    // aground: it slews round broadside to the beach and falls over onto its side, with a shudder as it hits
    const tip = Math.max(0, Math.min(1, (t - SAIL_MS) / TIP_MS));
    const ease = 1 - Math.pow(1 - tip, 3), shudder = tip > 0 && tip < 1 ? Math.sin(tip * 30) * 0.05 * (1 - tip) : 0;
    const yaw = -0.55 * ease, roll = 1.3 * ease + shudder, pitch = -0.06 * ease;
    const fwd = F.clone(), up = P.clone(), side = S.clone();
    q.setFromAxisAngle(up, yaw); fwd.applyQuaternion(q); side.applyQuaternion(q);
    q.setFromAxisAngle(fwd, roll); up.applyQuaternion(q); side.applyQuaternion(q);
    q.setFromAxisAngle(side, pitch); fwd.applyQuaternion(q); up.applyQuaternion(q);
    // afloat it sits at the sea's surface; on its side it rests on the sand (the land is drawn just above the sea,
    // and the hull's side lies half a beam from its centre line)
    const s = mat.uniforms.uScale.value * WRECK_SCALE;
    const r = 1 + ease * (0.0015 + 0.2 * s);
    m.makeBasis(fwd, up, side).scale(_k.setScalar(WRECK_SCALE)).setPosition(P.x * r, P.y * r, P.z * r);
    wreck.setMatrixAt(0, m); wreck.instanceMatrix.needsUpdate = true;
    wake.visible = u < 1 && ships.wake.visible;
    if (t >= SAIL_MS) {
      const r = Math.min(1, (t - SAIL_MS) / RUST_MS);
      wreck.setColorAt(0, c.copy(HULL).lerp(RUST, r)); wreck.instanceColor.needsUpdate = true;
    }
  }

  function placeHerd(now) {
    const cam = globe.camera, { x: W, y: H } = globe.size, camDir = w.copy(cam.position).normalize();
    const D = cam.position.length(), tanH = Math.tan(cam.fov * Math.PI / 360);
    const radiusPx = H / 2 / tanH / Math.sqrt(Math.max(1e-4, D * D - 1));
    const size = Math.max(20, Math.min(60, radiusPx * 0.08));
    const hideBusy = /quiz-on|comparing|picking|measuring|lens-on/.test(document.body.className);
    for (const h of herd) {
      const t = reduced.matches ? ORYX_MS : since(now) - ORYX_AT - h.delay;
      const end = ORYX_MS + ORYX_STAY;
      if (t < 0 || t > end || hideBusy) { h.el.hidden = true; continue; }
      const u = Math.min(1, t / ORYX_MS), k = u * u * (3 - 2 * u) * 0.25 + u * 0.75; // a quick start, easing into the stop
      const lon = h.from[0] + (h.to[0] - h.from[0]) * k, lat = h.from[1] + (h.to[1] - h.from[1]) * k + Math.sin(u * 9 + h.delay) * 0.05;
      lonLatToVec3(lon, lat, 1.003, v).applyMatrix4(globe.world.matrixWorld);
      const facing = v.clone().normalize().dot(camDir) > 0.25;
      v.project(cam);
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      // which way it runs on screen (the globe may be turned any way): the drawing faces right, so mirror it when
      // west (where it is heading) lies to the left
      lonLatToVec3(lon - 0.2, lat, 1.003, w).applyMatrix4(globe.world.matrixWorld).project(cam);
      const left = w.x < v.x;
      const fade = Math.min(1, t / 300, (end - t) / (ORYX_STAY + 400));
      h.el.hidden = !facing;
      h.el.classList.toggle('still', reduced.matches);
      h.el.style.opacity = fade.toFixed(2);
      h.el.style.width = size.toFixed(1) + 'px';
      h.el.style.transform = `translate(${(x - size / 2).toFixed(1)}px, ${(y - size * 0.68).toFixed(1)}px) scaleX(${left ? -1 : 1})`;
    }
  }

  return {
    get wreck() { return wreck; },
    /** Is the show still on (ship sailing, oryx running)? */
    get running() { return t0 >= 0 && performance.now() - t0 < ORYX_AT + ORYX_MS + ORYX_STAY + 600; },
    /** A country (or the sea: null) was tapped while browsing. Returns true when the show starts. */
    tapped(o) {
      if (o?.key !== 'NAM') { taps = []; return false; }
      const now = performance.now();
      taps = taps.filter(t => now - t < WITHIN); taps.push(now);
      if (taps.length < TAPS) return false;
      taps = []; start();
      return true;
    },
    /** Jump to this moment of the show (ms since it started): for scripted checks. */
    seek(ms, freeze = false) { if (t0 < 0) start(); t0 = performance.now() - ms; frozen = freeze ? ms : null; },
    /** Every frame. */
    tick(now) {
      if (t0 < 0) return;
      wreck.visible = ships.mesh.visible && !document.body.classList.contains('quiz-on');
      if (wreck.visible) placeShip(now); else wake.visible = false;
      placeHerd(now);
    },
  };
}
