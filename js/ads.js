// Ad slots: side banners on wide screens, one bottom banner on phones and tablets.
// Swap `html` for your ad network's snippet (or an <a><img></a>) when you have one.
//
// A slot with no ad takes no room on the public site (no empty "Advertisement" boxes for visitors). The grey
// placeholders still show on localhost and with ?ads=preview, so the layout can be checked before a network is live.
export const ADS = {
  enabled: true,
  minViewportWidth: 1100,           // side banners need this much width; narrower screens get the bottom banner
  slots: {
    left:   { html: null },
    right:  { html: null },
    bottom: { html: null },
  },
  // First size that fits wins (IAB standard sizes).
  sizes: [[160, 600], [120, 240]],
  bottomSizes: [[728, 90], [468, 60], [320, 50]],
};

const PREVIEW = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || new URLSearchParams(location.search).get('ads') === 'preview';
/** A slot is worth its space when it has an ad (or we're previewing the layout). */
const filled = side => !!ADS.slots[side].html || PREVIEW;

export function mountAds(globe) {
  const els = { left: document.querySelector('.ad-slot.left'), right: document.querySelector('.ad-slot.right'), bottom: document.querySelector('.ad-banner') };
  const placeholder = (w, h) => `<div class="ad-ph"><span>Advertisement</span><small>${w} × ${h}</small></div>`;
  let size = null, bottom = null;
  const paint = () => {
    for (const side of ['left', 'right']) {
      const el = els[side], [w, h] = size;
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.innerHTML = ADS.slots[side].html || (PREVIEW ? placeholder(w, h) : '');
      el.style.visibility = filled(side) ? '' : 'hidden'; // keeps the layout symmetric when only one side has an ad
    }
  };
  const paintBottom = () => {
    const [w, h] = bottom;
    els.bottom.style.width = w + 'px'; els.bottom.style.height = h + 'px';
    els.bottom.innerHTML = ADS.slots.bottom.html || placeholder(w, h);
  };
  const apply = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    // slot is centred 40px below middle; keep clear of the top-left switch (~120px) and the footer (~50px)
    const fit = ADS.sizes.find(([, h]) => vh / 2 + 40 - h / 2 >= 136 && vh / 2 + 40 + h / 2 <= vh - 50) || null;
    const on = ADS.enabled && !!fit && vw >= ADS.minViewportWidth && (filled('left') || filled('right'));
    document.body.classList.toggle('ads-on', on);
    if (on && (!size || size[0] !== fit[0] || size[1] !== fit[1])) { size = fit; paint(); }
    const inset = on ? size[0] + 40 : 0;
    window.__adInset = inset;
    globe.insetX = inset;
    // narrow screens: one banner under the stage (the stage shrinks, so no control ever sits on top of it)
    const bfit = !on && ADS.enabled && vh >= 480 && filled('bottom') ? ADS.bottomSizes.find(([w]) => w <= vw - 16) || null : null;
    const bOn = !!bfit;
    els.bottom.hidden = !bOn;
    if (bOn && (!bottom || bottom[0] !== bfit[0] || bottom[1] !== bfit[1])) { bottom = bfit; paintBottom(); }
    document.documentElement.style.setProperty('--ad-h', bOn ? `calc(${bottom[1] + 12}px + env(safe-area-inset-bottom, 0px))` : '0px');
  };
  apply();
  window.addEventListener('resize', () => { apply(); globe.resize(); });
  /** Programmatic API: EarthInteractive.ads.set('left' | 'right' | 'bottom', '<a …><img …></a>') */
  return {
    set(side, html) { ADS.slots[side].html = html; size = bottom = null; apply(); globe.resize(); },
    enable(on) { ADS.enabled = on; apply(); globe.resize(); },
  };
}
