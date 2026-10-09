// Background music ("Celestial Drift"), on by default for a first visit. The choice is remembered; because
// browsers only start audio after a tap or key press, "on" starts with the first one on the page.
const SRC = new URL('../sounds/celestial-drift.mp3', import.meta.url).href;
const VOLUME = 0.32;
const KEY = 'ei-music';

const store = {
  get() { try { const v = localStorage.getItem(KEY); return v === null ? true : v === '1'; } catch { return true; } }, // nothing stored yet: on
  set(on) { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* storage unavailable */ } },
};

/** autostart: false keeps a stored "on" from starting by itself (an embedded globe must stay quiet until asked). */
export function createMusic(button, { autostart = true } = {}) {
  let audio = null, on = store.get(), fadeTimer = null;

  function element() {
    if (!audio) { audio = new Audio(SRC); audio.loop = true; audio.preload = 'auto'; audio.volume = 0; }
    return audio;
  }
  // gentle fades where the browser allows volume control (iOS ignores it and just starts/stops)
  function fadeTo(target, ms, then) {
    clearInterval(fadeTimer);
    const a = element(), from = a.volume, t0 = performance.now();
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = from + (target - from) * k;
      if (k >= 1) { clearInterval(fadeTimer); then?.(); }
    }, 40);
  }
  function play() { const a = element(); a.play().then(() => fadeTo(VOLUME, 1800)).catch(() => {}); }
  function stop() { if (audio) fadeTo(0, 600, () => audio.pause()); }

  function paint() {
    button.setAttribute('aria-pressed', String(on));
    button.title = on ? 'Music on' : 'Music off';
    button.classList.toggle('on', on);
  }
  button.addEventListener('click', () => { on = !on; store.set(on); paint(); if (on) play(); else stop(); });
  paint();
  // "on": start with the first tap or key press anywhere (autoplay rules)
  if (on && autostart) {
    const start = () => { removeEventListener('pointerdown', start, true); removeEventListener('keydown', start, true); if (on) play(); };
    addEventListener('pointerdown', start, true); addEventListener('keydown', start, true);
  }
  // pause in background tabs, pick up again on return
  document.addEventListener('visibilitychange', () => {
    if (!audio || !on) return;
    if (document.hidden) audio.pause(); else play();
  });
  return { get on() { return on; } };
}
