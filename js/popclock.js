// World population, live: a quiet strip at the bottom of the screen with an estimate that ticks up in real time,
// plus today's births and deaths since local midnight. Shown only while you look at the whole globe: it fades out
// as you zoom in, and while a card, game, comparison or data lens has the screen.
//
// Estimate: UN World Population Prospects 2024 (medium variant): 8,231,613,070 people on 1 July 2025, with about
// 132 million births and 62.5 million deaths a year (≈ 4.2 and 2.0 a second).

const BASE = 8_231_613_070, EPOCH = Date.UTC(2025, 6, 1);
const YEAR = 365.2425 * 864e5;
const BIRTHS = 132.0e6 / YEAR, DEATHS = 62.5e6 / YEAR;          // per millisecond
const SHOW_AT = 0.84, HIDE_AT = 0.8;                              // camera distance / fit distance, with hysteresis
const int = new Intl.NumberFormat('en-US');
const BUSY = ['quiz-on', 'comparing', 'picking', 'lens-on', 'card-open', 'menu-open'];

/** People alive at time t (ms since the epoch), and births/deaths since local midnight. */
export function worldPopulation(t = Date.now()) {
  const midnight = new Date(t); midnight.setHours(0, 0, 0, 0);
  const today = t - midnight.getTime();
  return { now: Math.round(BASE + (t - EPOCH) * (BIRTHS - DEATHS)), born: Math.round(today * BIRTHS), died: Math.round(today * DEATHS) };
}

export function createPopClock(el, globe) {
  el.innerHTML = `
    <span class="pc-live" aria-hidden="true"></span>
    <span class="pc-k">World population</span>
    <b class="pc-n"></b>
    <span class="pc-day"><span class="pc-b"></span> born today <span class="pc-sep" aria-hidden="true">·</span> <span class="pc-d"></span> died</span>
    <span class="pc-bar" aria-hidden="true"><i class="pc-bb"></i><i class="pc-bd"></i></span>`;
  const n = el.querySelector('.pc-n'), b = el.querySelector('.pc-b'), d = el.querySelector('.pc-d');
  const bar = el.querySelector('.pc-bb');
  bar.style.flexGrow = 1; el.querySelector('.pc-bd').style.flexGrow = DEATHS / BIRTHS; // shares of the bar, not rates
  const hint = document.getElementById('hint');
  let shown = false, near = false, timer = 0;

  function paint() {
    const p = worldPopulation();
    n.textContent = int.format(p.now);
    b.textContent = int.format(p.born);
    d.textContent = int.format(p.died);
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
