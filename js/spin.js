// Flywheel spinning: the globe keeps its momentum like a desk globe.
//  • swipe     → adds to the spin it already has (a push on a spinning globe speeds it up)
//  • hold/tap  → a finger resting on it (or a tap) stops it; dragging against the spin stops it too
//  • drag      → the surface follows your finger
//  • flick     → it keeps spinning at the speed you let go with, slowing gently
//  • pinch     → zooms only: the spin (or the idle auto-rotate) carries on
//  • arrow keys → turn it smoothly; held for a while they build momentum, a short press stops quickly
// OrbitControls keeps zoom (wheel / pinch); rotation, including the idle auto-rotate, is handled here.
import * as THREE from 'three';
import { PINCH_MS } from './globe.js';

export const SPIN = {
  friction: 0.34,        // per second while spinning fast (lower = keeps momentum longer); ~2 s half-life
  slowFriction: 1.6,     // per second below `slowBelow`, so a slow drift settles instead of crawling forever
  slowBelow: 0.5,        // rad/s
  maxSpeed: 24,          // rad/s
  tiltDamping: 6,        // up/down momentum fades quickly (the globe spins around its axis, like a real one)
  holdStopMs: 140,       // a finger resting this long on a spinning globe stops it (a grab, not a push)
  quickStop: 6,          // friction (per second) after a short arrow-key press: settles quickly (a tap turns it ~6°)
  keyCoastAfter: 0.9,    // s: arrow keys held at least this long leave momentum behind on release
};

export class Spin {
  constructor(globe) {
    this.globe = globe;
    this.v = 0; this.vPhi = 0;           // angular velocities (rad/s) of camera azimuth / polar angle
    this.angle = 0;                      // total azimuth travelled
    this.dragging = false; this.pending = { t: 0, p: 0 }; this.samples = [];
    this.auto = 0;                       // 0…1: the idle auto-rotate eases in and out instead of jumping
    this.sph = new THREE.Spherical();
  }

  /** Globe radius on screen in px (so a drag moves the surface under the pointer). */
  radiusPx() {
    const g = this.globe, d = g.camera.position.length();
    const a = Math.asin(Math.min(1, 1 / d));
    return Math.tan(a) / Math.tan(THREE.MathUtils.degToRad(g.camera.fov / 2)) * (g.size.y / 2);
  }

  /**
   * Pointer down on the globe. The spin carries on under the finger, so a swipe adds to it; a finger that rests
   * (or a tap) stops it, see update() and end(). The idle auto-rotate becomes ordinary momentum, so it can be pushed too.
   */
  begin(x, y, now) {
    this.wasSpinning = Math.abs(this.v) > 0.6;
    this.saved = { v: this.v, vPhi: this.vPhi, auto: this.auto, t: now };
    this.v -= this.auto * this.globe.autoRotateSpeed; this.auto = 0; this.quick = false;
    this.dragging = true; this.ox = x; this.oy = y; this.last = { x, y, now }; this.lastMoveAt = now; this.samples = [];
  }

  move(x, y, now) {
    if (!this.dragging) return;
    const dx = x - this.last.x, dy = y - this.last.y;
    if (!dx && !dy) return;
    const R = Math.max(60, this.radiusPx());
    const dt = -dx / R, dp = -dy / R;
    if (dt && this.v && Math.sign(dt) !== Math.sign(this.v)) this.v = 0; // dragging against the spin: grab it
    this.pending.t += dt; this.pending.p += dp;
    this.samples.push({ now, dt, dp });
    while (this.samples.length && now - this.samples[0].now > 110) this.samples.shift();
    this.last = { x, y, now }; this.lastMoveAt = now;
  }

  /** Pointer released. Returns true when the tap was only used to stop a spinning globe. */
  end(now, wasTap) {
    if (!this.dragging) return false;
    this.dragging = false;
    if (wasTap) { const braked = this.wasSpinning; this.stop(); return braked; } // a tap stops it
    // release velocity from the last ~100 ms of movement (zero if the pointer stopped before letting go), added to
    // the momentum still running: a push the same way speeds it up, a push the other way slows or turns it
    const recent = this.samples.filter(s => now - s.now < 100);
    if (recent.length && now - this.lastMoveAt < 70) {
      const span = Math.max(0.016, (now - recent[0].now) / 1000 + 0.008);
      const vr = recent.reduce((a, s) => a + s.dt, 0) / span, pr = recent.reduce((a, s) => a + s.dp, 0) / span;
      this.v = THREE.MathUtils.clamp(this.v + vr, -SPIN.maxSpeed, SPIN.maxSpeed);
      this.vPhi = THREE.MathUtils.clamp(pr, -2, 2);
    }
    this.samples = [];
    return false;
  }

  cancel() { this.dragging = false; this.pending.t = this.pending.p = 0; this.samples = []; }

  /** A second finger went down: if it followed the first at once, this is a pinch, so give the spin back. */
  pinch(now) {
    const s = this.saved, quick = this.dragging && s && now - s.t < PINCH_MS;
    this.cancel();
    if (quick) { this.v = s.v; this.vPhi = s.vPhi; this.auto = s.auto; this.wasSpinning = false; }
  }
  stop() { this.v = 0; this.vPhi = 0; this.quick = false; }
  brake() { this.stop(); }

  /** Spin speed from momentum only (rad/s) — manual dragging doesn't count. */
  momentum() { return Math.abs(this.v); }

  /**
   * Arrow keys, every frame: x −1…1 (right = +1), y −1…1 (up = +1), held = seconds the keys have been down, or null
   * once they are released. Turns at a gentle speed at first and builds up only if held; a short press then
   * settles quickly, a long one leaves momentum behind. Speeds scale with zoom, so it feels the same close up.
   */
  keys(dir, now) {
    const g = this.globe;
    if (!dir) {
      if (this.keyHeld != null) { this.quick = this.keyHeld < SPIN.keyCoastAfter; this.keyHeld = null; }
      return;
    }
    const fresh = this.keyHeld == null;
    this.keyHeld = dir.held; this.quick = false;
    const d = g.camera.position.length(), zoom = THREE.MathUtils.clamp((d - 1) / Math.max(0.2, g.fitDistance - 1), 0.12, 1.6);
    const ramp = THREE.MathUtils.smoothstep(dir.held, 0.3, 1.4);
    const speed = (0.6 + 1.6 * ramp) * zoom * (dir.fast ? 2 : 1);
    this.target = { v: dir.x * speed, vPhi: -dir.y * 0.7 * zoom * (dir.fast ? 2 : 1) }; // → turns the globe's face to the right
    if (fresh) { if (dir.x) this.v = this.target.v; if (dir.y) this.vPhi = this.target.vPhi; } // a press answers at once
    this.auto = 0; g.pauseAuto();
  }

  update(now, dtSec) {
    const g = this.globe;
    if (g.flight) { this.stop(); this.pending.t = this.pending.p = 0; this.target = null; return; }
    const dt = Math.min(dtSec, 0.05);
    if (this.keyHeld != null && this.target) {          // arrow keys held: ease towards their speed
      const k = 1 - Math.exp(-10 * dt);
      this.v += (this.target.v - this.v) * k; this.vPhi += (this.target.vPhi - this.vPhi) * k;
    } else {
      this.target = null;
      const f = this.quick ? SPIN.quickStop : Math.abs(this.v) > SPIN.slowBelow ? SPIN.friction : SPIN.slowFriction;
      this.v *= Math.exp(-f * dt);
      this.vPhi *= Math.exp(-(this.quick ? SPIN.quickStop : SPIN.tiltDamping) * dt);
    }
    if (Math.abs(this.v) < 0.003) { this.v = 0; this.quick = false; }
    // a finger resting on a spinning globe stops it (moving fingers keep pushing it along)
    if (this.dragging && now - this.lastMoveAt > SPIN.holdStopMs) { this.v = 0; this.vPhi = 0; }

    // idle auto-rotate: eases in over ~1.5 s, out over ~0.3 s
    const want = g.autoRotate && !this.dragging ? 1 : 0;
    this.auto += (want - this.auto) * (1 - Math.exp(-(want ? 2 : 10) * dt));
    if (this.auto < 0.001) this.auto = want ? 0.001 : 0;

    const dTheta = this.pending.t + (this.v - this.auto * g.autoRotateSpeed) * dt, dPhi = this.pending.p + this.vPhi * dt;
    this.pending.t = this.pending.p = 0;
    if (!dTheta && !dPhi) return;
    this.angle += dTheta;
    if (Math.abs(this.v) > 0.05 || this.dragging) g.pauseAuto();
    this.sph.setFromVector3(g.camera.position);
    this.sph.theta += dTheta;
    this.sph.phi = THREE.MathUtils.clamp(this.sph.phi + dPhi, 0.18, Math.PI - 0.18);
    g.camera.position.setFromSpherical(this.sph);
    g.camera.lookAt(0, 0, 0);
  }
}
