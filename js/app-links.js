// "Get the app" links for the website. Renders nothing until a store link is filled in below,
// and nothing inside the native app itself.
//
// Badges: these are plain text + icon links on purpose. If you switch to the official artwork,
// follow the rules: Apple's "Download on the App Store" badge must be the unmodified artwork from
// https://developer.apple.com/app-store/marketing/guidelines/ (no recolouring, minimum size,
// clear space), and Google's "Get it on Google Play" badge must come from
// https://partnermarketinghub.withgoogle.com/brands/google-play/ (unaltered, with the legal line
// "Google Play and the Google Play logo are trademarks of Google LLC." somewhere on the page).
// Using the store names in plain text, as below, is fine.

export const STORE_LINKS = {
  ios: '',     // e.g. https://apps.apple.com/app/id1234567890
  android: '', // e.g. https://play.google.com/store/apps/details?id=app.earthinteractive
};

const ICONS = {
  ios: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-4zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.4z"/></svg>',
  android: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 2.8v18.4c0 .5.5.8 1 .6L20.4 13c.5-.3.5-1 0-1.3L5 2.2c-.5-.2-1 .1-1 .6z"/></svg>',
};
const LABELS = { ios: ['Download on the', 'App Store'], android: ['Get it on', 'Google Play'] };

/** Loads css/app-links.css once (next to this module), so index.html needs no stylesheet change. */
function ensureStyles() {
  if (document.querySelector('link[data-app-links-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../css/app-links.css', import.meta.url).href;
  link.dataset.appLinksCss = '';
  document.head.append(link);
}

const inApp = () => !!window.Capacitor?.isNativePlatform?.() || window.EI_PLATFORM === 'native';

/** Which store to list first: the visitor's own platform, when we can tell. */
function order() {
  const ua = navigator.userAgent || '';
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return apple ? ['ios', 'android'] : ['android', 'ios'];
}

/**
 * mountStoreBadges(container, { only }) → boolean (true if anything was rendered)
 *   container  element to fill, e.g. <div class="app-links" hidden></div>
 *   only       'auto' (default): show both, own platform first; 'mine': only the visitor's platform
 *              when it is iOS or Android (falls back to both on desktop).
 */
export function mountStoreBadges(container, { only = 'auto' } = {}) {
  if (!container) return false;
  container.replaceChildren();
  let keys = order().filter(k => STORE_LINKS[k]);
  if (only === 'mine') {
    const ua = navigator.userAgent || '';
    const mine = /Android/.test(ua) ? 'android' : /iPhone|iPad|iPod/.test(ua) ? 'ios' : null;
    if (mine && STORE_LINKS[mine]) keys = [mine];
  }
  if (inApp() || !keys.length) { container.hidden = true; return false; }
  ensureStyles();
  container.classList.add('app-links');
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Get the app');
  for (const k of keys) {
    const a = document.createElement('a');
    a.className = 'app-badge';
    a.href = STORE_LINKS[k];
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.store = k;
    const [small, big] = LABELS[k];
    a.innerHTML = `${ICONS[k]}<span><small>${small}</small><b>${big}</b></span>`;
    container.append(a);
  }
  container.hidden = false;
  return true;
}
