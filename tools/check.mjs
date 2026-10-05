/**
 * Fast sanity checks — run locally with `npm run check`, and in CI.
 *  1. every JS module parses
 *  2. the generated data loads and is internally consistent
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = msg => { failed++; console.error('✗ ' + msg); };

// 1. syntax
const files = [...fs.readdirSync(path.join(root, 'js'), { recursive: true }).map(f => path.join('js', f)), 'tools/build-data.mjs', 'tools/views.config.mjs']
  .filter(f => /\.(m?js)$/.test(f));
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); }
  catch (e) { fail(`${f} does not parse:\n${e.stderr}`); }
}
console.log(`✓ ${files.length} modules parse`);

// 2. data
const { default: data } = await import(path.join(root, 'data/world.js'));
for (const [k, v] of Object.entries(data.views)) {
  if (!v.units.length) fail(`view ${k} has no units`);
  for (const u of v.units) {
    if (!data.geoms[u.g]) fail(`view ${k}: unit ${u.k} points at missing geometry ${u.g}`);
    if (!data.info[u.k]) fail(`view ${k}: unit ${u.k} has no info record`);
  }
}
if (!data.views[data.defaultView]) fail(`default view "${data.defaultView}" missing`);
const keys = new Set(Object.keys(data.info));
for (const [k, i] of Object.entries(data.info)) for (const b of i.borders || []) if (!keys.has(b)) fail(`${k} borders unknown ${b}`);
console.log(`✓ data: ${Object.keys(data.views).length} views, ${data.geoms.length} geometries, ${keys.size} info records`);

if (failed) { console.error(`\n${failed} problem(s)`); process.exit(1); }
