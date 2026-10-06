// Soft interface sounds: muted wooden knocks, airy sail-flap whooshes and low marimba/bell tones, in the
// spirit of a seafaring game menu. All synthesised on the fly (tiny, no files), quiet, and silenced by the
// same mute button as the ride audio.
const VOLUME = 0.22;

let ctx = null, out = null, noise = null;

function setup() {
  if (ctx) return ctx.state === 'closed' ? null : ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  out = ctx.createGain(); out.gain.value = VOLUME;
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200; // nothing sharp or bright
  out.connect(warm).connect(ctx.destination);
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
  // picking a country: a muted wooden knock with a little air
  tap(t) { tone(t, 190, { dur: 0.16, gain: 0.55, glide: 0.62 }); tone(t, 520, { dur: 0.05, gain: 0.12, type: 'triangle' }); whoosh(t, { from: 900, to: 2400, dur: 0.09, gain: 0.08, q: 1.2 }); },
  // opening a panel: a rising sail-flap and two low marimba notes
  open(t) { whoosh(t, { from: 280, to: 1500, dur: 0.24, gain: 0.3 }); tone(t + 0.05, 220, { dur: 0.42, gain: 0.32 }); tone(t + 0.05, 880, { dur: 0.18, gain: 0.05 }); tone(t + 0.12, 330, { dur: 0.5, gain: 0.26 }); tone(t + 0.12, 1320, { dur: 0.2, gain: 0.04 }); },
  // closing: the breath falls away, one soft knock
  close(t) { whoosh(t, { from: 1400, to: 260, dur: 0.22, gain: 0.26 }); tone(t + 0.06, 160, { dur: 0.2, gain: 0.35, glide: 0.7 }); },
  // starting a comparison: a warm bell, fifth above
  confirm(t) { tone(t, 262, { dur: 0.7, gain: 0.28 }); tone(t, 524, { dur: 0.35, gain: 0.07 }); tone(t + 0.09, 392, { dur: 0.8, gain: 0.24 }); tone(t + 0.09, 1176, { dur: 0.3, gain: 0.03 }); whoosh(t, { from: 500, to: 1800, dur: 0.3, gain: 0.12 }); },
  // any other button: a quiet tick
  tick(t) { tone(t, 420, { dur: 0.07, gain: 0.22, type: 'triangle', glide: 0.8 }); whoosh(t, { from: 1800, to: 3000, dur: 0.05, gain: 0.05, q: 2 }); },
};

/**
 * createSfx({ muted }) → play(name)
 * Also wires every button click in the page to a fitting sound (specific actions by selector, `tick` otherwise).
 */
export function createSfx({ muted }) {
  let last = 0;
  function play(name) {
    if (muted() || !SOUNDS[name]) return;
    const c = setup(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    const now = performance.now(); if (now - last < 40) return; // never stack two sounds on one click
    last = now;
    SOUNDS[name](c.currentTime + 0.005);
  }
  const MAP = [
    ['[data-act="info"], .pill-main, .cmp-grab, .pop-grab, [data-act="stats"]', 'open'],
    ['.pop-x:not(.pop-link), .pill-x, [data-act="done"], .qz-x', 'close'],
    ['[data-act="compare"]', 'confirm'],
    ['#sound-toggle', null],                // the mute button speaks for itself
  ];
  document.addEventListener('click', e => {
    const el = e.target.closest?.('button, a.btn, .chip');
    if (!el) return;
    for (const [sel, name] of MAP) if (el.matches(sel)) { if (name) play(name); return; }
    play('tick');
  }, { capture: true });
  return { play };
}
