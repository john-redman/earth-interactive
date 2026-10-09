import { page, footer, R, URL_TXT, esc } from './tpl.mjs';
import { renderAll } from './render.mjs';
import fs from 'node:fs';
import { S } from './lib.mjs';
const F = Object.assign({}, ...fs.readdirSync(S + '/raw').filter(f => /^facts-.*\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(S + '/raw/' + f))));
const HEX = fs.existsSync(S + '/raw/hex.json') ? JSON.parse(fs.readFileSync(S + '/raw/hex.json')) : {};
const only = process.argv[2]?.split(',');
const MASK = '-webkit-mask-image:radial-gradient(closest-side,#000 90%,transparent 100%);mask-image:radial-gradient(closest-side,#000 90%,transparent 100%)';
// a raw 2000x2000 capture drawn at `size`, centred at (cx, cy)
const raw = (src, cx, cy, size, mask = true) => `<img class="img" src="${R}${src}.png" style="left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;${mask ? MASK : ''}">`;
const foot = (w, h, y) => `<div class="abs" style="left:64px;right:64px;top:${y}px;display:flex;justify-content:space-between;align-items:center">
  ${footer(30, 'color:#fff')}<span class="url" style="font-size:24px">${URL_TXT}</span></div>`;

/** Generic post: kicker + headline on top, image in the middle, an info line and the footer at the bottom. */
function post({ w, h, img, imgSize, imgY, kicker, title, info, extra = '', full = false, top = 0, cut = 0 }) {
  const portrait = h > w;
  const topH = portrait ? 300 : 250;
  return page(w, h, `
    ${full && (top || cut) ? `<div class="abs" style="left:0;right:0;top:${top}px;bottom:0;overflow:hidden"><img class="img" src="${R}${img}.png" style="left:${(w - Math.max(w, h) - cut) / 2}px;top:${-cut}px;width:${Math.max(w, h) + cut}px;height:${Math.max(w, h) + cut}px"></div>` : full ? raw(img, w / 2, h / 2, Math.max(w, h), false) : raw(img, w / 2, imgY ?? (portrait ? 700 : 590), imgSize ?? (portrait ? 1180 : 1080))}
    <div class="shade-top" style="height:${topH + 90}px"></div>
    <div class="shade-bot" style="height:${portrait ? 330 : 270}px"></div>
    <div class="abs" style="left:64px;right:64px;top:${portrait ? 70 : 56}px">
      ${kicker ? `<p style="font-size:26px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b98aff;margin-bottom:14px">${kicker}</p>` : ''}
      <h1 style="font-size:${title.length > 34 ? 62 : 72}px">${title}</h1>
    </div>
    ${extra}
    ${info ? `<div class="abs" style="left:64px;right:64px;bottom:${portrait ? 150 : 120}px;font-size:31px;font-weight:600;line-height:1.3">${info}</div>` : ''}
    ${foot(w, h, h - (portrait ? 92 : 80))}`);
}
const chip = (name, hex) => `<span class="chip" style="font-size:24px;margin:0 10px 10px 0"><i class="dot" style="background:${hex || '#9d4dff'}"></i>${esc(name)}</span>`;
const jobs = [];
const both = (id, fn) => { for (const [fmt, w, h] of [['square', 1080, 1080], ['portrait', 1080, 1350]]) jobs.push({ out: `posts/${fmt}/${id}.jpg`, w, h, html: fn(w, h), q: 86 }); };

// ---- compares ----
const CMP = [
  ['p01-greenland-vs-drcongo', 'GRL', 'COD', 'Your map has been lying to you', 'Greenland vs DR Congo'],
  ['p02-greenland-vs-australia', 'GRL', 'AUS', 'Greenland looks huge on flat maps', 'Greenland vs Australia'],
  ['p03-russia-vs-canada', 'RUS', 'CAN', 'The two biggest countries, side by side', 'Russia vs Canada'],
  ['p04-usa-vs-australia', 'USA', 'AUS', 'Closer than you think', 'USA vs Australia'],
  ['p05-uk-vs-madagascar', 'GBR', 'MDG', 'Every Brit has wondered this', 'UK vs Madagascar'],
  ['p06-india-vs-russia', 'IND', 'RUS', 'Flat maps flatter the north', 'India vs Russia'],
  ['p07-brazil-vs-australia', 'BRA', 'AUS', 'Two giants of the south', 'Brazil vs Australia'],
  ['p08-japan-vs-germany', 'JPN', 'DEU', 'Japan is not small', 'Japan vs Germany'],
];
for (const [id, a, b, hook, title] of CMP) {
  const f = F[`cmp_${a}_${b}`]; if (!f) { console.log('missing', id); continue; }
  const names = f.items.map(s => s.replace(/[\d.,]+[MK]? km².*$/, '').trim());
  const areas = f.items.map(s => s.match(/[\d.,]+[MK]? km²/)?.[0] + (/main territory/.test(s) ? ' (main territory)' : ''));
  const hex = HEX[`${a}_${b}`] || [];
  both(id, (w, h) => post({ w, h, full: true, img: `cmp_${a}_${b}`, kicker: hook, title,
    info: `<div>${chip(`${names[0]} · ${areas[0]}`, hex[0])}${chip(`${names[1]} · ${areas[1]}`, hex[1])}</div><div style="margin-top:6px">${esc(f.ratio)}.</div>` }));
}
// ---- lenses ----
const LENS = [
  ['p09-lens-population', 'pop', 'Data lens · Population', 'The world by population', 'India 1.46 B · China 1.41 B (2025). One tap recolours the planet.'],
  ['p10-lens-density', 'density', 'Data lens · People per km²', 'Where the world is crowded', 'Bangladesh: 176 million people (2025) in about 148,000 km².'],
  ['p11-lens-gdp-per-person', 'gdppc', 'Data lens · GDP per person', 'Wealth, on a real globe', 'From $214 (Burundi) to $143,041 (Bermuda) per person. Mostly 2024 data.'],
];
for (const [id, k, kicker, title, info] of LENS) {
  both(id, (w, h) => post({ w, h, img: 'lens_' + k, kicker, title, info: '',
    extra: `<img class="img" src="${R}lens_${k}_legend.png" style="right:64px;bottom:${h > w ? 240 : 190}px;width:460px;border-radius:16px">
      <div class="abs" style="left:64px;bottom:${h > w ? 150 : 120}px;width:${w - 128}px;font-size:29px;font-weight:600;line-height:1.3">${info}</div>` }));
}
// ---- country cards ----
const CARDS = [
  ['p12-card-kazakhstan', 'KAZ', 'Did you know?', 'Kazakhstan is the largest landlocked country', 'Tap any country for its capital, population, area rank and neighbours.'],
  ['p13-card-mongolia', 'MNG', 'Did you know?', 'Mongolia is the most sparsely populated UN member', 'About 2 people per km² (2025 population). Tap any country for its facts.'],
];
for (const [id, k, kicker, title, info] of CARDS) {
  both(id, (w, h) => post({ w, h, full: true, top: h > w ? 30 : 40, img: 'card_' + k, kicker, title, info: esc(info) }));
}
// ---- daily ----
both('p14-daily-challenge', (w, h) => post({ w, h, img: 'hero_euaf', imgSize: h > w ? 1100 : 1000, imgY: h > w ? 760 : 640, kicker: 'Daily Challenge', title: 'Same 5 countries for everyone today', info: 'How close can you get? Play, then share your squares.',
  extra: `<div class="abs" style="left:${(w - 836) / 2}px;top:${h > w ? 520 : 400}px;width:836px;height:240px;overflow:hidden;border-radius:28px;background:#1a1d3a;border:2px solid rgba(255,255,255,.16);box-shadow:0 30px 80px rgba(0,0,0,.6)">
    <img class="img" src="${R}daily_end.png" style="left:-584px;top:-138px;width:2000px;height:2000px"></div>
    <p class="abs" style="left:0;right:0;top:${h > w ? 785 : 665}px;text-align:center;font-size:22px;color:rgba(226,230,255,.7);font-weight:600">Example result card from the app</p>` }));
// ---- poll ----
both('p15a-poll-iran-or-mongolia', (w, h) => post({ w, h, img: 'hero_asia', kicker: 'Quick poll', title: 'Which is bigger: Iran or Mongolia?', info: 'Answer in the comments. The reveal is on the next slide.' }));
both('p15b-poll-answer', (w, h) => { const f = F.cmp_IRN_MNG; return post({ w, h, full: true, img: 'cmp_IRN_MNG', kicker: 'The answer', title: 'Iran vs Mongolia', info: f ? esc(f.ratio) + '. Did you guess right?' : '' }); });
// ---- border views carousel (hold until after launch, see captions.md) ----
for (const [i, v] of ['un', 'defacto', 'neutral'].entries()) {
  const f = F['view_' + v] || ['', ''];
  both(`p16-border-views-${i + 1}-${v}`, (w, h) => post({ w, h, full: true, cut: 150, img: 'view_' + v, extra: `<div class="abs" style="left:56px;top:${h > w ? 240 : 215}px;width:448px;height:73px;border-radius:40px;overflow:hidden"><img class="img" src="${R}view_${v}.png" style="left:${-40 * 0.75}px;top:${-40 * 0.75}px;width:${2000 * 0.75}px"></div>`, kicker: `One globe, three border views · ${i + 1}/3`, title: esc(f[0]), info: esc(f[1]) }));
}
await renderAll(only ? jobs.filter(j => only.some(o => j.out.includes(o))) : jobs);
