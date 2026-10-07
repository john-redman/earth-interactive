// Soft interface sounds: muted wooden knocks and low marimba/bell tones (synthesised), plus short recorded
// effects for the airy parts: a swipe when a panel opens (played backwards when it closes), a plop when the pin
// drops and a click when compare pieces snap out (backwards when they snap back). Quiet, and silenced by the
// same mute button as the ride audio.
const VOLUME = 0.22;
// the pin falls for 0.16 s (css/style.css @keyframes pinDrop); the plop's peak is 22 ms into the file
const PIN_LANDS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.02 : 0.16, PLOP_PEAK = 0.022;
const FILES = { swipe: 'sounds/swipe.mp3', plop: 'sounds/pin-drop.mp3', click: 'sounds/click.mp3' };

let ctx = null, out = null, noise = null;
const buf = {}; // decoded samples, plus reversed copies (swipeRev, clickRev)

function reversed(b) {
  const r = ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
  for (let c = 0; c < b.numberOfChannels; c++) r.getChannelData(c).set(Float32Array.from(b.getChannelData(c)).reverse());
  return r;
}
async function loadSamples() {
  await Promise.all(Object.entries(FILES).map(async ([name, url]) => {
    try {
      const res = await fetch(new URL('../' + url, import.meta.url));
      buf[name] = await ctx.decodeAudioData(await res.arrayBuffer());
    } catch { /* missing file: that sound just stays synthesised-only */ }
  }));
  if (buf.swipe) buf.swipeRev = reversed(buf.swipe);
  if (buf.click) buf.clickRev = reversed(buf.click);
}

/** Play a decoded sample (no-op until it has loaded). */
function sample(t, name, gain = 1, rate = 1) {
  const b = buf[name]; if (!b) return;
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(g).connect(out); s.start(t);
}

function setup() {
  if (ctx) return ctx.state === 'closed' ? null : ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  out = ctx.createGain(); out.gain.value = VOLUME;
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200; // nothing sharp or bright
  out.connect(warm).connect(ctx.destination);
  loadSamples();
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** A pitched tone with a soft attack and exponential decay (marimba/bell when partials are added). */
function tone(t, freq, { dur = 0.35, gain = 0.5, type = 'sine', glide = 1, attack = 0.006 } = {}) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(freq, t); if (glide !== 1) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
}

/** Filtered noise sweeping between two frequencies: a breath of air, a sail flap, cloth. */
function whoosh(t, { from = 400, to = 1600, dur = 0.22, gain = 0.35, q = 0.8 } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = 0.7 + Math.random() * 0.3;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5, dur + 0.05);
}

const SOUNDS = {
  // picking a country: a muted wooden knock as the pin drops in with a plop
  // the pin landing: just the plop, timed to the moment the pin hits the globe (see .map-pin.drop in the CSS)
  tap(t) { sample(t + PIN_LANDS - PLOP_PEAK, 'plop', 1); },
  // opening a panel: a swipe and two low marimba notes
  open(t) { sample(t, 'swipe', 1.1); tone(t + 0.05, 220, { dur: 0.42, gain: 0.32 }); tone(t + 0.05, 880, { dur: 0.18, gain: 0.05 }); tone(t + 0.12, 330, { dur: 0.5, gain: 0.26 }); tone(t + 0.12, 1320, { dur: 0.2, gain: 0.04 }); },
  // closing: the swipe in reverse, one soft knock
  close(t) { sample(t, 'swipeRev', 1); tone(t + 0.1, 160, { dur: 0.2, gain: 0.35, glide: 0.7 }); },
  // starting a comparison: a warm bell, fifth above
  confirm(t) { tone(t, 262, { dur: 0.7, gain: 0.28 }); tone(t, 524, { dur: 0.35, gain: 0.07 }); tone(t + 0.09, 392, { dur: 0.8, gain: 0.24 }); tone(t + 0.09, 1176, { dur: 0.3, gain: 0.03 }); },
  // compare pieces snap out of the globe / settle back into their sockets
  snapOut(t) { sample(t, 'click', 1); },
  snapIn(t) { sample(t, 'clickRev', 1); },
  // any other button: a quiet tick
  tick(t) { tone(t, 420, { dur: 0.07, gain: 0.22, type: 'triangle', glide: 0.8 }); whoosh(t, { from: 1800, to: 3000, dur: 0.05, gain: 0.05, q: 2 }); },
};

/**
 * createSfx({ muted }) → play(name)
 * Also wires every button click in the page to a fitting sound (specific actions by selector, `tick` otherwise).
 */
export function createSfx({ muted }) {
  const last = {}; let lastAny = 0;
  function play(name) {
    if (muted() || !SOUNDS[name]) return;
    const c = setup(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    // never stack the same sound twice on one click, and let a specific sound replace the generic tick
    const now = performance.now();
    if (now - (last[name] || 0) < 40 || (name === 'tick' && now - lastAny < 40)) return;
    last[name] = lastAny = now;
    SOUNDS[name](c.currentTime + 0.005);
  }
  // create the audio context and fetch the samples on the first touch, so the first sound isn't late
  addEventListener('pointerdown', () => { if (!muted()) setup(); }, { once: true, capture: true });
  const MAP = [
    ['[data-act="info"], .pill-main, .cmp-grab, .pop-grab, [data-act="stats"]', 'open'],
    ['.pop-x:not(.pop-link), .pill-x, [data-act="done"], .qz-x', 'close'],
    ['[data-act="compare"]', 'confirm'],
    ['#sound-toggle', null],                // the mute button speaks for itself
  ];
  document.addEventListener('click', e => {
    const el = e.target.closest?.('button, a.btn, .chip');
    if (!el) return;
    // toggles (card handle, stats button) that are currently open are being closed
    for (const [sel, name] of MAP) if (el.matches(sel)) { if (name) play(name === 'open' && el.getAttribute('aria-expanded') === 'true' ? 'close' : name); return; }
    play('tick');
  }, { capture: true });
  return { play };
}
