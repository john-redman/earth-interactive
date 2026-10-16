// World population, live: a quiet strip at the bottom of the screen with an estimate that ticks up in real time,
// plus today's births since local midnight (no death counter: the owner took it out). Shown only while you look at the whole globe: it fades out
// as you zoom in, and while a card, game, comparison or data lens has the screen.
//
// Estimate: UN World Population Prospects 2024 (medium variant): 8,231,613,070 people on 1 July 2025, with about
// 132 million births and 62.5 million deaths a year (≈ 4.2 and 2.0 a second); the deaths only slow the total's growth.

const BASE = 8_231_613_070, EPOCH = Date.UTC(2025, 6, 1);
const YEAR = 365.2425 * 864e5;
const BIRTHS = 132.0e6 / YEAR, DEATHS = 62.5e6 / YEAR;          // per millisecond
const SHOW_AT = 0.84, HIDE_AT = 0.8;                              // camera distance / fit distance, with hysteresis
const int = new Intl.NumberFormat('en-US');
const BUSY = ['quiz-on', 'comparing', 'picking', 'measuring', 'lens-on', 'card-open', 'menu-open'];

/** People alive at time t (ms since the epoch), and births since local midnight. */
export function worldPopulation(t = Date.now()) {
  const midnight = new Date(t); midnight.setHours(0, 0, 0, 0);
  return { now: Math.round(BASE + (t - EPOCH) * (BIRTHS - DEATHS)), born: Math.round((t - midnight.getTime()) * BIRTHS) };
}

export function createPopClock(el, globe) {
  el.innerHTML = `
    <span class="pc-k"><span class="pc-live" aria-hidden="true"></span>World population</span>
    <b class="pc-n"></b>
    <span class="pc-day"><span class="pc-b"></span> born today</span>`;
  const n = el.querySelector('.pc-n'), b = el.querySelector('.pc-b');
  const hint = document.getElementById('hint');
  let shown = false, near = false, timer = 0;

  function paint() {
    const p = worldPopulation();
    n.textContent = int.format(p.now);
    b.textContent = '+' + int.format(p.born);
  }
  function set(on) {
    if (on === shown) return;
    shown = on;
    el.classList.toggle('on', on);
    el.setAttribute('aria-hidden', String(!on));
    clearInterval(timer);
    if (on) { paint(); timer = setInterval(paint, 250); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) set(false); });

  return {
    /** Every frame: fade by zoom (with a little hysteresis) and step aside for the rest of the UI. */
    tick() {
      const k = globe.camera.position.length() / globe.fitDistance;
      near = near ? k < SHOW_AT : k < HIDE_AT;
      const body = document.body.classList;
      set(!document.hidden && !near && hint.classList.contains('gone') && !BUSY.some(c => body.contains(c)));
    },
    get shown() { return shown; },
  };
}
