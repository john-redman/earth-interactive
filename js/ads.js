// Side banner slots. Swap `html` for your ad network's snippet (or an <a><img></a>) when you have one.
export const ADS = {
  enabled: true,
  minViewportWidth: 1100,           // banners hide below this width so the globe keeps the stage on phones/tablets
  slots: {
    left:  { html: null },
    right: { html: null },
  },
  // First size that fits the viewport height wins (IAB standard sizes).
  sizes: [[160, 600], [120, 240]],
};

export function mountAds(globe) {
  const els = {};
  for (const side of ['left', 'right']) {
    els[side] = document.querySelector(`.ad-slot.${side}`);
  }
  let size = null;
  const paint = () => {
    for (const side of ['left', 'right']) {
      const el = els[side], [w, h] = size;
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.innerHTML = ADS.slots[side].html || `<div class="ad-ph"><span>Advertisement</span><small>${w} × ${h}</small></div>`;
    }
  };
  const apply = () => {
    const vh = window.innerHeight;
    // slot is centred 40px below middle; keep clear of the top-left switch (~120px) and the footer (~50px)
    const fit = ADS.sizes.find(([, h]) => vh / 2 + 40 - h / 2 >= 136 && vh / 2 + 40 + h / 2 <= vh - 50) || null;
    const on = ADS.enabled && !!fit && window.innerWidth >= ADS.minViewportWidth;
    document.body.classList.toggle('ads-on', on);
    if (on && (!size || size[0] !== fit[0] || size[1] !== fit[1])) { size = fit; paint(); }
    const inset = on ? size[0] + 40 : 0;
    window.__adInset = inset;
    globe.insetX = inset;
  };
  apply();
  window.addEventListener('resize', () => { apply(); globe.resize(); });
  /** Programmatic API: EarthInteractive.ads.set('left', '<a …><img …></a>') */
  return {
    set(side, html) { ADS.slots[side].html = html; if (size) paint(); },
    enable(on) { ADS.enabled = on; apply(); globe.resize(); },
  };
}
