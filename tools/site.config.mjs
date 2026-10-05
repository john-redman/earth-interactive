// Site-wide settings for the static pages (tools/build-pages.mjs) — one place to change them.
//
// Keep these in step with the browser copies (tools/build-pages.mjs fails the build when they differ):
//   url          ↔ SITE_URL in js/site.js
//   goatcounter  ↔ GOATCOUNTER_CODE in js/analytics.js
//
// Everything here is public: it ends up in the HTML. Never put secrets in this file.
export const SITE = {
  /** Public address, with a trailing slash. Change (and redeploy) when the custom domain goes live. */
  url: 'https://john-redman.github.io/earth-interactive/',
  name: 'EarthInteractive',
  /** Short tagline used in titles and link previews. */
  tagline: 'True size of countries on a 3D globe',
  description: 'Spin a true-to-scale 3D globe, compare the real size of countries side by side, explore facts about every country and play a daily geography game. Free, no sign-up.',
  /** Contact address shown on the pages, e.g. 'hello@example.com'. Empty = link to GitHub issues instead. */
  contactEmail: '',
  repoUrl: 'https://github.com/john-redman/earth-interactive',
  issuesUrl: 'https://github.com/john-redman/earth-interactive/issues',
  /** Ko-fi page name (https://ko-fi.com/<kofi>). Empty = every "Support" link stays hidden. */
  kofi: '',
  /** GoatCounter site code (https://<code>.goatcounter.com). Empty = no analytics anywhere. */
  goatcounter: '',
  /** Who runs the site, for the About page and the legal pages. */
  operator: 'John Redman',
  /** Date the privacy policy and terms last changed (shown on those pages). */
  legalUpdated: '2026-10-05',
};
