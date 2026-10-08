// First visit only: a finger swipes across the globe a few times to show that it can be grabbed and spun.
// It steps aside the moment the visitor touches, scrolls or presses a key, and is never shown again.
const KEY = 'ei-intro';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const HAND = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 23V9.6a3 3 0 0 1 6 0v11.2a3 3 0 0 1 5.9.6 3 3 0 0 1 5.6 1.4 3 3 0 0 1 5.5 1.7v6.2c0 4.6-1.7 8.1-4.7 11.3H23.5l-7.6-9.6a3.1 3.1 0 0 1 .3-4.2 3 3 0 0 1 3.8-.2z"/></svg>';

export function showIntro(stage) {
  let seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch { /* storage unavailable: show it */ }
  if (seen) return;
  const el = document.createElement('div');
  el.className = 'intro-hand' + (reduced.matches ? ' still' : '');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<span class="intro-trail"></span><span class="intro-finger">${HAND}</span>`;
  stage.append(el);
  const done = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
    el.classList.add('out');
    setTimeout(() => el.remove(), 500);
    for (const t of ['pointerdown', 'wheel', 'keydown']) removeEventListener(t, done, true);
  };
  for (const t of ['pointerdown', 'wheel', 'keydown']) addEventListener(t, done, { capture: true, passive: true });
  setTimeout(done, reduced.matches ? 4500 : 7200); // three swipes, then it bows out on its own
}
