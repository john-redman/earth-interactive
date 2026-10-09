import { launch, openApp, frames, look, S, sleep, HIDE_ALL } from './lib.mjs';
const b = await launch();
const only = process.argv[2]?.split(',');
const want = k => !only || only.includes(k);
const shot = async (page, name) => { await frames(page, 3); await page.screenshot({ path: `${S}/raw/${name}.png` }); console.log('saved', name); };
if (want('views')) for (const v of ['un', 'defacto', 'neutral']) {
  const { page, ctx } = await openApp(b, { w: 1000, h: 1000, dsf: 2, query: 'view=' + v, css: HIDE_ALL.replace('.top-left,', '') + '#view-caption{display:none!important}' });
  await page.evaluate(() => { window.__SKY.uNight.value = 0; }); await look(page, 40, 37, 2.15); await shot(page, 'view_' + v); await ctx.close();
}
const UI = '.ad-slot{display:none!important}#hint{display:none!important}';
if (want('desk')) for (const [name, q, act] of [['desk_home', '', null], ['desk_compare', 'compare=GRL,COD', null], ['desk_card', 'c=KAZ', 'info'], ['desk_lens', '', 'lens']]) {
  const { page, ctx } = await openApp(b, { w: 1280, h: 800, dsf: 2, query: q, css: UI });
  await page.evaluate(() => { window.__SKY.uNight.value = 0; });
  await frames(page, 5); await sleep(1500);
  if (act === 'info') { await page.click('#pin-tag [data-act="info"]'); await frames(page, 3); await sleep(1200); }
  if (act === 'lens') { await page.evaluate(() => window.EarthInteractive.setLens('density')); await look(page, 75, 25, 4.2); }
  await shot(page, name); await ctx.close();
}
await b.close(); console.log('done');
