// Plain app screenshots with the real interface (press kit, directories, Product Hunt) into marketing/screenshots/,
// plus the two smaller copies the web app manifest offers in the browser's install dialog (icons/screenshot-*.jpg).
import { launch, openApp, frames, look, ROOT } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const OUT = ROOT + 'marketing/screenshots/'; fs.mkdirSync(OUT, { recursive: true });
// the interface stays; only things a visitor wouldn't see in a calm moment go (empty ad slots, tips, toasts)
const HIDE = '.ad-slot,.ad-banner,#toast,#tooltip,.loader,#cotd,.intro-hand,#hint{display:none!important}';
const SIZES = { desktop: { w: 1280, h: 800, dsf: 2, touch: false }, phone: { w: 390, h: 844, dsf: 3, touch: true } };
const SHOTS = [
  // [size, name, query, camera [lon, lat] or null, action]
  ['desktop', 'home', '', [15, 24], null],
  ['desktop', 'card', 'c=FRA&view=un', null, 'info'],
  ['desktop', 'compare', 'compare=GRL,COD', null, 'stats'],
  ['desktop', 'lens', 'lens=pop', [88, 26], null],
  ['phone', 'home', '', [15, 18], null],
  ['phone', 'card', 'c=KAZ&view=un', null, 'info'],
  ['phone', 'compare', 'compare=GRL,COD', null, null],
  ['phone', 'lens', 'lens=density', [88, 24], null],
];
const settle = async page => {
  await page.waitForFunction(() => !window.EarthInteractive.globe.flight, null, { timeout: 300000 });
  await frames(page, 4);
};

const b = await launch();
for (const [size, name, query, cam, act] of SHOTS) {
  const s = SIZES[size];
  const { page, ctx } = await openApp(b, { ...s, query, css: HIDE });
  await page.evaluate(() => { window.__SKY.uNight.value = 0; });
  await settle(page);
  if (cam) await look(page, cam[0], cam[1], await page.evaluate(() => window.EarthInteractive.globe.camera.position.length()));
  if (act === 'info') { await page.click('#pin-tag [data-act="info"]'); await frames(page, 6); await settle(page); }
  if (act === 'stats') { await page.click('#compare-pill [data-act="stats"]'); await frames(page, 6); }
  await frames(page, 6);
  const file = `${OUT}${size}-${name}-${s.w * s.dsf}x${s.h * s.dsf}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
  console.log('wrote', file.replace(ROOT, ''));
  await ctx.close();
}
await b.close();

// manifest screenshots: "wide" for desktop install dialogs, "narrow" for phones (Chrome shows them on install)
execFileSync('convert', [`${OUT}desktop-home-2560x1600.jpg`, '-resize', '1280x800', '-quality', '82', '-strip', ROOT + 'icons/screenshot-wide.jpg']);
execFileSync('convert', [`${OUT}phone-home-1170x2532.jpg`, '-resize', '780x1688', '-quality', '82', '-strip', ROOT + 'icons/screenshot-narrow.jpg']);
console.log('wrote icons/screenshot-wide.jpg, icons/screenshot-narrow.jpg');
