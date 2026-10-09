// Product Hunt gallery (1270x760) + stories (1080x1920) + screenshots folder
import { page, footer, R, URL_TXT, esc } from './tpl.mjs';
import { renderAll } from './render.mjs';
import fs from 'node:fs';
import { S } from './lib.mjs';
const HEX = JSON.parse(fs.readFileSync(S + '/raw/hex.json'));
const F = Object.assign({}, ...fs.readdirSync(S + '/raw').filter(f => /^facts-.*\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(S + '/raw/' + f))));
const only = process.argv[2]?.split(',');
const MASK = '-webkit-mask-image:radial-gradient(closest-side,#000 90%,transparent 100%);mask-image:radial-gradient(closest-side,#000 90%,transparent 100%)';
const img = (src, x, y, w, h, extra = '') => `<img class="img" src="${R}${src}.png" style="left:${x}px;top:${y}px;width:${w}px;height:${h ?? w}px;${extra}">`;
const crop = (src, cx, cy, cw, ch, x, y, scale, extra = '') => `<div class="abs" style="left:${x}px;top:${y}px;width:${cw * scale}px;height:${ch * scale}px;overflow:hidden;${extra}"><img class="img" src="${R}${src}.png" style="left:${-cx * scale}px;top:${-cy * scale}px;width:${2000 * scale}px"></div>`;
const jobs = [];
const card = (x, y, k = 1) => `<div class="abs" style="left:${x}px;top:${y}px;width:${836 * k}px;height:${240 * k}px;overflow:hidden;border-radius:${28 * k}px;background:#1a1d3a;border:2px solid rgba(255,255,255,.16);box-shadow:0 30px 80px rgba(0,0,0,.6)"><img class="img" src="${R}daily_end.png" style="left:${-584 * k}px;top:${-138 * k}px;width:${2000 * k}px;height:${2000 * k}px"></div>`;
const W = 1270, H = 760;
const gText = (kicker, title, sub) => `<div class="abs" style="left:64px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center">
  ${footer(22, 'color:#fff;margin-bottom:26px')}
  <p style="font-size:17px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b98aff;margin-bottom:10px">${kicker}</p>
  <h1 style="font-size:50px">${title}</h1>
  <p class="sub" style="font-size:21px;margin-top:18px">${sub}</p>
  <p class="url" style="font-size:17px;margin-top:22px">${URL_TXT}</p></div>`;
// g01 hero
jobs.push({ out: 'banners/producthunt-gallery-01-hero.jpg', w: W, h: H, q: 90, html: page(W, H, `${img('hero_euaf', 520, -40, 840, 840, MASK)}${gText('True-to-scale 3D globe', 'See how big countries <span class="accent">really</span> are', 'Spin the planet, open any country for facts, compare real sizes and play a daily challenge. Free, no sign-up.')}`) });
// g02 compare (full-bleed right half)
jobs.push({ out: 'banners/producthunt-gallery-02-compare.jpg', w: W, h: H, q: 90, html: page(W, H, `${img('cmp_GRL_COD', 420, -150, 1000)}<div class="abs" style="left:0;top:0;bottom:0;width:640px;background:linear-gradient(90deg,#060818 0%,#060818 70%,#06081800 100%)"></div>${gText('True-size compare', 'Pull countries off the globe', 'Two countries lift out as 3D puzzle pieces and sit side by side at the same latitude. ' + esc(HEX.GRL_COD[2]) + '.')}`) });
// g03 data lens
jobs.push({ out: 'banners/producthunt-gallery-03-data-lens.jpg', w: W, h: H, q: 90, html: page(W, H, `${img('lens_density', 520, -40, 840, 840, MASK)}${img('lens_density_legend', 950, 610, 280, null, 'height:auto;border-radius:12px')}${gText('Data lenses', 'Recolour the world by data', 'Population, people per km², GDP per person and area, on a real sphere. World Bank 2025 population, 2024 GDP.')}`) });
// g04 daily challenge
jobs.push({ out: 'banners/producthunt-gallery-04-daily.jpg', w: W, h: H, q: 90, html: page(W, H, `${img('hero_euaf', 560, -20, 800, 800, MASK)}${card(540, 270, 0.82)}${gText('Daily Challenge', 'Same 5 countries for everyone', 'Find each country on the globe. Scored by distance; share your squares when you are done.')}`) });
// g05 phones
const phone = (src, x) => `<div class="abs" style="left:${x}px;top:70px;width:300px;height:649px;border-radius:38px;overflow:hidden;border:6px solid #2a2f52;box-shadow:0 20px 60px rgba(0,0,0,.6)"><img class="img" src="${R}${src}.png" style="left:0;top:0;width:288px;height:624px"></div>`;
jobs.push({ out: 'banners/producthunt-gallery-05-phone.jpg', w: W, h: H, q: 90, html: page(W, H, `<div class="abs" style="left:0;right:0;top:0;height:60px"></div>${phone('phone_home', 60)}${phone('phone_compare', 400)}${phone('phone_card', 740)}
  <div class="abs" style="left:1075px;top:250px;width:170px">${footer(18, 'color:#fff;margin-bottom:14px')}<h1 style="font-size:30px">Made for phones</h1><p class="sub" style="font-size:16px;margin-top:10px">Swipe to spin, tap a country, drag the card. Works on Chromebooks too.</p></div>`) });
// g06 three border views
const third = (v, x) => { const f = F['view_' + v] || ['', '']; return `${crop('view_' + v, 0, 0, 2000, 2000, x, 150, 0.19, 'border-radius:22px;border:1px solid rgba(255,255,255,.14)')}<div class="abs" style="left:${x}px;top:550px;width:380px"><p style="font-size:22px;font-weight:800">${esc(f[0])}</p><p class="sub" style="font-size:16px;margin-top:6px">${esc(f[1])}</p></div>`; };
jobs.push({ out: 'banners/producthunt-gallery-06-border-views.jpg', w: W, h: H, q: 90, html: page(W, H, `<div class="abs" style="left:64px;top:52px">${footer(20, 'color:#fff')}<h1 style="font-size:40px;margin-top:12px">One globe, three border views</h1></div>${third('un', 52)}${third('defacto', 445)}${third('neutral', 838)}`) });

// ---------- stories 1080x1920 (safe zone: no text in top 250 / bottom 340) ----------
const story = ({ bg, kicker, title, info, extra = '', square = false }) => page(1080, 1920, `
  ${square ? img(bg, -130, 420, 1340, 1340, MASK) : img(bg, 0, 0, 1080, 1920)}
  <div class="abs" style="left:0;right:0;top:0;height:720px;background:linear-gradient(#03040be6 0%,#03040bb0 60%,#03040b00 100%)"></div>
  <div class="abs" style="left:0;right:0;bottom:0;height:780px;background:linear-gradient(#03040b00 0%,#03040bc8 50%,#03040bf2 100%)"></div>
  <div class="abs" style="left:70px;right:70px;top:270px;text-align:center">
    ${kicker ? `<p style="font-size:32px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#d2b6ff">${kicker}</p>` : ''}
    <h1 style="font-size:84px;margin-top:16px">${title}</h1></div>
  ${extra}
  ${info ? `<div class="abs" style="left:70px;right:70px;bottom:440px;text-align:center"><span style="display:inline-block;padding:22px 30px;border-radius:28px;background:rgba(14,16,38,.82);border:2px solid rgba(255,255,255,.18);font-size:40px;font-weight:700;line-height:1.28">${info}</span></div>` : ''}
  <div class="abs" style="left:0;right:0;bottom:360px;display:flex;justify-content:center">${footer(34, 'color:#fff')}</div>`);
const ST = [
  ['s01-greenland-vs-drcongo', { bg: 'st_GRL_COD', kicker: 'Your map has been lying to you', title: 'Greenland vs DR Congo', info: esc(HEX.GRL_COD[2]) }],
  ['s02-usa-vs-australia', { bg: 'st_USA_AUS', kicker: 'Same latitude, side by side', title: 'USA vs Australia', info: esc(HEX.USA_AUS[2]) + '<br><span style="font-size:28px;opacity:.75">USA: contiguous 48 states (main territory)</span>' }],
  ['s03-russia-vs-canada', { bg: 'st_RUS_CAN', kicker: 'The two biggest countries', title: 'Russia vs Canada', info: esc(HEX.RUS_CAN[2]) }],
  ['s04-density-lens', { bg: 'st_density', kicker: 'Data lens', title: 'Where the world is crowded', info: 'People per km² · tap Data in the app' }],
  ['s05-poll-iran-or-mongolia', { bg: 'hero_asia', square: true, kicker: 'Quick poll', title: 'Which is bigger: Iran or Mongolia?', info: '', extra: '<div class="abs" style="left:140px;right:140px;top:1080px;height:260px;border:4px dashed rgba(255,255,255,.35);border-radius:36px;display:flex;align-items:center;justify-content:center;font-size:30px;color:rgba(255,255,255,.55);font-weight:600">poll sticker here</div>' }],
  ['s06-poll-answer', { bg: 'st_IRN_MNG', kicker: 'The answer', title: 'Iran vs Mongolia', info: esc(HEX.IRN_MNG[2]) }],
  ['s07-spin-the-world', { bg: 'st_hero', kicker: 'Free · no sign-up', title: 'Spin a true-to-scale globe', info: 'Tap the link sticker to try it' }],
];
for (const [id, o] of ST) jobs.push({ out: `stories/${id}.jpg`, w: 1080, h: 1920, q: 88, html: story(o) });
// daily story: the result card cropped from the desktop capture
jobs.push({ out: 'stories/s08-daily-challenge.jpg', w: 1080, h: 1920, q: 88, html: story({ bg: 'st_hero', kicker: 'Daily Challenge', title: 'Same 5 countries for everyone today', info: 'How close can you get?', extra: card(80, 820, 1.105) }) });
await renderAll(only ? jobs.filter(j => only.some(o => j.out.includes(o))) : jobs);
