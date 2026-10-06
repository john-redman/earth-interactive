// Public address of the website. Links shared from the native app (where the page runs on localhost)
// must point here. Update when the custom domain goes live.
export const SITE_URL = 'https://john-redman.github.io/earth-interactive/';

/** Base URL for shareable links: the current page on the web, the public site inside the app. */
export const shareBase = () => (window.EI_PLATFORM === 'native' ? SITE_URL : location.origin + location.pathname);
