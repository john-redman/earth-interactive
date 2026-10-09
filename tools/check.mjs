/**
 * Fast sanity checks — run locally with `npm run check`, and in CI.
 *  1. every JS module parses
 *  2. the generated data loads and is internally consistent
 *  3. index.html modulepreloads every module the app imports (so the browser fetches them all at once)
 *  4. the service worker's offline list (sw.js CORE) exists file by file and covers that module graph
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = msg => { failed++; console.error('✗ ' + msg); };

// 1. syntax
const files = [...fs.readdirSync(path.join(root, 'js'), { recursive: true }).map(f => path.join('js', f)), 'tools/build-data.mjs', 'tools/build-ocean.mjs', 'tools/views.config.mjs']
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

// 3. modulepreload list = the static import graph of js/main.js
const graph = new Set();
const resolve = (from, s) => (s === 'three' ? 'vendor/three/three.module.min.js' : s.startsWith('three/addons/') ? 'vendor/three/' + s.slice(13) : path.posix.normalize(path.posix.join(path.posix.dirname(from), s)));
(function walk(f) {
  if (graph.has(f)) return; graph.add(f);
  const src = fs.readFileSync(path.join(root, f), 'utf8'), re = /^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;
  for (let m; (m = re.exec(src));) walk(resolve(f, m[1] || m[2]));
})('js/main.js');
graph.delete('js/main.js');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const preloaded = new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m => m[1]));
for (const f of graph) if (!preloaded.has(f)) fail(`index.html: add <link rel="modulepreload" href="${f}">`);
for (const f of preloaded) if (!graph.has(f)) fail(`index.html: ${f} is preloaded but no longer imported`);
console.log(`✓ ${graph.size} modules preloaded`);

// 4. sw.js CORE: one missing file and cache.addAll() rejects, so the service worker never installs (and nothing says
//    so); every module of the graph, the data and the stylesheet must be in it for the globe to work offline
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const core = [...(sw.match(/const CORE = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([^']+)'/g)].map(m => m[1]);
if (!core.length) fail('sw.js: CORE list not found');
for (const f of core) if (f !== './' && !fs.existsSync(path.join(root, f))) fail(`sw.js CORE lists ${f}, which does not exist (the service worker would never install)`);
for (const f of [...graph, 'js/main.js', 'index.html', 'css/style.css', 'data/world.js', 'data/ocean.png']) if (!core.includes(f)) fail(`sw.js CORE: add '${f}' (needed offline)`);
console.log(`✓ offline cache: ${core.length} files, all present`);

if (failed) { console.error(`\n${failed} problem(s)`); process.exit(1); }
