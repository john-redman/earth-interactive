import { launch, ROOT, S, BASE } from './lib.mjs';
import fs from 'node:fs'; import path from 'node:path';
export const OUT = ROOT + 'marketing/';
/** jobs: [{ out, w, h, html, dsf=1, q=88 }] — .png or .jpg by extension */
export async function renderAll(jobs) {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 100, height: 100 } });
  const byDsf = new Map();
  for (const j of jobs) {
    const dsf = j.dsf || 1;
    if (!byDsf.has(dsf)) byDsf.set(dsf, await b.newContext({ viewport: { width: 100, height: 100 }, deviceScaleFactor: dsf }));
    const page = await byDsf.get(dsf).newPage();
    await page.setViewportSize({ width: j.w, height: j.h });
    const tmp = S + '/tmp/' + j.out.replace(/[^a-z0-9.-]/gi, '_') + '.html';
    fs.writeFileSync(tmp, j.html);
    await page.goto(BASE + 'tools/marketing/.work/tmp/' + path.basename(tmp) + '?v=' + Date.now() + Math.random(), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const file = j.out.startsWith('/') ? j.out : OUT + j.out; fs.mkdirSync(path.dirname(file), { recursive: true });
    const jpg = /\.jpe?g$/.test(file);
    await page.screenshot({ path: file, type: jpg ? 'jpeg' : 'png', quality: jpg ? (j.q || 88) : undefined, omitBackground: !!j.transparent });
    await page.close();
    console.log('wrote', j.out);
  }
  await b.close();
}
