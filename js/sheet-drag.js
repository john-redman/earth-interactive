// Finger-following drag for bottom sheets: the panel tracks the touch 1:1 and, on release, settles
// to the nearest state, or to the one the flick was heading for. Content scrolls normally once a sheet
// is fully open; dragging down from the top of the content pulls the sheet instead.

/**
 * attachSheetDrag(el, opts)
 *   enabled()        → boolean, whether dragging applies right now (e.g. only on the phone sheet)
 *   states()         → { peek: px | null, full: px } heights the sheet can rest at (peek null = no peek state)
 *   current()        → 'peek' | 'full'
 *   settle(state)    → apply 'peek' | 'full' (class change; CSS animates)
 *   dismiss()        → close the sheet
 */
export function attachSheetDrag(el, { enabled, states, current, settle, dismiss }) {
  let d = null;
  const now = () => performance.now();

  el.addEventListener('touchstart', e => {
    if (!enabled() || e.touches.length !== 1) return;
    const t = e.touches[0];
    d = { y0: t.clientY, y: t.clientY, h0: el.getBoundingClientRect().height, state: current(), scroll: el.scrollTop,
      samples: [{ y: t.clientY, t: now() }], active: false, moved: false };
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    if (!d) return;
    const y = e.touches[0].clientY, dy = y - d.y0;
    if (!d.active) {
      if (Math.abs(dy) < 6) return;
      // a fully open sheet with scrolled content: let the content scroll instead
      if (d.state === 'full' && (dy < 0 || d.scroll > 0)) { d = null; return; }
      d.active = true;
      el.classList.add('dragging');
    }
    e.preventDefault();
    d.y = y; d.moved = true;
    d.samples.push({ y, t: now() }); while (d.samples.length > 6) d.samples.shift();
    const { peek, full } = states(), min = peek ?? full;
    const h = d.h0 - dy;
    if (h >= min) { el.style.maxHeight = Math.min(full + 40, h) + 'px'; el.style.translate = ''; } // follow the finger (a little give past full)
    else { el.style.maxHeight = min + 'px'; el.style.translate = `0 ${min - h}px`; }                   // below the lowest state: slide away
  }, { passive: false });

  const end = () => {
    if (!d) return;
    const drag = d; d = null;
    if (!drag.active) return;
    el.classList.remove('dragging');
    const s = drag.samples, a = s[0], b = s[s.length - 1];
    const v = (b.y - a.y) / Math.max(1, b.t - a.t);          // px/ms, + = downwards
    const { peek, full } = states(), min = peek ?? full;
    const h = drag.h0 - (drag.y - drag.y0);
    let target;
    if (h < min - 70 || (v > 0.5 && (drag.state === 'peek' || peek == null) && h < min + 10)) target = 'dismiss';
    else if (v < -0.35) target = 'full';
    else if (v > 0.35) target = peek != null ? 'peek' : 'dismiss';
    else if (peek == null) target = h < full * 0.6 ? 'dismiss' : 'full';
    else target = h > (peek + full) / 2 ? 'full' : h < peek - 40 ? 'dismiss' : 'peek';
    el.style.maxHeight = ''; el.style.translate = '';
    if (target === 'dismiss') dismiss(); else settle(target);
    quietUntil = now() + 350; // a drag that ends on a button must not also press it
  };
  let quietUntil = 0;
  el.addEventListener('click', ev => { if (now() < quietUntil) { ev.stopPropagation(); ev.preventDefault(); } }, { capture: true });
  el.addEventListener('touchend', end, { passive: true });
  el.addEventListener('touchcancel', end, { passive: true });
}
