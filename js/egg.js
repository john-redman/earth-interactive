// Easter egg: tap France five times in a row and it arms a launch button: France blinks red to a two-tone siren
// and a chip offers the Nuke France browser game (opens in a new tab). Only in normal browsing, never in a game.
const GAME = 'https://de-jonkheer.itch.io/nuke-france';
const TAPS = 5, WITHIN = 6000;          // five taps on France within this many ms (unhurried taps still count)
const SHOW_MS = 15000;                  // the chip leaves by itself after this long

export function createEgg(el, { layer, sfx, track, announce }) {
  el.innerHTML = `
    <a class="cotd-main" href="${GAME}" target="_blank" rel="noopener">
      <span class="cotd-k">Secret</span><span class="egg-say">France has a launch button.</span><b>Play Nuke France</b><span class="cotd-go" aria-hidden="true">↗</span>
    </a>
    <button type="button" class="cotd-x" aria-label="Hide the secret">✕</button>`;
  let taps = [], hideT = 0, flashT = [];
  const hide = () => { clearTimeout(hideT); el.classList.remove('in'); el.hidden = true; document.body.classList.remove('egg-on'); };
  el.querySelector('.cotd-x').onclick = hide;
  el.querySelector('a').onclick = () => { track('egg/nuke-france/play'); hide(); };

  // France blinks red three times with the siren (unless a game takes over meanwhile: its marks win)
  function flash() {
    flashT.forEach(clearTimeout);
    const set = kind => { if (!document.body.classList.contains('quiz-on')) layer.setMark('FRA', kind); };
    flashT = [0, 250, 500, 750, 1000, 1250, 1500].map((ms, i) => setTimeout(() => set(i % 2 || i === 6 ? null : 'bad'), ms));
  }

  return {
    /** A country (or the sea: null) was tapped while browsing. */
    tapped(o) {
      if (o?.key !== 'FRA') { taps = []; return; }
      const now = performance.now();
      taps = taps.filter(t => now - t < WITHIN); taps.push(now);
      if (taps.length < TAPS) return;
      taps = [];
      flash(); sfx.play('siren');
      el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      document.body.classList.add('egg-on');
      clearTimeout(hideT); hideT = setTimeout(hide, SHOW_MS);
      announce('Secret found: France has a launch button. The Nuke France game link is at the top of the screen.');
      track('egg/nuke-france');
    },
    hide,
  };
}
