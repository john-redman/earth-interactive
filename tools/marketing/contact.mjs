import { page } from './tpl.mjs';
import { renderAll } from './render.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { ROOT, S, BASE } from './lib.mjs';
const M = ROOT + 'marketing/';
const groups = ['profile', 'banners', 'posts/square', 'posts/portrait', 'stories', 'video', 'screenshots'];
const dims = f => execFileSync('identify', ['-format', '%wx%h', f]).toString();
let html = `<div style="padding:40px 48px"><div class="brand" style="font-size:34px;color:#fff;margin-bottom:6px"><span class="mark"></span>EarthInteractive marketing kit</div><p class="sub" style="font-size:18px;margin-bottom:24px">Contact sheet: every asset in marketing/ with its file name and pixel size.</p>`;
let rows = 0;
for (const g of groups) {
  if (!fs.existsSync(M + g)) continue;
  const files = fs.readdirSync(M + g).filter(f => /\.(png|jpe?g)$/.test(f)).sort();
  if (!files.length) continue;
  html += `<h2 style="font-size:24px;margin:26px 0 12px;color:#b98aff">${g}/</h2><div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">`;
  for (const f of files) {
    const d = dims(M + g + '/' + f); const [w, h] = d.split('x').map(Number);
    const th = g === 'banners' ? 150 : g.startsWith('stories') || g === 'video' ? 300 : g === 'screenshots' ? 260 : 200;
    const tw = Math.round(th * w / h);
    html += `<figure style="margin:0;width:${Math.max(tw, 150)}px"><img src="${BASE}marketing/${g}/${f}" style="display:block;height:${th}px;width:${tw}px;object-fit:contain;border-radius:8px;background:#000;border:1px solid rgba(255,255,255,.15)"><figcaption style="font-size:12.5px;line-height:1.3;margin-top:6px;color:#dfe3ff;word-break:break-all">${f}<br><span style="color:#8f95b8">${d}</span></figcaption></figure>`;
  }
  html += '</div>'; rows++;
}
html += '</div>';
// measure height in the browser by rendering at a generous height, then crop with ImageMagick
await renderAll([{ out: S + '/contact-full.png', w: 2000, h: 6000, html: page(2000, 6000, html, 'body{height:auto!important;background:#05061a!important}') }]);
// trim the empty bottom
execFileSync('convert', [S + '/contact-full.png', '-trim', '-bordercolor', '#05061a', '-border', '30', '-colors', '256', M + 'contact-sheet.png']);
console.log('contact sheet', dims(M + 'contact-sheet.png'));
