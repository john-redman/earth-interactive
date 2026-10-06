/**
 * Pins World Bank WDI population + GDP into worldbank-wdi-<yyyy-mm>.json (run by hand, never by the build).
 *   node tools/sources/pin-wdi.mjs <SP.POP.TOTL.csv> <NY.GDP.MKTP.CD.csv> <out.json> [popVia] [gdpVia]
 * Each CSV may be the World Bank bulk download (API_<indicator>_DS2_en_csv_v2_*.csv, one column per year)
 * or the long "Country Name,Country Code,Year,Value" layout of github.com/datasets/{population,gdp}.
 * Keeps the latest non-null year per economy and drops regional / income aggregates.
 */
import fs from 'node:fs';

const [popCsv, gdpCsv, outFile, popVia = popCsv, gdpVia = gdpCsv] = process.argv.slice(2);
if (!outFile) { console.error('usage: pin-wdi.mjs <pop.csv> <gdp.csv> <out.json> [popVia] [gdpVia]'); process.exit(1); }

const AGG = new Set(['AFE', 'AFW', 'ARB', 'CEB', 'CSS', 'EAP', 'EAR', 'EAS', 'ECA', 'ECS', 'EMU', 'EUU', 'FCS', 'HIC', 'HPC', 'IBD', 'IBT', 'IDA', 'IDB', 'IDX', 'INX', 'LAC', 'LCN', 'LDC', 'LIC', 'LMC', 'LMY', 'LTE', 'MEA', 'MIC', 'MNA', 'NAC', 'OEC', 'OED', 'OSS', 'PRE', 'PSS', 'PST', 'SAS', 'SSA', 'SSF', 'SST', 'TEA', 'TEC', 'TLA', 'TMN', 'TSA', 'TSS', 'UMC', 'WLD']);
const csvRow = l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
const lines = f => fs.readFileSync(f, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);

const data = {};
function put(code, name, field, year, v) {
  if (AGG.has(code) || !Number.isFinite(v)) return;
  const d = (data[code] ??= { name });
  if (!d[field] || year > d[field][0]) d[field] = [year, Math.round(v)];
}
function load(file, field) {
  const L = lines(file);
  const hi = L.findIndex(l => l.startsWith('"Country Name"') || l.startsWith('Country Name'));
  const H = csvRow(L[hi]);
  for (const l of L.slice(hi + 1)) {
    const r = csvRow(l);
    if (H[2] === 'Year') { if (r[3] !== '') put(r[1], r[0], field, +r[2], +r[3]); continue; }
    for (let i = 4; i < H.length; i++) if (/^\d{4}$/.test(H[i]) && r[i]) put(r[1], data[r[1]]?.name ?? r[0], field, +H[i], +r[i]);
  }
}
load(popCsv, 'pop');
load(gdpCsv, 'gdp');

const sorted = Object.fromEntries(Object.keys(data).sort().map(k => [k, data[k]]));
const out = {
  source: 'World Bank, World Development Indicators',
  licence: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
  retrieved: new Date().toISOString().slice(0, 10),
  note: 'Latest non-null year per economy: pop = [year, people], gdp = [year, current US$]. Aggregates removed.',
  indicators: {
    'SP.POP.TOTL': { name: 'Population, total', via: popVia },
    'NY.GDP.MKTP.CD': { name: 'GDP (current US$)', via: gdpVia },
  },
  data: sorted,
};
fs.writeFileSync(outFile, JSON.stringify(out).replace(/\},"/g, '},\n"') + '\n');
console.log(`${Object.keys(sorted).length} economies → ${outFile}`);
