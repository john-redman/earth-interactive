// The link-preview image (og-image.png, 1200×630): the live globe beside the tagline.
import { ROOT, BASE } from './lib.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
// daylight everywhere (the real time of day would put part of the globe in night), no intro, no music
await p.addInitScript(() => { try { localStorage.setItem('ei-daynight', '0'); localStorage.setItem('ei-intro', '1'); localStorage.setItem('ei-music', '0'); } catch {} });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
const loaderTexts = new Set();
await p.goto(BASE + '?quality=high', { waitUntil: 'domcontentloaded', timeout: 120000 });
for (let i = 0; i < 200; i++) {
  const t = await p.evaluate(() => document.querySelector('.loader p')?.textContent + ' | ' + document.querySelector('.loader-bar i')?.style.transform);
  loaderTexts.add(t.replace(/\d+(\.\d+)?/g, 'N'));
  if (await p.evaluate(() => document.body.classList.contains('ready'))) break;
  await p.waitForTimeout(150);
}
console.log('loader states:', [...loaderTexts].join(' || '));
await p.evaluate(() => {
  const { globe, spin } = window.EarthInteractive; globe.controls.autoRotate = false; globe.lockAuto = true; globe.autoRotate = false; spin.auto = 0;
  globe.camera.position.set(0.9, 0.75, 1.0).setLength(globe.fitDistance * 0.95); globe.camera.lookAt(0, 0, 0);
  globe.insetX = 0;
  const st = document.createElement('style');
  st.textContent = `body > *:not(#stage):not(.og), #stage > *:not(#globe) { display: none !important; }
    .og { position: fixed; left: 64px; top: 50%; transform: translateY(-50%); z-index: 99; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #fff; max-width: 470px; }
    .og b { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 800; color: rgba(255,255,255,0.9); }
    .og b i { width: 22px; height: 22px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #c8e6ff, #4f8dff 45%, #6a2bd8 100%); box-shadow: 0 0 16px rgba(120,140,255,0.7); }
    .og h1 { margin: 22px 0 14px; font-size: 54px; line-height: 1.05; letter-spacing: -0.02em; font-weight: 800; }
    .og p { margin: 0; font-size: 22px; line-height: 1.4; color: rgba(226,230,255,0.75); }`;
  document.head.append(st);
  const d = document.createElement('div'); d.className = 'og';
  d.innerHTML = '<b><i></i>EarthInteractive</b><h1>See how big countries really are</h1><p>Spin a true-to-scale 3D globe, compare any two countries and play the daily geography challenge.</p>';
  document.body.append(d);
  document.getElementById('globe').style.transform = 'translateX(300px)';
  globe.resize();
});
await p.waitForTimeout(8000);
await p.screenshot({ path: ROOT + 'og-image.png', timeout: 180000 });
await b.close();
