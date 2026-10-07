// Rollercoaster audio: flick the globe hard and a recorded crowd screams in panic; grab the globe (or let it
// slow down) and the screams fade away. Only the owner's recording(s) in THRILLS.samples play, straight
// (no wind, drone, synthesised voices, 3D panning or pitch changes).
import * as THREE from 'three';

export const THRILLS = {
  screamSpeed: 10,      // rad/s of momentum where the crowd is fully screaming (a hard flick)
  screamFrom: 7,        // rad/s where it starts to rise
  wakeFrom: 5,          // rad/s where the audio engine wakes up, so the loop is running before it is heard
  volume: 0.7,
  samples: ['sounds/crowd-panic.mp3'], // the screams: recorded crowd, seamless loop
  sampleMix: 1,         // level of each recorded loop
};

const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Plays the recorded loops on a live AudioContext, faded by spin speed. */
export class RideAudio {
  constructor(ctx, dest) {
    this.ctx = ctx; this.dest = dest; this.ready = false; this.sources = [];
  }

  init(recorded = []) {
    const ctx = this.ctx;
    this.sources = recorded.map((buf, i) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(g).connect(this.dest);
      s.start(ctx.currentTime, (i * buf.duration) / Math.max(1, recorded.length));
      return { s, g, mix: THRILLS.sampleMix };
    });
    this.ready = true;
  }

  /** speed: momentum in rad/s · t: AudioContext time. Returns 0…1, how much screaming. */
  drive(t, speed) {
    if (!this.ready) return 0;
    const x = smooth(THRILLS.screamFrom, THRILLS.screamSpeed, speed);
    for (const src of this.sources) src.g.gain.setTargetAtTime(x * src.mix, t, 0.22); // ~0.7 s fade in/out
    return x;
  }
}

/** Master bus: volume → glue compressor → limiter → output. Returns the input gain. */
export function createMaster(ctx, volume = THRILLS.volume) {
  const master = ctx.createGain(); master.gain.value = volume;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -3; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.1;
  master.connect(comp).connect(limit).connect(ctx.destination);
  return master;
}

// ─────────────────────────────────────────────────────────────── page glue
export class Thrills {
  constructor(globe, spin) {
    this.globe = globe; this.spin = spin;
    this.ctx = null; this.ride = null; this.screamed = false; this.onFirstScream = null; this.silentSince = 0;
    try { this.muted = localStorage.getItem('ei-muted') === '1'; } catch { this.muted = false; }
  }

  /** Browsers only allow audio after a user gesture — call this from pointerdown. */
  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = createMaster(ctx);
      this.ride = new RideAudio(ctx, this.master);
      this.loadLoops().then(loops => this.ride.init(loops)).catch(e => console.warn('Ride audio failed', e));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  async loadLoops() {
    const all = await Promise.all(THRILLS.samples.map(async url => {
      try {
        const res = await fetch(url); if (!res.ok) throw new Error(res.status);
        return await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch (e) { console.warn('Could not load crowd sample', url, e); return null; }
    }));
    return all.filter(Boolean);
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('ei-muted', m ? '1' : '0'); } catch { /* storage unavailable */ }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : THRILLS.volume, this.ctx.currentTime, 0.08);
    if (!m) this.unlock();
  }

  tick(now) {
    if (!this.ride?.ready || this.muted) return;
    const speed = this.spin.momentum();
    if (speed > THRILLS.wakeFrom && this.ctx.state === 'suspended') this.ctx.resume();
    const x = this.ride.drive(this.ctx.currentTime, speed);
    if (x > 0.5 && !this.screamed) { this.screamed = true; this.onFirstScream?.(); }
    // let the audio engine sleep when the ride is over (saves battery)
    if (speed < THRILLS.wakeFrom * 0.8) { if (!this.silentSince) this.silentSince = now; else if (now - this.silentSince > 3000 && this.ctx.state === 'running') this.ctx.suspend(); }
    else this.silentSince = 0;
  }
}
