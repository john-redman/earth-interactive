// Easter egg: tap France five times in a row and a big red 3D button rises out of it, with the owner's sound. Press
// it (the cap sinks) and the Nuke France browser game opens in a new tab. Only in normal browsing.
const GAME = 'https://de-jonkheer.itch.io/nuke-france';
const TAPS = 5, WITHIN = 6000;          // five taps on France within this many ms (unhurried taps still count)
const SHOW_MS = 20000;                  // the button sinks away by itself after this long
const W = 92, H = 70;                   // button box (CSS px); the base sits on France's anchor

export function createEgg(stage, { track, muted }) {
  const el = document.createElement('a');
  el.className = 'egg-btn'; el.hidden = true;
  el.href = GAME; el.target = '_blank'; el.rel = 'noopener';
  el.setAttribute('aria-label', 'A big red button on France. Press it to play Nuke France (opens a new tab)');
  el.innerHTML = '<span class="eb-base"></span><span class="eb-cap"><span class="eb-wall"></span><span class="eb-top"></span></span>';
  stage.append(el);
  const sound = new Audio('sounds/egg.mp3'); sound.preload = 'none';
  let taps = [], hideT = 0, active = false;

  const hide = () => { clearTimeout(hideT); active = false; el.hidden = true; el.classList.remove('down', 'in'); };
  const press = () => el.classList.add('down');
  const ding = () => { if (!muted()) { try { sound.currentTime = 0; sound.play().catch(() => {}); } catch { /* no audio */ } } };
  el.addEventListener('pointerdown', e => { e.stopPropagation(); press(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') press(); });
  el.addEventListener('pointerleave', () => el.classList.remove('down'));
  // the link itself opens the game (a real click, so no pop-up blocker); the button pops back up a moment later
  el.addEventListener('click', () => { track('egg/nuke-france/play'); setTimeout(() => { el.classList.remove('down'); hide(); }, 350); });

  return {
    get active() { return active; },
    /** A country (or the sea: null) was tapped while browsing. Returns true when the button appears. */
    tapped(o) {
      if (o?.key !== 'FRA') { taps = []; if (active) hide(); return false; }
      const now = performance.now();
      taps = taps.filter(t => now - t < WITHIN); taps.push(now);
      if (taps.length < TAPS || active) return false;
      taps = []; active = true;
      el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      ding(); // the fifth tap is a user gesture, so the sound may play
      clearTimeout(hideT); hideT = setTimeout(hide, SHOW_MS);
      track('egg/nuke-france');
      return true;
    },
    /** Every frame while active: France's anchor on screen (CSS px) and whether it faces the camera. */
    place(x, y, visible) {
      if (!active) return;
      el.style.transform = `translate(${(x - W / 2).toFixed(1)}px, ${(y - H + 14).toFixed(1)}px)`;
      el.classList.toggle('away', !visible);
    },
    hide,
  };
}
