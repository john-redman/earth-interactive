import { launch, openApp, S } from './lib.mjs';
import fs from 'node:fs';
const b = await launch();
const { page } = await openApp(b, { w: 300, h: 300, dsf: 1 });
const out = {};
for (const p of ['GRL_COD', 'GRL_AUS', 'RUS_CAN', 'USA_AUS', 'GBR_MDG', 'IND_RUS', 'BRA_AUS', 'JPN_DEU', 'IRN_MNG']) {
  out[p] = await page.evaluate(([a, c]) => { window.EarthInteractive.compareKeys(a, c); const s = document.getElementById('compare-bar').style; return [s.getPropertyValue('--ca'), s.getPropertyValue('--cb'), document.querySelector('.cmp-ratio').textContent.trim()]; }, p.split('_'));
}
fs.writeFileSync(S + '/raw/hex.json', JSON.stringify(out, null, 1)); console.log(out);
await b.close();
