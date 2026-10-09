import { launch, openApp, frames, look, S, sleep } from './lib.mjs';
const b = await launch();
const only = process.argv[2]?.split(',');
for (const [name, setup, zoom] of [['st_GRL_COD', 'cmp:GRL,COD', 1.75], ['st_USA_AUS', 'cmp:USA,AUS', 1.6], ['st_hero', 'look:20:25'], ['st_IRN_MNG', 'cmp:IRN,MNG', 1.75], ['st_RUS_CAN', 'cmp:RUS,CAN', 1.25]]) {
  if (only && !only.includes(name)) continue;
  const { page, ctx } = await openApp(b, { w: 540, h: 960, dsf: 2 });
  await page.evaluate(() => { window.__SKY.uNight.value = 0; });
  const [kind, x, y] = setup.split(':');
  if (kind === 'cmp') {
    const [a, c] = x.split(',');
    await page.evaluate(([a, c]) => window.EarthInteractive.compareKeys(a, c), [a, c]); await frames(page, 8); await sleep(2000);
    // fit the pair into the narrow frame
    await page.evaluate(z => { const g = window.EarthInteractive.globe; g.flight = null; g.camera.position.multiplyScalar(z); g.controls.update(); }, zoom);
  }
  if (kind === 'look') await look(page, +x, +y, 4.6);
  await frames(page, 3); await page.screenshot({ path: `${S}/raw/${name}.png` }); console.log('saved', name); await ctx.close();
}
await b.close(); console.log('done');
