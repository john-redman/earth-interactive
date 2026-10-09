import { launch, openApp, frames, look, S, sleep, HIDE_ALL } from './lib.mjs';
import fs from 'node:fs';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const want = k => !only || only.includes(k);
const facts = fs.existsSync(S + '/raw/facts-' + (process.argv[3] || 'x') + '.json') ? JSON.parse(fs.readFileSync(S + '/raw/facts-' + (process.argv[3] || 'x') + '.json')) : {};
const save = () => fs.writeFileSync(S + '/raw/facts-' + (process.argv[3] || 'x') + '.json', JSON.stringify(facts, null, 2));
const b = await launch();
const noNight = p => p.evaluate(() => { window.__SKY.uNight.value = 0; });
async function shot(page, name, opts = {}) { await frames(page, opts.frames || 3); await page.screenshot({ path: `${S}/raw/${name}.png`, ...opts.ss }); console.log('saved', name); }

// heroes
for (const [name, lon, lat, d, w, h] of [['hero_euaf', 18, 22, 3.75, 1000, 1000], ['hero_americas', -72, 12, 3.75, 1000, 1000], ['hero_asia', 98, 24, 3.75, 1000, 1000], ['wide_europe', 14, 44, 1.75, 1600, 900]]) {
  if (!want(name)) continue;
  const { page, ctx } = await openApp(b, { w, h, dsf: 2 });
  await noNight(page); await look(page, lon, lat, d); await shot(page, name); await ctx.close();
}
// compares
const pairs = [['GRL', 'COD'], ['GRL', 'AUS'], ['RUS', 'CAN'], ['USA', 'AUS'], ['GBR', 'MDG'], ['IND', 'RUS'], ['BRA', 'AUS'], ['JPN', 'DEU'], ['IRN', 'MNG']];
for (const [a, c] of pairs) {
  const name = `cmp_${a}_${c}`; if (!want(name) && !want('cmp')) continue;
  const { page, ctx } = await openApp(b, { w: 1000, h: 1000, dsf: 2 });
  await noNight(page);
  await page.evaluate(([a, c]) => window.EarthInteractive.compareKeys(a, c), [a, c]);
  await frames(page, 8); await sleep(2000); await frames(page, 2);
  // zoom out a touch for margin
  await page.evaluate(() => { const g = window.EarthInteractive.globe; g.camera.position.multiplyScalar(1.12); g.controls.update(); });
  facts[name] = await page.evaluate(() => ({ ratio: document.querySelector('.cmp-ratio')?.textContent.trim(), items: [...document.querySelectorAll('.cmp-item')].map(e => e.textContent.trim().replace(/\s+/g, ' ')), stats: [...document.querySelectorAll('.cs-row')].map(r => r.textContent.trim().replace(/\s+/g, ' ')) }));
  save(); await shot(page, name); await ctx.close();
}
// lenses
for (const [k, lon, lat] of [['pop', 92, 22], ['density', 75, 25], ['gdppc', 12, 25], ['area', -40, 20]]) {
  const name = 'lens_' + k; if (!want(name) && !want('lens')) continue;
  const { page, ctx } = await openApp(b, { w: 1000, h: 1000, dsf: 2, css: HIDE_ALL.replace('#legend,', '') + '#legend{display:none!important}' });
  await page.evaluate(k => window.EarthInteractive.setLens(k), k);
  await look(page, lon, lat, 3.75); await shot(page, name);
  await page.addStyleTag({ content: '#legend{display:block!important}' });
  await frames(page, 2);
  const el = await page.$('#legend'); await el.screenshot({ path: `${S}/raw/${name}_legend.png` });
  facts[name] = await page.evaluate(() => document.querySelector('#legend').innerText.replace(/\n+/g, ' | ')); save();
  await ctx.close();
}
// cards
for (const k of ['KAZ', 'MNG']) {
  const name = 'card_' + k; if (!want(name) && !want('card')) continue;
  const { page, ctx } = await openApp(b, { w: 1000, h: 1000, dsf: 2, query: 'c=' + k, css: HIDE_ALL });
  await noNight(page); await frames(page, 6); await sleep(1500);
  await page.click('#pin-tag [data-act="info"]'); await frames(page, 4); await sleep(1500);
  facts[name] = await page.evaluate(() => document.querySelector('#popup').innerText.replace(/\n+/g, ' | ')); save();
  await shot(page, name);
  const el = await page.$('#popup'); await el.screenshot({ path: `${S}/raw/${name}_popup.png` });
  await ctx.close();
}
// tag only (pin + tag)
if (want('tag_BRA')) {
  const { page, ctx } = await openApp(b, { w: 1000, h: 1000, dsf: 2, query: 'c=BRA' });
  await noNight(page); await frames(page, 6); await sleep(1500); await shot(page, 'tag_BRA'); await ctx.close();
}
// daily
if (want('daily')) {
  const { page, ctx } = await openApp(b, { w: 1000, h: 1000, dsf: 2, query: 'play=daily', css: HIDE_ALL });
  await noNight(page); await frames(page, 5); await sleep(1200);
  await shot(page, 'daily_q1');
  const plan = ['exact', 'exact', 'close', 'exact', 'near'];
  for (let i = 0; i < 5; i++) {
    const r = await page.evaluate(mode => {
      const E = window.EarthInteractive, name = document.querySelector('.qz-ask b').textContent;
      const o = E.layer.view.objects.find(x => x.unit.n === name);
      if (mode === 'exact') { E.quiz.answer(o, o.g.centroid.clone()); return name; }
      const off = mode === 'close' ? 0.035 : 0.09; // radians
      const p = o.g.centroid.clone().normalize(); p.x += off; p.normalize();
      E.quiz.answer(null, p); return name;
    }, plan[i]);
    facts['daily_q' + (i + 1)] = r;
    await frames(page, 2);
    if (i === 2) await shot(page, 'daily_answer');
    await page.evaluate(() => window.EarthInteractive.quiz.next());
  }
  await frames(page, 4); await sleep(1500);
  facts.daily_end = await page.evaluate(() => document.querySelector('#quiz').innerText.replace(/\n+/g, ' | ')); save();
  await shot(page, 'daily_end');
  await ctx.close();
}
// border views
if (want('views')) {
  for (const v of ['un', 'defacto', 'neutral']) {
    const { page, ctx } = await openApp(b, { w: 1000, h: 1000, dsf: 2, query: 'view=' + v, css: HIDE_ALL.replace('.top-left,', '') + '#view-caption{display:none!important}' });
    await noNight(page); await look(page, 40, 37, 2.15); await shot(page, 'view_' + v);
    facts['view_' + v] = await page.evaluate(() => [document.querySelector('#view-caption b').textContent, document.querySelector('#view-caption span').textContent]); save();
    await ctx.close();
  }
}
// phone UI shots (real app chrome)
if (want('phone')) {
  for (const [name, q, act] of [['phone_home', 'quality=high', null], ['phone_compare', 'quality=high&compare=GRL,COD', null], ['phone_card', 'quality=high&c=KAZ', 'info'], ['phone_lens', 'quality=high', 'lens']]) {
    const { page, ctx } = await openApp(b, { w: 390, h: 844, dsf: 3, query: q, css: '#hint{display:none!important}', touch: true });
    await frames(page, 6); await sleep(1500);
    if (act === 'info') { await page.click('#pin-tag [data-act="info"]'); await frames(page, 4); await sleep(1500); }
    if (act === 'lens') { await page.evaluate(() => window.EarthInteractive.setLens('density')); await look(page, 80, 22, 4.3); await frames(page, 3); }
    await shot(page, name); await ctx.close();
  }
}
// story raws: phone-sized globe captures without chrome, 540x960 @2
for (const [name, setup] of [['st_GRL_COD', 'cmp:GRL,COD'], ['st_USA_AUS', 'cmp:USA,AUS'], ['st_density', 'lens:density:78:24'], ['st_hero', 'look:20:25'], ['st_IRN_MNG', 'cmp:IRN,MNG'], ['st_RUS_CAN', 'cmp:RUS,CAN']]) {
  if (!want(name) && !want('stories')) continue;
  const { page, ctx } = await openApp(b, { w: 540, h: 960, dsf: 2 });
  await noNight(page);
  const [kind, x, y, z] = setup.split(':');
  if (kind === 'cmp') { const [a, c] = x.split(','); await page.evaluate(([a, c]) => window.EarthInteractive.compareKeys(a, c), [a, c]); await frames(page, 8); await sleep(2000); }
  if (kind === 'lens') { await page.evaluate(k => window.EarthInteractive.setLens(k), x); await look(page, +y, +z, 3.3); }
  if (kind === 'look') await look(page, +x, +y, 3.3);
  await shot(page, name); await ctx.close();
}
await b.close();
console.log('done');
