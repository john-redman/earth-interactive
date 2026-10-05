// Rollercoaster audio: flick the globe hard and a terrified crowd shrieks around you, circling in
// the direction of the spin, over a dread bed (sub-bass throb, dissonant drone, distant groans)
// that swells as the globe speeds up. Now and then one piercing scream flies past your head.
// Grab the globe (or let it slow down) and it all fades away.
//
// Everything is rendered once with the Web Audio API when sound first unlocks (OfflineAudioContext),
// then looped and steered in 3D (HRTF panning) while the globe spins — so the live graph stays tiny.
// Recorded loops listed in THRILLS.samples are blended in on top of the synthesised crowd.
import * as THREE from 'three';

export const THRILLS = {
  screamSpeed: 10,      // rad/s of momentum where the crowd is fully screaming (a hard flick)
  screamFrom: 7,        // rad/s where it starts to rise
  windFrom: 2.5,        // rad/s where the rushing air and the dread start
  volume: 0.7,
  orbit: 0.3,           // how fast the crowd circles your head relative to the globe's spin
  dread: 0.55,          // level of the low drone / groan bed at full speed
  shriek: 0.8,          // level of the single fly-by screams
  shriekEvery: [2.4, 5.5], // seconds between fly-by screams while the crowd is screaming
  samples: [],          // e.g. ['sounds/crowd-1.m4a'] — recorded loops, blended with the synthesised crowd
  sampleMix: 1,         // level of each recorded loop (the synthesised groups drop to 0.6 alongside them)
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lowTier = () => typeof document !== 'undefined' && document.documentElement.dataset.quality === 'low';

function noiseBuffer(ctx, secs = 2) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate);
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
// a dark hall: short pre-delay, tail that loses its highs as it decays
function reverbIR(ctx, secs = 3.2) {
  const n = Math.floor(ctx.sampleRate * secs), pre = Math.floor(ctx.sampleRate * 0.025);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let y = 0;
    for (let i = pre; i < n; i++) {
      const k = (i - pre) / (n - pre);
      y += (0.65 - 0.57 * k) * ((Math.random() * 2 - 1) - y);
      d[i] = y * Math.pow(1 - k, 3) * 0.6;
    }
  }
  return b;
}
function glottalWave(ctx) {
  const n = 48, re = new Float32Array(n + 1), im = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) im[k] = Math.pow(k, -1.25);
  return ctx.createPeriodicWave(re, im);
}
function peakNormalise(buf, target) {
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
  const k = target / (peak || 1);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
  return buf;
}
// Seamless loop of `secs` from a longer render: equal-power crossfade of the overhang into the start.
function crossfadeLoop(src, secs, xf) {
  const sr = src.sampleRate, L = Math.floor(sr * secs), X = Math.floor(sr * xf);
  const out = new AudioBuffer({ numberOfChannels: src.numberOfChannels, length: L, sampleRate: sr });
  for (let c = 0; c < src.numberOfChannels; c++) {
    const s = src.getChannelData(c), d = out.getChannelData(c);
    for (let i = 0; i < L; i++) d[i] = s[i];
    for (let i = 0; i < X; i++) { const a = (i / X) * Math.PI / 2; d[i] = s[i] * Math.sin(a) + s[L + i] * Math.cos(a); }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────── one frightened voice
// Fear, not fun: open dark vowels, pitch that wavers and sags instead of gliding up, harsh
// "roughness" (fast amplitude flutter) plus a subharmonic for the cracked, strained edge,
// and a sobbing tremolo. No words, nothing cartoony.
const VOWELS = {
  ah: [[850, 6, 1], [1300, 8, 0.7], [2900, 10, 0.35], [3800, 12, 0.15]],   // shriek
  aw: [[640, 6, 1], [1000, 7, 0.6], [2600, 10, 0.25], [3500, 12, 0.08]],   // wail
  oo: [[420, 5, 1], [760, 6, 0.5], [2300, 9, 0.14]],                       // groan / moan
};
const CLUSTER = [0, 1, 6, 7, 13];   // semitones: minor seconds and a tritone, so the crowd's pitches grind

function voice(ctx, out, S, p) {
  const { t0, dur, f0 } = p;
  const end = t0 + dur;
  const nodes = [];

  const src = ctx.createGain();                          // glottal (+ cracked subharmonic) + breath
  const osc = ctx.createOscillator(); osc.setPeriodicWave(S.glottal); osc.connect(src); nodes.push(osc);
  const contour = (param, k) => {
    param.setValueAtTime(f0 * k * p.contour[0][1], t0);
    for (const [at, r] of p.contour.slice(1)) param.exponentialRampToValueAtTime(f0 * k * r, t0 + dur * at);
  };
  contour(osc.frequency, 1);
  let sub = null;
  if (p.sub) {
    sub = ctx.createOscillator(); sub.setPeriodicWave(S.glottal); contour(sub.frequency, 0.5);
    const sg = ctx.createGain(); sg.gain.value = p.sub; sub.connect(sg).connect(src); nodes.push(sub);
  }
  const br = ctx.createBufferSource(); br.buffer = S.noise; br.loop = true;
  const brG = ctx.createGain(); brG.gain.value = p.breath; br.connect(brG).connect(src); nodes.push(br);

  // irregular pitch drift (low-passed noise) and, for wails, a slow shaking vibrato
  const jit = ctx.createBufferSource(); jit.buffer = S.noise; jit.loop = true; nodes.push(jit);
  const jlp = ctx.createBiquadFilter(); jlp.type = 'lowpass'; jlp.frequency.value = 7; jlp.Q.value = 0.3;
  const jg = ctx.createGain(); jg.gain.value = f0 * p.jitter;
  jit.connect(jlp).connect(jg).connect(osc.frequency);
  if (p.vib) {
    const v = ctx.createOscillator(); v.frequency.value = p.vib; nodes.push(v);
    const vg = ctx.createGain(); vg.gain.value = f0 * p.vibDepth; v.connect(vg).connect(osc.frequency);
  }
  if (sub) { const h = ctx.createGain(); h.gain.value = 0.5; jg.connect(h).connect(sub.frequency); }

  const tract = ctx.createGain();
  for (const [hz, q, g] of VOWELS[p.vowel]) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hz * p.tract; bp.Q.value = q;
    const gg = ctx.createGain(); gg.gain.value = g * 4;
    src.connect(bp).connect(gg).connect(tract);
  }

  // roughness (50–140 Hz flutter) and sobbing tremolo (5–9 Hz) share one gain stage
  const mod = ctx.createGain(); mod.gain.value = 1 - p.trem * 0.5;
  const lfo = ctx.createOscillator(); lfo.frequency.value = p.rough; nodes.push(lfo);
  const lfoG = ctx.createGain(); lfoG.gain.value = p.roughDepth; lfo.connect(lfoG).connect(mod.gain);
  if (p.trem) {
    const tr = ctx.createOscillator(); tr.frequency.value = p.tremRate; nodes.push(tr);
    const tg = ctx.createGain(); tg.gain.value = p.trem * 0.5; tr.connect(tg).connect(mod.gain);
  }

  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.cutoff;
  const env = ctx.createGain(); env.gain.value = 0;
  const g = env.gain;
  g.setValueAtTime(0, t0); g.linearRampToValueAtTime(p.level, t0 + p.attack);
  g.linearRampToValueAtTime(p.level * 0.75, t0 + dur * 0.7); g.linearRampToValueAtTime(0, end);
  const pn = ctx.createStereoPanner(); pn.pan.value = p.pan;
  tract.connect(mod).connect(lp).connect(env).connect(pn).connect(out);

  for (const n of nodes) { n.start(t0, n === br || n === jit ? Math.random() * 1.5 : 0); n.stop(end + 0.05); }
}

const pitch = (base, semis) => base * Math.pow(2, (semis + rnd(-0.15, 0.15)) / 12);

/** A shriek of fear: high, strained, cracking, then sagging away. */
function shriekParams(t0, base = 880) {
  const near = Math.random() < 0.2;
  return {
    t0, dur: rnd(1.2, 2.6), f0: pitch(base, pick(CLUSTER)) * pick([1, 1, 0.75]),
    vowel: 'ah', tract: rnd(0.95, 1.12),
    contour: [[0, 0.78], [rnd(0.06, 0.14), rnd(1.04, 1.12)], [0.55, rnd(0.94, 1.02)], [1, rnd(0.55, 0.7)]],
    jitter: rnd(1.6, 2.6), sub: rnd(0.12, 0.35), breath: rnd(0.45, 0.9),
    rough: rnd(70, 140), roughDepth: rnd(0.3, 0.5), trem: rnd(0.15, 0.4), tremRate: rnd(5.5, 9),
    attack: rnd(0.03, 0.09), level: near ? rnd(0.75, 0.95) : rnd(0.3, 0.6),
    pan: rnd(-0.85, 0.85), cutoff: near ? rnd(5000, 7500) : rnd(2400, 4200),
  };
}
/** A wail: lower, longer, shaking and sliding down — despair rather than surprise. */
function wailParams(t0, base = 440) {
  return {
    t0, dur: rnd(2.2, 3.8), f0: pitch(base, pick(CLUSTER)),
    vowel: 'aw', tract: rnd(0.9, 1.05),
    contour: [[0, 0.88], [0.22, rnd(1.0, 1.06)], [0.7, rnd(0.86, 0.93)], [1, rnd(0.6, 0.72)]],
    jitter: rnd(1, 1.6), sub: rnd(0, 0.15), breath: rnd(0.35, 0.6), vib: rnd(4.5, 6.5), vibDepth: rnd(0.02, 0.04),
    rough: rnd(55, 90), roughDepth: rnd(0.15, 0.3), trem: rnd(0.3, 0.55), tremRate: rnd(4, 6.5),
    attack: rnd(0.25, 0.6), level: rnd(0.3, 0.55), pan: rnd(-0.9, 0.9), cutoff: rnd(1800, 3200),
  };
}
/** A distant groan: low, muffled, far off in the dark. */
function groanParams(t0, base = 110) {
  return {
    t0, dur: rnd(2.2, 4), f0: pitch(base, pick(CLUSTER)) * pick([0.5, 1]) * rnd(0.9, 1.4),
    vowel: 'oo', tract: rnd(0.8, 0.95),
    contour: [[0, 1], [0.4, rnd(0.97, 1.03)], [1, rnd(0.72, 0.85)]],
    jitter: 0.8, sub: rnd(0.2, 0.4), breath: rnd(0.3, 0.5),
    rough: rnd(30, 55), roughDepth: rnd(0.2, 0.35), trem: rnd(0, 0.3), tremRate: rnd(2.5, 4),
    attack: rnd(0.4, 0.9), level: rnd(0.35, 0.6), pan: rnd(-0.9, 0.9), cutoff: rnd(550, 950),
  };
}

function offline(secs, sampleRate) {
  const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * secs), sampleRate);
  const S = { noise: noiseBuffer(ctx), glottal: glottalWave(ctx) };
  const bus = ctx.createGain(); bus.connect(ctx.destination);
  return { ctx, S, bus };
}
function withReverb(ctx, bus, wetLevel, secs) {
  const rev = ctx.createConvolver(); rev.buffer = reverbIR(ctx, secs);
  const wet = ctx.createGain(); wet.gain.value = wetLevel;
  bus.connect(rev).connect(wet).connect(ctx.destination);
}

/** Render a seamless loop of a terrified crowd. */
export async function renderCrowdLoop(sampleRate, { secs = 7, shrieks = 13, wails = 9, groans = 3 } = {}) {
  const tail = 4 + 3.2; // longest voice + reverb tail, folded back onto the start
  const { ctx, S, bus } = offline(secs + tail, sampleRate);
  withReverb(ctx, bus, 0.5, 3.2);
  const root = rnd(0.94, 1.06);           // each loop sits on a slightly different root
  for (let i = 0; i < shrieks; i++) voice(ctx, bus, S, shriekParams(rnd(0, secs), 880 * root));
  for (let i = 0; i < wails; i++) voice(ctx, bus, S, wailParams(rnd(0, secs), 440 * root));
  for (let i = 0; i < groans; i++) { const p = groanParams(rnd(0, secs), 110 * root); p.level *= 0.6; voice(ctx, bus, S, p); }
  const buf = await ctx.startRendering();
  // fold everything past the loop end back to the start (seamless loop), then normalise
  const L = Math.floor(sampleRate * secs);
  const out = new AudioBuffer({ numberOfChannels: 2, length: L, sampleRate });
  for (let c = 0; c < 2; c++) {
    const src = buf.getChannelData(c), dst = out.getChannelData(c);
    for (let i = 0; i < src.length; i++) dst[i % L] += src[i];
  }
  return peakNormalise(out, 0.9);
}

/** The dread bed: a throbbing sub, a grinding low drone, an eerie high cluster and far-off groans. */
export async function renderDreadLoop(sampleRate = 22050, { secs = 9, groans = 4 } = {}) {
  const xf = 1.5;
  const { ctx, S, bus } = offline(secs + xf, sampleRate);
  withReverb(ctx, bus, 0.7, 3.5);
  const root = 55;                                          // A1, in the same pitch family as the crowd
  const start = [];
  // sub throb: two sines a semitone apart beat against each other (~3 Hz pulse)
  for (const [hz, g] of [[root, 0.42], [root * Math.pow(2, -1 / 12), 0.36]]) {
    const o = ctx.createOscillator(); o.frequency.value = hz;
    const gg = ctx.createGain(); gg.gain.value = g; o.connect(gg).connect(ctx.destination); start.push(o);
  }
  // grinding drone: root, minor second and tritone saws through a slowly breathing low-pass
  // (its upper harmonics keep it audible on phone speakers that can't reproduce the sub)
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 260; dlp.Q.value = 5;
  const dg = ctx.createGain(); dg.gain.value = 0.16; dlp.connect(dg).connect(bus);
  const flfo = ctx.createOscillator(); flfo.frequency.value = 1 / 4.5; start.push(flfo);
  const flg = ctx.createGain(); flg.gain.value = 110; flfo.connect(flg).connect(dlp.frequency);
  for (const s of [0, 1, 6]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root * Math.pow(2, s / 12) * rnd(0.997, 1.003);
    o.connect(dlp); start.push(o);
  }
  // eerie cluster high above: quiet, slowly swelling sines a semitone/tritone apart
  for (const s of [0, 1, 6]) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = root * 16 * Math.pow(2, s / 12);
    const v = ctx.createOscillator(); v.frequency.value = rnd(0.15, 0.3);
    const vg = ctx.createGain(); vg.gain.value = 3; v.connect(vg).connect(o.frequency);
    const a = ctx.createOscillator(); a.frequency.value = rnd(0.07, 0.16);
    const g = ctx.createGain(); g.gain.value = 0.012;
    const ag = ctx.createGain(); ag.gain.value = 0.011; a.connect(ag).connect(g.gain);
    o.connect(g).connect(bus); start.push(o, v, a);
  }
  // rumble
  const rn = ctx.createBufferSource(); rn.buffer = S.noise; rn.loop = true; start.push(rn);
  const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 90; rlp.Q.value = 0.8;
  const rg = ctx.createGain(); rg.gain.value = 0.9; rn.connect(rlp).connect(rg).connect(ctx.destination);
  for (const n of start) n.start(0);
  for (let i = 0; i < groans; i++) voice(ctx, bus, S, groanParams((i + rnd(0, 0.6)) * (secs / groans), 110));
  return peakNormalise(crossfadeLoop(await ctx.startRendering(), secs, xf), 0.85);
}

/** One close, blood-curdling scream (with its own room), for the fly-bys. */
export async function renderShriek(sampleRate) {
  const dur = rnd(1.9, 2.7);
  const { ctx, S, bus } = offline(dur + 2.4, sampleRate);
  withReverb(ctx, bus, 0.28, 2.4);
  const p = shriekParams(0.02, 880);
  Object.assign(p, {
    dur, f0: pitch(1100, pick([0, 1, 6])), level: 1, pan: 0, cutoff: 8500, attack: 0.03, tract: rnd(1.02, 1.12),
    contour: [[0, 0.72], [0.07, 1.1], [0.35, 1.02], [0.75, 0.94], [1, 0.58]],
    sub: rnd(0.25, 0.4), roughDepth: rnd(0.4, 0.55), trem: rnd(0.15, 0.25), tremRate: rnd(6.5, 8.5),
  });
  voice(ctx, bus, S, p);
  voice(ctx, bus, S, { ...p, f0: p.f0 * 1.006, level: 0.45, sub: 0, breath: 0.3, cutoff: 6000 });  // doubled throat
  return peakNormalise(await ctx.startRendering(), 0.9);
}

// ─────────────────────────────────────────────────────────────── the ride
function setPos(P, t, x, y, z, tc = 0.03) {
  if (P.positionX) { P.positionX.setTargetAtTime(x, t, tc); P.positionY.setTargetAtTime(y, t, tc); P.positionZ.setTargetAtTime(z, t, tc); }
  else P.setPosition(x, y, z);
}

/** Works on a live AudioContext or an OfflineAudioContext (used for previews). */
export class RideAudio {
  constructor(ctx, dest) {
    this.ctx = ctx; this.dest = dest; this.ready = false; this.sources = []; this.shrieks = [];
    this.nextShriek = 0; this.si = 0;
  }

  async init(recorded = []) {
    const ctx = this.ctx, low = lowTier();
    const rate = Math.min(ctx.sampleRate, low ? 24000 : 32000);   // nothing above 8 kHz is needed
    const synthCount = Math.max(1, 3 - recorded.length);
    const crowd = low ? { shrieks: 9, wails: 6, groans: 2 } : {};
    const [dread, shrieks, ...synth] = await Promise.all([
      renderDreadLoop(22050),
      Promise.all(Array.from({ length: low ? 2 : 3 }, () => renderShriek(rate))),
      ...Array.from({ length: synthCount }, () => renderCrowdLoop(rate, crowd)),
    ]);
    this.shrieks = shrieks;
    const loops = [...recorded.map(b => [b, THRILLS.sampleMix]), ...synth.map(b => [b, recorded.length ? 0.6 : 1])].slice(0, 4);
    // groups of riders spread around you; they orbit as the globe spins
    this.sources = loops.map(([buf, mix], i) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.rolloffFactor = 0;
      s.connect(g).connect(p).connect(this.dest);
      s.start(ctx.currentTime, (i * buf.duration) / loops.length);
      return { s, g, p, mix, offset: (i * 2 * Math.PI) / loops.length, phase: rnd(0, 10) };
    });
    // dread bed: straight to the output (no panner), low-passed until the ride gets going
    {
      const s = ctx.createBufferSource(); s.buffer = dread; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150; f.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(f).connect(g).connect(this.dest); s.start(ctx.currentTime);
      this.dread = { f, g };
    }
    // rushing air, stereo; a resonant band makes it howl
    this.wind = [-0.7, 0.7].map(pan => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuffer(ctx, 3); s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6; f.frequency.value = 300;
      const g = ctx.createGain(); g.gain.value = 0;
      const pn = ctx.createStereoPanner(); pn.pan.value = pan;
      s.connect(f).connect(g).connect(pn).connect(this.dest); s.start(ctx.currentTime, Math.random() * 2);
      return { f, g };
    });
    this.ready = true;
  }

  /** One scream that starts far off on one side, rushes past your head and away. */
  flyBy(t) {
    if (!this.shrieks.length) return;
    const ctx = this.ctx, buf = this.shrieks[this.si++ % this.shrieks.length];
    const s = ctx.createBufferSource(); s.buffer = buf;
    const r = rnd(0.9, 1.06), dur = buf.duration / r;
    s.playbackRate.setValueAtTime(r * 1.04, t); s.playbackRate.linearRampToValueAtTime(r * 0.95, t + dur * 0.55);  // doppler-ish
    const g = ctx.createGain(); g.gain.value = THRILLS.shriek;
    const P = ctx.createPanner(); P.panningModel = 'HRTF'; P.distanceModel = 'inverse'; P.refDistance = 1; P.rolloffFactor = 1.1;
    const a = rnd(0, 2 * Math.PI), miss = rnd(0.5, 0.9), y = rnd(0, 0.8);
    const x0 = Math.cos(a) * 5, z0 = Math.sin(a) * 5, x1 = -x0 - Math.sin(a) * miss * 2, z1 = -z0 + Math.cos(a) * miss * 2;
    if (P.positionX) {
      P.positionX.setValueAtTime(x0, t); P.positionX.linearRampToValueAtTime(x1, t + dur);
      P.positionY.setValueAtTime(y, t); P.positionY.linearRampToValueAtTime(y * 0.3, t + dur);
      P.positionZ.setValueAtTime(z0, t); P.positionZ.linearRampToValueAtTime(z1, t + dur);
    } else P.setPosition(Math.sign(x0) * 1.2, y, -1);
    s.connect(g).connect(P).connect(this.dest);
    s.onended = () => { s.disconnect(); P.disconnect(); };
    s.start(t);
  }

  /** speed: momentum in rad/s · angle: total spin angle · t: AudioContext time */
  drive(t, speed, angle) {
    if (!this.ready) return;
    const x = smooth(THRILLS.screamFrom, THRILLS.screamSpeed, speed);   // 0…1 how much screaming
    const fade = 0.22;                                                // ~0.7 s fade in/out
    this.sources.forEach((src, i) => {
      const swell = 0.7 + 0.3 * Math.sin(t * 0.37 + src.phase) * Math.sin(t * 0.13 + src.phase * 2);
      src.g.gain.setTargetAtTime(x * swell * src.mix * (i === 0 ? 1 : 0.85), t, fade);
      src.s.playbackRate.setTargetAtTime(0.92 + 0.06 * x, t, 0.3);
      const a = -angle * THRILLS.orbit + src.offset;
      setPos(src.p, t, Math.sin(a) * 1.5, 0.4, -Math.cos(a) * 1.5);
    });
    // dread rises before the screams do, and opens up (brighter, louder) with speed
    const d = smooth(THRILLS.windFrom, THRILLS.screamSpeed, speed);
    this.dread.g.gain.setTargetAtTime(THRILLS.dread * d * (0.85 + 0.15 * Math.sin(t * 0.5)), t, 0.35);
    this.dread.f.frequency.setTargetAtTime(150 + 2200 * d * d, t, 0.4);
    // single blood-curdling screams: one as the crowd erupts, then every few seconds
    if (x > 0.55 && t >= this.nextShriek) { this.flyBy(t + 0.02); this.nextShriek = t + rnd(...THRILLS.shriekEvery); }
    else if (x < 0.05 && this.nextShriek > t + 1.5) this.nextShriek = t + 1.5;
    const w = THREE.MathUtils.clamp((speed - THRILLS.windFrom) / 14, 0, 0.3);
    this.wind.forEach(({ f, g }, i) => { g.gain.setTargetAtTime(w * (0.85 + 0.15 * Math.sin(t * 1.3 + i * 2)), t, fade); f.frequency.setTargetAtTime(200 + speed * 45 + i * 70 + 60 * Math.sin(t * 0.9 + i), t, 0.2); });
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
    if (speed > THRILLS.windFrom && this.ctx.state === 'suspended') this.ctx.resume();
    const x = this.ride.drive(this.ctx.currentTime, speed, this.spin.angle);
    if (x > 0.5 && !this.screamed) { this.screamed = true; this.onFirstScream?.(); }
    // let the audio engine sleep when the ride is over (saves battery)
    if (speed < THRILLS.windFrom * 0.8) { if (!this.silentSince) this.silentSince = now; else if (now - this.silentSince > 3000 && this.ctx.state === 'running') this.ctx.suspend(); }
    else this.silentSince = 0;
  }
}
