// Flywheel spinning: the globe keeps its momentum like a desk globe.
//  • grab      → stops it dead, immediately
//  • drag      → the surface follows your finger
//  • flick     → it keeps spinning at the speed you let go with, slowing gently
// OrbitControls keeps zoom (wheel / pinch) and the idle auto-rotate; rotation is handled here.
import * as THREE from 'three';

export const SPIN = {
  friction: 0.12,        // per second while spinning fast (lower = keeps momentum longer)
  slowFriction: 1.1,     // per second below `slowBelow`, so a slow drift settles instead of crawling forever
  slowBelow: 0.35,       // rad/s
  maxSpeed: 24,          // rad/s
  tiltDamping: 6,        // up/down momentum fades quickly (the globe spins around its axis, like a real one)
};

export class Spin {
  constructor(globe) {
    this.globe = globe;
    this.v = 0; this.vPhi = 0;           // angular velocities (rad/s) of camera azimuth / polar angle
    this.angle = 0;                      // total azimuth travelled — drives the direction of the ride audio
    this.dragging = false; this.pending = { t: 0, p: 0 }; this.samples = [];
    this.sph = new THREE.Spherical();
  }

  /** Globe radius on screen in px (so a drag moves the surface under the pointer). */
  radiusPx() {
    const g = this.globe, d = g.camera.position.length();
    const a = Math.asin(Math.min(1, 1 / d));
    return Math.tan(a) / Math.tan(THREE.MathUtils.degToRad(g.camera.fov / 2)) * (g.size.y / 2);
  }

  /** Pointer down on the globe: a hand on the globe stops it at once. */
  begin(x, y, now) {
    this.wasSpinning = Math.abs(this.v) > 0.6;
    this.v = 0; this.vPhi = 0;
    this.dragging = true; this.ox = x; this.oy = y; this.last = { x, y, now }; this.lastMoveAt = now; this.samples = [];
  }

  move(x, y, now) {
    if (!this.dragging) return;
    const dx = x - this.last.x, dy = y - this.last.y;
    if (!dx && !dy) return;
    const R = Math.max(60, this.radiusPx());
    const dt = -dx / R, dp = -dy / R;
    this.pending.t += dt; this.pending.p += dp;
    this.samples.push({ now, dt, dp });
    while (this.samples.length && now - this.samples[0].now > 110) this.samples.shift();
    this.last = { x, y, now }; this.lastMoveAt = now;
  }

  /** Pointer released. Returns true when the tap was only used to stop a spinning globe. */
  end(now, wasTap) {
    if (!this.dragging) return false;
    this.dragging = false;
    if (wasTap) return this.wasSpinning;
    // release velocity from the last ~100 ms of movement (zero if the pointer stopped before letting go)
    const recent = this.samples.filter(s => now - s.now < 100);
    if (recent.length && now - this.lastMoveAt < 70) {
      const span = Math.max(0.016, (now - recent[0].now) / 1000 + 0.008);
      this.v = THREE.MathUtils.clamp(recent.reduce((a, s) => a + s.dt, 0) / span, -SPIN.maxSpeed, SPIN.maxSpeed);
      this.vPhi = THREE.MathUtils.clamp(recent.reduce((a, s) => a + s.dp, 0) / span, -2, 2);
    }
    this.samples = [];
    return false;
  }

  cancel() { this.dragging = false; this.pending.t = this.pending.p = 0; this.samples = []; }
  stop() { this.v = 0; this.vPhi = 0; }
  brake() { this.stop(); }

  /** Spin speed from momentum only (rad/s) — manual dragging doesn't count. */
  momentum() { return Math.abs(this.v); }

  update(now, dtSec) {
    const g = this.globe;
    if (g.flight) { this.stop(); this.pending.t = this.pending.p = 0; return; }
    const dt = Math.min(dtSec, 0.05);
    const f = Math.abs(this.v) > SPIN.slowBelow ? SPIN.friction : SPIN.slowFriction;
    this.v *= Math.exp(-f * dt);
    if (Math.abs(this.v) < 0.003) this.v = 0;
    this.vPhi *= Math.exp(-SPIN.tiltDamping * dt);

    const dTheta = this.pending.t + this.v * dt, dPhi = this.pending.p + this.vPhi * dt;
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
