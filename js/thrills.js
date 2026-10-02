// Rollercoaster audio: flick the globe hard and a crowd screams around you, circling in the
// direction of the spin. Grab the globe (or let it slow down) and it all fades away.
//
// The crowd is a few seconds of many overlapping voices, rendered once with the Web Audio API
// when sound first unlocks, then looped and steered in 3D (HRTF panning) while the globe spins.
// For an even more natural sound, list recorded crowd-scream loops in THRILLS.samples.
import * as THREE from 'three';

export const THRILLS = {
  screamSpeed: 10,      // rad/s of momentum where the crowd is fully screaming (a hard flick)
  screamFrom: 7,        // rad/s where it starts to rise
  windFrom: 2.5,        // rad/s where the rushing air starts
  volume: 0.7,
  orbit: 0.3,           // how fast the crowd circles your head relative to the globe's spin
  samples: [],          // e.g. ['sounds/crowd-scream-1.mp3'] — used instead of the synthesised crowd
};

const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function noiseBuffer(ctx, secs = 2) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate);
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function reverbIR(ctx, secs = 2.2) {
  const b = ctx.createBuffer(2, Math.floor(ctx.sampleRate * secs), ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4) * 0.5; }
  return b;
}

// ─────────────────────────────────────────────────────────────── one screaming person
// Natural scream cues: high pitch with irregular (not sinusoidal) wobble, strong breath noise,
// and "roughness" — fast 50–110 Hz amplitude flutter. No designed glides, so it doesn't sound cartoony.
function screamer(ctx, out, S, p) {
  const { t0, dur, f0, level, pan, tract, cutoff } = p;
  const end = t0 + dur;

  const src = ctx.createGain();                         // glottal + breath, before the vocal tract
  const osc = ctx.createOscillator(); osc.setPeriodicWave(S.glottal);
  const oscG = ctx.createGain(); oscG.gain.value = 1;
  osc.connect(oscG).connect(src);
  const br = ctx.createBufferSource(); br.buffer = S.noise; br.loop = true;
  const brG = ctx.createGain(); brG.gain.value = p.breath;
  br.connect(brG).connect(src);

  // irregular pitch drift: low-passed noise into frequency
  const jit = ctx.createBufferSource(); jit.buffer = S.noise; jit.loop = true;
  const jlp = ctx.createBiquadFilter(); jlp.type = 'lowpass'; jlp.frequency.value = 7; jlp.Q.value = 0.3;
  const jg = ctx.createGain(); jg.gain.value = f0 * 1.6;
  jit.connect(jlp).connect(jg).connect(osc.frequency);

  const f = osc.frequency;
  f.setValueAtTime(f0 * 0.82, t0);
  f.exponentialRampToValueAtTime(f0 * p.peak, t0 + p.rise);
  f.exponentialRampToValueAtTime(f0 * p.hold, t0 + dur * 0.72);
  f.exponentialRampToValueAtTime(f0 * p.fall, end);

  // vocal tract: open "ah" formants, scaled by tract size
  const tractOut = ctx.createGain();
  [[820, 6, 1], [1250, 9, 0.62], [2750, 10, 0.32], [3600, 12, 0.14]].forEach(([hz, q, g]) => {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hz * tract; bp.Q.value = q;
    const gg = ctx.createGain(); gg.gain.value = g * 4;
    src.connect(bp).connect(gg).connect(tractOut);
  });

  // roughness
  const rough = ctx.createGain(); rough.gain.value = 0.65;
  const lfo = ctx.createOscillator(); lfo.frequency.value = p.rough;
  const lfoG = ctx.createGain(); lfoG.gain.value = p.roughDepth;
  lfo.connect(lfoG).connect(rough.gain);

  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
  const env = ctx.createGain(); env.gain.value = 0;
  const g = env.gain;
  g.setValueAtTime(0, t0); g.linearRampToValueAtTime(level, t0 + p.attack);
  g.linearRampToValueAtTime(level * 0.8, t0 + dur * 0.75); g.linearRampToValueAtTime(0, end);
  const pn = ctx.createStereoPanner(); pn.pan.value = pan;
  tractOut.connect(rough).connect(lp).connect(env).connect(pn).connect(out);

  for (const n of [osc, br, jit, lfo]) { n.start(t0, n === br || n === jit ? Math.random() * 1.5 : 0); n.stop(end + 0.05); }
}

function voiceParams(t0) {
  const high = Math.random() < 0.7;                     // mostly high screams, some lower yells
  const near = Math.random() < 0.18;
  return {
    t0, dur: rnd(0.8, 2.1),
    f0: high ? rnd(640, 1250) : rnd(320, 560),
    tract: high ? rnd(1.0, 1.18) : rnd(0.88, 1.0),
    peak: rnd(1.08, 1.3), hold: rnd(0.95, 1.12), fall: rnd(0.62, 0.82), rise: rnd(0.08, 0.22),
    attack: rnd(0.05, 0.14), breath: rnd(0.35, 0.8),
    rough: rnd(50, 110), roughDepth: rnd(0.2, 0.42),
    level: (near ? rnd(0.8, 1) : rnd(0.35, 0.7)),
    pan: rnd(-0.8, 0.8), cutoff: near ? rnd(5500, 8000) : rnd(2600, 5000),
  };
}

/** Render a seamless loop of a screaming crowd. */
export async function renderCrowdLoop(sampleRate, { secs = 7, voices = 26 } = {}) {
  const total = secs + 2.2 + 2.2; // + longest voice + reverb tail, folded back onto the start
  const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * total), sampleRate);
  const n = 48, re = new Float32Array(n + 1), im = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) im[k] = Math.pow(k, -1.3);
  const S = { noise: noiseBuffer(ctx), glottal: ctx.createPeriodicWave(re, im) };
  const bus = ctx.createGain();
  const rev = ctx.createConvolver(); rev.buffer = reverbIR(ctx);
  const wet = ctx.createGain(); wet.gain.value = 0.4;
  bus.connect(ctx.destination); bus.connect(rev).connect(wet).connect(ctx.destination);
  for (let i = 0; i < voices; i++) {
    screamer(ctx, bus, S, voiceParams(rnd(0, secs)));
  }
  const buf = await ctx.startRendering();
  // fold everything past the loop end back to the start (seamless loop), then normalise
  const L = Math.floor(sampleRate * secs);
  const out = new AudioBuffer({ numberOfChannels: 2, length: L, sampleRate });
  let peak = 0;
  for (let c = 0; c < 2; c++) {
    const src = buf.getChannelData(c), dst = out.getChannelData(c);
    for (let i = 0; i < L; i++) dst[i] = src[i] + (i + L < src.length ? src[i + L] : 0);
    for (let i = 0; i + 2 * L < src.length && i < L; i++) dst[i] += src[i + 2 * L];
    for (let i = 0; i < L; i++) peak = Math.max(peak, Math.abs(dst[i]));
  }
  const k = 0.9 / (peak || 1);
  for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = 0; i < L; i++) d[i] *= k; }
  return out;
}

// ─────────────────────────────────────────────────────────────── the ride
/** Works on a live AudioContext or an OfflineAudioContext (used for previews). */
export class RideAudio {
  constructor(ctx, dest) {
    this.ctx = ctx; this.dest = dest; this.ready = false; this.sources = [];
  }

  async init(loops) {
    const ctx = this.ctx;
    if (!loops?.length) loops = await Promise.all([0, 1, 2].map(() => renderCrowdLoop(ctx.sampleRate)));
    // three groups of riders spread around you; they orbit as the globe spins
    this.sources = loops.slice(0, 3).map((buf, i) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.rolloffFactor = 0;
      s.connect(g).connect(p).connect(this.dest);
      s.start(ctx.currentTime, (i * buf.duration) / 3);
      return { s, g, p, offset: (i * 2 * Math.PI) / 3, phase: rnd(0, 10) };
    });
    // rushing air, stereo
    this.wind = [-0.7, 0.7].map(pan => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuffer(ctx, 3); s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.6; f.frequency.value = 400;
      const g = ctx.createGain(); g.gain.value = 0;
      const pn = ctx.createStereoPanner(); pn.pan.value = pan;
      s.connect(f).connect(g).connect(pn).connect(this.dest); s.start(ctx.currentTime, Math.random() * 2);
      return { f, g };
    });
    this.ready = true;
  }

  /** speed: momentum in rad/s · angle: total spin angle · t: AudioContext time */
  drive(t, speed, angle) {
    if (!this.ready) return;
    const x = smooth(THRILLS.screamFrom, THRILLS.screamSpeed, speed);   // 0…1 how much screaming
    const fade = 0.22;                                                // ~0.7 s fade in/out
    this.sources.forEach((src, i) => {
      const swell = 0.75 + 0.25 * Math.sin(t * 0.37 + src.phase) * Math.sin(t * 0.13 + src.phase * 2);
      src.g.gain.setTargetAtTime(x * swell * (i === 0 ? 1 : 0.85), t, fade);
      src.s.playbackRate.setTargetAtTime(0.96 + 0.07 * x, t, 0.3);
      const a = -angle * THRILLS.orbit + src.offset;
      const P = src.p;
      const px = Math.sin(a) * 1.5, pz = -Math.cos(a) * 1.5;
      if (P.positionX) { P.positionX.setTargetAtTime(px, t, 0.03); P.positionY.setTargetAtTime(0.4, t, 0.03); P.positionZ.setTargetAtTime(pz, t, 0.03); }
      else P.setPosition(px, 0.4, pz);
    });
    const w = THREE.MathUtils.clamp((speed - THRILLS.windFrom) / 14, 0, 0.32);
    this.wind.forEach(({ f, g }, i) => { g.gain.setTargetAtTime(w * (0.9 + 0.1 * Math.sin(t * 1.7 + i)), t, fade); f.frequency.setTargetAtTime(260 + speed * 55 + i * 60, t, 0.2); });
    return x;
  }
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
      this.master = ctx.createGain(); this.master.gain.value = THRILLS.volume;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
      const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -3; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.1;
      this.master.connect(comp).connect(limit).connect(ctx.destination);
      this.ride = new RideAudio(ctx, this.master);
      this.loadLoops().then(loops => this.ride.init(loops));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  async loadLoops() {
    const out = [];
    for (const url of THRILLS.samples) {
      try { out.push(await this.ctx.decodeAudioData(await (await fetch(url)).arrayBuffer())); }
      catch (e) { console.warn('Could not load crowd sample', url, e); }
    }
    return out;
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
    if (speed > THRILLS.windFrom && this.ctx.state === 'suspended') this.ctx.resume();
    const x = this.ride.drive(this.ctx.currentTime, speed, this.spin.angle);
    if (x > 0.5 && !this.screamed) { this.screamed = true; this.onFirstScream?.(); }
    // let the audio engine sleep when the ride is over (saves battery)
    if (speed < THRILLS.windFrom * 0.8) { if (!this.silentSince) this.silentSince = now; else if (now - this.silentSince > 3000 && this.ctx.state === 'running') this.ctx.suspend(); }
    else this.silentSince = 0;
  }
}
