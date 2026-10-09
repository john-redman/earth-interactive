// Shared helpers for the marketing pipeline (see README.md here): paths, the browser, opening the app, framing shots.
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
/** The repo root, the working folder for raw captures and temp pages (git-ignored), and where the app is served. */
export const ROOT = new URL('../../', import.meta.url).pathname;
export const S = ROOT + 'tools/marketing/.work';
export const BASE = process.env.MK_BASE || 'http://127.0.0.1:8765/';
fs.mkdirSync(S + '/raw', { recursive: true }); fs.mkdirSync(S + '/tmp', { recursive: true });
const FONT = fs.readFileSync(ROOT + 'vendor/fonts/plus-jakarta-sans/plus-jakarta-sans-latin.woff2');
export const FONT_CSS = `@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:200 800;src:url(data:font/woff2;base64,${FONT.toString('base64')}) format('woff2');}`;

export async function launch() {
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

const VT = `(() => {
  const vt = window.__vt = { frozen: false, t: 0, queue: [] };
  const realNow = performance.now.bind(performance);
  performance.now = () => vt.frozen ? vt.t : realNow();
  const realRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { if (vt.frozen) { vt.queue.push(cb); return 1; } return realRAF(() => cb(performance.now())); };
  window.__freeze = () => { vt.t = realNow(); vt.frozen = true; };
  window.__step = (ms) => {
    vt.t += ms;
    for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = (a.currentTime || 0) + ms; } catch {} }
    const q = vt.queue; vt.queue = []; q.forEach(cb => cb(vt.t));
  };
})();`;

export const HIDE_ALL = `.site-links,.top-left,.dock,#clock,.brand,.credit,#recenter,#sound-toggle,#hint,#legend,#compare-pill,#compare-bar,.ad-slot,.ad-banner,#toast,#tooltip,#app-links,#pick-banner,.loader,#popclock,#cotd,.intro-hand,.corner-btn,#music-toggle,#daynight-toggle{display:none!important}`;

/** Open the app. opts: { w, h, dsf, query, css, vt } */
export async function openApp(browser, { w = 1000, h = 1000, dsf = 2, query = '', css = HIDE_ALL, vt = false, touch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: touch, isMobile: false });
  const page = await ctx.newPage(); page.setDefaultTimeout(400000);
  page.on('pageerror', e => console.error('pageerror', e.message));
  if (vt) await page.addInitScript(VT);
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('ei-intro', '1'); localStorage.setItem('ei-tip-tag', '1'); localStorage.setItem('ei-music', '0'); localStorage.setItem('ei-daynight', '0'); } catch {} }); // daylight everywhere: the app eases night back in each frame otherwise
  await page.goto(BASE + (query ? '?' + query : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.EarthInteractive, null, { timeout: 180000 });
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(async () => {
    const E = window.EarthInteractive;
    E.ads.enable(false);
    E.globe.governor.frame = () => {};
    E.globe.lockAuto = true; E.globe.controls.autoRotate = false; E.globe.autoRotate = false; E.spin.auto = 0;
    const { SKY } = await import('/js/sun.js');
    window.__SKY = SKY;
  });
  return { ctx, page };
}

/** Wait for n real rendered frames. */
export async function frames(page, n = 3) {
  await page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
}

/** Point camera at lon/lat at distance d. */
export async function look(page, lon, lat, d) {
  await page.evaluate(([lon, lat, d]) => {
    const E = window.EarthInteractive, c = E.globe.camera, D = Math.PI / 180;
    E.globe.flight = null; E.spin.v = 0; E.spin.vPhi = 0;
    const cl = Math.cos(lat * D);
    c.position.set(d * cl * Math.sin(lon * D), d * Math.sin(lat * D), d * cl * Math.cos(lon * D));
    c.lookAt(0, 0, 0); E.globe.controls.update();
  }, [lon, lat, d]);
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
