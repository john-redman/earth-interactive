// Browser smoke test for the globe: search, pin + tag, card, neighbours, Escape chain, compare, data lenses,
// border views, Daily Challenge, recenter and deep links, on desktop and phone sizes.
// Needs Playwright with Chromium (not a project dependency):
//   npm run preview:pages            (serves dist-pages on :5174), then in another terminal:
//   npm run smoke                    (or BASE=<url of the globe page> node tools/smoke.mjs)
// Prints PASS/FAIL per check and exits 1 on any failure.
const { chromium, devices } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.BASE || 'http://localhost:5174/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`);
for (const [dev, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['Pixel 7'], deviceScaleFactor: 1 }]]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/fonts\.g|ERR_CERT|ERR_TUNNEL|net::ERR/.test(m.text()) && errs.push('console: ' + m.text()));
  const go = async q => { await p.goto(BASE + q, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 180000 }); await p.waitForTimeout(1500); };
  const E = (fn, arg) => p.evaluate(fn, arg);
  const t = async (name, fn) => { try { await fn(); } catch (e) { ok(`${dev} ${name}`, false, '— ' + e.message.split('\n')[0]); } };
  await go('');
  await t('search → pin+tag', async () => {
    if (dev === 'desktop') await p.keyboard.press('/'); else await p.click('[data-dock="search"]');
    await p.waitForTimeout(800); await p.fill('#search input', 'peru'); await p.waitForTimeout(800); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
    const s = await E(() => ({ tag: !document.getElementById('pin-tag').hidden, name: document.querySelector('#pin-tag b')?.textContent, pin: !document.querySelector('.map-pin').hidden, url: location.search }));
    ok(`${dev} search → pin+tag`, s.tag && s.pin && s.name === 'Peru' && /c=PER/.test(s.url), JSON.stringify(s));
  });
  await t('info card + neighbours', async () => {
    await p.click('#pin-tag [data-act="info"]'); await p.waitForTimeout(1200);
    const s = await E(() => ({ card: !document.getElementById('popup').hidden, chips: document.querySelectorAll('#popup .chip').length, rows: document.querySelectorAll('#popup .pop-stats div').length, pop: [...document.querySelectorAll('#popup .pop-stats div')].find(d => d.textContent.includes('Population'))?.textContent }));
    ok(`${dev} info card`, s.card && s.chips >= 4 && s.rows >= 6 && /2025/.test(s.pop || ''), JSON.stringify(s));
    await p.click('#popup .chip >> nth=0'); await p.waitForTimeout(2500);
    const n = await E(() => document.querySelector('#popup h2')?.textContent);
    ok(`${dev} neighbour chip opens neighbour card`, n && n !== 'Peru', n);
  });
  await t('escape chain', async () => {
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    const a = await E(() => ({ card: !document.getElementById('popup').hidden, tag: !document.getElementById('pin-tag').hidden }));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    const c = await E(() => ({ tag: !document.getElementById('pin-tag').hidden, pin: !document.querySelector('.map-pin').hidden }));
    ok(`${dev} escape card→tag→none`, !a.card && a.tag && !c.tag && !c.pin, JSON.stringify([a, c]));
  });
  await t('compare flow', async () => {
    await go('?c=FRA'); await p.click('#pin-tag [data-act="compare"]'); await p.waitForTimeout(800);
    const pick = await E(() => !document.getElementById('pick-banner').hidden);
    await E(() => window.EarthInteractive.compareKeys('FRA', 'BRA')); await p.waitForTimeout(3000);
    const s = await E(() => ({ pill: !document.getElementById('compare-pill').hidden, url: location.search }));
    await p.click('#compare-pill [data-act="stats"]'); await p.waitForTimeout(1000);
    const st = await E(() => ({ rows: document.querySelectorAll('#compare-bar .cs-row').length, ratio: document.querySelector('.cmp-ratio')?.textContent }));
    await p.click('#compare-bar [data-act="done"]'); await p.waitForTimeout(2500);
    const end = await E(() => ({ pill: !document.getElementById('compare-pill').hidden, bar: !document.getElementById('compare-bar').hidden, mode: document.body.classList.contains('comparing') }));
    ok(`${dev} compare flow`, pick && s.pill && /compare=FRA,BRA/.test(s.url) && st.rows >= 8 && !end.pill && !end.bar && !end.mode, JSON.stringify({ pick, s, st, end }));
  });
  await t('lenses', async () => {
    const out = [];
    for (const k of ['pop', 'density', 'gdppc', 'area', 'none']) { await E(k => window.EarthInteractive.setLens(k), k); await p.waitForTimeout(600); out.push(k + ':' + (await E(() => !document.getElementById('legend').hidden))); }
    ok(`${dev} lenses + legend`, out.join() === 'pop:true,density:true,gdppc:true,area:true,none:false', out.join());
  });
  await t('views', async () => {
    const out = [];
    for (const v of ['un', 'neutral', 'defacto']) { await E(v => window.EarthInteractive.setView(v), v); await p.waitForTimeout(1500); out.push(await E(() => window.EarthInteractive.layer.view.key + ':' + window.EarthInteractive.layer.view.objects.length)); }
    ok(`${dev} border views`, out.every(x => +x.split(':')[1] > 200), out.join(' '));
  });
  await t('daily quiz', async () => {
    await go('?play=daily');
    for (let i = 0; i < 5; i++) { await p.click('#quiz [data-a="skip"]', { timeout: 60000 }); await p.click('#quiz [data-a="next"]', { timeout: 60000 }); }
    await p.waitForTimeout(1000);
    const s = await E(() => ({ end: !!document.querySelector('#quiz .qz-end'), share: !!document.querySelector('#quiz [data-a="share"]') }));
    await p.click('#quiz [data-a="classic"]'); await p.waitForTimeout(1500);
    const cl = await E(() => document.querySelector('#quiz .qz-mode')?.textContent);
    await p.click('#quiz .qz-x'); await p.waitForTimeout(800);
    const closed = await E(() => document.getElementById('quiz').hidden && !document.body.classList.contains('quiz-on'));
    ok(`${dev} daily → classic → exit`, s.end && s.share && /Find it/i.test(cl || '') && closed, JSON.stringify({ s, cl, closed }));
  });
  await t('recenter + keyboard', async () => {
    await go('?c=JPN'); await p.keyboard.press('r'); await p.waitForTimeout(2500);
    const s = await E(() => ({ tag: !document.getElementById('pin-tag').hidden, auto: window.EarthInteractive.globe.autoRotate }));
    ok(`${dev} recenter (R)`, !s.tag && (s.auto || matchMedia('(prefers-reduced-motion: reduce)').matches), JSON.stringify(s));
  });
  await t('deep links', async () => {
    await go('?view=un&c=TWN'); const s = await E(() => ({ view: window.EarthInteractive.layer.view.key, tag: document.querySelector('#pin-tag b')?.textContent }));
    ok(`${dev} ?view=un&c=TWN`, s.view === 'un', JSON.stringify(s));
    await go('?c=XXX'); ok(`${dev} bad ?c= ignored`, await E(() => document.getElementById('pin-tag').hidden));
  });
  ok(`${dev} no JS errors`, errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  await ctx.close();
}
await b.close();
console.log(results.join('\n'));
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
