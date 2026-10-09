// Deterministic vertical video: the app runs on a virtual clock, every frame is stepped and captured,
// then crisp text overlays (rendered separately at 1080x1920) are composited with ffmpeg.
import { launch, openApp, frames, S } from './lib.mjs';
import { page as tplPage, R } from './tpl.mjs';
import { renderAll, OUT } from './render.mjs';
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const id = process.argv[2], maxFrames = +process.argv[3] || 0, DSF = +process.argv[4] || 1.5;
const FPS = 30;
const HEX = JSON.parse(fs.readFileSync(S + '/raw/hex.json'));
const SCRIPTS = {
  v01: { name: 'v01-greenland-vs-drcongo', dur: 11, start: [-38, 40], zoom: 0.97, cmp: ['GRL', 'COD'], fit: 1.75, cmpAt: 2.6, ratio: HEX.GRL_COD[2],
    overlays: [[0, 2.6, 'Your map has been lying to you', 'Greenland vs DR Congo'], [2.6, 9.3, 'Pulled both off the globe', 'Greenland vs DR Congo', 'ratioAt:5']], endAt: 9.3, endLine: 'Compare any two countries' },
  v02: { name: 'v02-usa-vs-australia', dur: 11, start: [-110, 25], zoom: 0.97, cmp: ['USA', 'AUS'], fit: 1.6, cmpAt: 2.6, ratio: HEX.USA_AUS[2] + '<br><span style="font-size:30px;opacity:.75">USA: contiguous 48 states, as in the app</span>',
    overlays: [[0, 2.6, 'How big is Australia, really?', 'USA vs Australia'], [2.6, 9.3, 'Same latitude, side by side', 'USA vs Australia', 'ratioAt:5']], endAt: 9.3, endLine: 'Compare any two countries' },
  v03: { name: 'v03-data-lenses', dur: 12, start: [20, 22], zoom: 0.97, lenses: [[0, 'none', 'Political'], [2.5, 'pop', 'Population'], [5, 'density', 'People per km²'], [7.5, 'gdppc', 'GDP per person']],
    overlays: [[0, 2.5, 'One tap recolours the planet', 'Political'], [2.5, 5, 'One tap recolours the planet', 'Population'], [5, 7.5, 'One tap recolours the planet', 'People per km²'], [7.5, 10.2, 'One tap recolours the planet', 'GDP per person']], endAt: 10.2, endLine: 'See the world by data' },
};
const sc = SCRIPTS[id];
const dir = `${S}/frames/${id}`; const SKIP = !!process.env.SKIPFRAMES;
if (!SKIP) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); }

// ---------- 1. frames ----------
if (!SKIP) {
const b = await launch();
const { page } = await openApp(b, { w: 540, h: 960, dsf: DSF, vt: true, query: process.env.VQ || '' });
await page.evaluate(() => { window.__SKY.uNight.value = 0; });
const orbit = (lon, lat) => page.evaluate(([lon, lat, z]) => {
  const E = window.EarthInteractive, c = E.globe.camera, D = Math.PI / 180, d = E.globe.fitDistance * z;
  const cl = Math.cos(lat * D); c.position.set(d * cl * Math.sin(lon * D), d * Math.sin(lat * D), d * cl * Math.cos(lon * D)); c.lookAt(0, 0, 0);
}, [lon, lat, sc.zoom]);
await orbit(...sc.start); await frames(page, 2);
await page.evaluate(() => window.__freeze());
const N = Math.round(sc.dur * FPS), t0 = Date.now();
for (let i = 0; i < (maxFrames || N); i++) {
  const t = i / FPS;
  if (!sc.cmp || t < sc.cmpAt) await orbit(sc.start[0] + t * (sc.cmp ? 5 : 9), sc.start[1]);
  if (sc.cmp && Math.abs(t - sc.cmpAt) < 0.5 / FPS) await page.evaluate(([a, c, fit]) => { const g = window.EarthInteractive.globe, fly = g.flyTo; g.flyTo = (dir, dist, ms) => fly(dir, dist * fit, ms); window.EarthInteractive.compareKeys(a, c); g.flyTo = fly; }, [...sc.cmp, sc.fit]);
  if (sc.cmp && t > sc.cmpAt + 1.4) await page.evaluate(() => { const g = window.EarthInteractive.globe; if (!g.flight) g.camera.position.multiplyScalar(0.9995); });
  if (sc.lenses) for (const [at, k] of sc.lenses) if (Math.abs(t - at) < 0.5 / FPS) await page.evaluate(k => window.EarthInteractive.setLens(k), k);
  await page.evaluate(ms => window.__step(ms), 1000 / FPS);
  await page.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
  if (i % 30 === 0) console.log(id, 'frame', i, '/', N, ((Date.now() - t0) / (i + 1) / 1000).toFixed(1) + 's/frame');
}
await b.close();
}
if (maxFrames) process.exit(0);

// ---------- 2. overlays (1080x1920, transparent) ----------
// Story/Reels safe zone: keep text out of the top 250 px and the bottom 340 px.
const CSS = `html,body{background:transparent!important}
.top{position:absolute;left:60px;right:60px;top:270px;text-align:center}
.k{font-size:30px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#d2b6ff;text-shadow:0 2px 16px #000,0 0 4px #000}
h1{font-size:78px;margin-top:14px;text-shadow:0 4px 26px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.6)}
.bot{position:absolute;left:60px;right:60px;bottom:380px;text-align:center}
.bot span{display:inline-block;padding:20px 30px;border-radius:28px;background:rgba(14,16,38,.82);border:2px solid rgba(255,255,255,.18);font-size:42px;font-weight:700;line-height:1.25}
.end{position:absolute;inset:0;background:rgba(3,4,11,.86);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center}
.end .u{font-size:34px;color:rgba(226,230,255,.85);font-weight:600}`;
const jobs = [];
const ov = (name, body) => jobs.push({ out: `${S}/vtmp/${id}-${name}.png`, w: 1080, h: 1920, html: tplPage(1080, 1920, body, CSS), transparent: true });
sc.overlays.forEach(([, , k, h], j) => ov('o' + j, `<div class="top"><div class="k">${k}</div><h1>${h}</h1></div>`));
if (sc.ratio) ov('ratio', `<div class="bot"><span>${sc.ratio}</span></div>`);
ov('end', `<div class="end"><div class="brand" style="font-size:44px"><span class="mark"></span>EarthInteractive</div><h1 style="font-size:72px;margin:0 60px">${sc.endLine}</h1><div class="u">Free · no sign-up · works on phones</div><div class="u">john-redman.github.io/earth-interactive</div></div>`);
await renderAll(jobs);
const T = `${S}/vtmp/${id}-`;

// ---------- 3. composite ----------
const out = `${OUT}video/${sc.name}-1080x1920.mp4`; fs.mkdirSync(`${OUT}video`, { recursive: true });
const inputs = ['-framerate', String(FPS), '-i', `${dir}/%04d.jpg`];
const layers = sc.overlays.map(([a, z], j) => ({ file: `${T}o${j}.png`, a, z }));
if (sc.ratio) { const at = +sc.overlays.find(o => o[4])[4].split(':')[1]; layers.push({ file: `${T}ratio.png`, a: at, z: sc.endAt }); }
layers.push({ file: `${T}end.png`, a: sc.endAt, z: sc.dur + 1, fade: true });
for (const l of layers) inputs.push('-loop', '1', '-t', String(sc.dur), '-i', l.file);
let f = `[0:v]scale=1080:1920:flags=lanczos,format=yuva420p[b0]`;
layers.forEach((l, j) => {
  const src = `[${j + 1}:v]format=rgba${l.fade ? `,fade=in:st=${l.a}:d=0.35:alpha=1` : ''}[l${j}]`;
  f += `;${src};[b${j}][l${j}]overlay=0:0:enable='between(t,${l.a},${l.z})'[b${j + 1}]`;
});
f += `;[b${layers.length}]format=yuv420p[v]`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', f, '-map', '[v]', '-t', String(sc.dur), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', '-an', out]);
// cover image for the post (the frame where the ratio is showing)
console.log('wrote', out);
