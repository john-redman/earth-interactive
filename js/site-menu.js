// Phones: the site links (About, How to play, …) fold into a small menu that opens from the EarthInteractive brand
// (a down caret marks it). Desktop keeps them as a plain row under the brand, and the brand stays plain text.
const PHONE = matchMedia('(max-width: 720px)');

export function mountSiteMenu(btn, nav) {
  const isOpen = () => nav.classList.contains('open');
  function set(open, { focus = false } = {}) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open && focus) nav.querySelector('a:not([hidden])')?.focus({ preventScroll: true });
  }
  function mode() {
    const phone = PHONE.matches;
    set(false);
    // on desktop the brand is just the name: out of the tab order and not announced as a menu button
    btn.tabIndex = phone ? 0 : -1;
    if (phone) btn.setAttribute('aria-expanded', 'false'); else btn.removeAttribute('aria-expanded');
    btn.setAttribute('aria-haspopup', phone ? 'true' : 'false');
  }
  btn.addEventListener('click', e => { if (!PHONE.matches) return; set(!isOpen(), { focus: e.detail === 0 }); }); // keyboard: focus the first link
  document.addEventListener('pointerdown', e => { if (isOpen() && !nav.contains(e.target) && !btn.contains(e.target)) set(false); });
  // Escape closes the menu first (and stops there, so it doesn't also close a card or a comparison)
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus({ preventScroll: true }); e.stopPropagation(); } }, true);
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  PHONE.addEventListener('change', mode);
  mode();
  return { close: () => set(false), get open() { return isOpen(); } };
}
