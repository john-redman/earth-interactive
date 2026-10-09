/**
 * Builds the crawlable, no-JavaScript pages around the globe:
 *   about.html, how-to-play.html, … (copied from the repo root, with the shared head/header/footer)
 *   countries/index.html, countries/<slug>/index.html   one page per country (+ a few big territories)
 *   countries/region/<slug>/                           continent and subregion hubs (lists + totals)
 *   countries/ranking/<slug>/                          full rankings: area, population, density
 *   compare/index.html,   compare/<a>-vs-<b>/index.html  a curated set of size comparisons
 *   404.html, sitemap.xml, robots.txt, llms.txt, <IndexNow key>.txt
 *
 * Usage:
 *   node tools/build-pages.mjs <outDir>              generated pages only (CI: the app is already in _site)
 *   node tools/build-pages.mjs dist-pages --with-app also copies the app, for a local preview
 *   node tools/build-pages.mjs dist-pages --indexnow  builds, then submits every URL to IndexNow (run after a
 *                                                    deploy; needs SITE.indexNowKey and network access)
 *   node tools/build-pages.mjs --sync                rewrites the shared head/header/footer of the
 *                                                    hand-written pages in the repo root, then exits
 *
 * No dependencies. Reads data/world.js and tools/site.config.mjs. Generated pages are never committed.
 * Slugs are URLs: once published, don't rename them (see SLUG_NAME below).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SITE } from './site.config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SYNC = args.includes('--sync');
const WITH_APP = args.includes('--with-app');
const INDEXNOW = args.includes('--indexnow');
const outDir = path.resolve(args.find(a => !a.startsWith('--')) || path.join(root, 'dist-pages'));

/** Hand-written pages in the repo root that get the shared head/header/footer. */
const STATIC_PAGES = [
  { file: 'about.html', type: 'AboutPage' },
  { file: 'how-to-play.html', type: 'WebPage' },
  { file: 'why-maps-lie.html', type: 'Article' },
  { file: 'privacy.html', type: 'WebPage' },
  { file: 'terms.html', type: 'WebPage' },
  { file: 'contact.html', type: 'ContactPage' },
];
/** The app files the Pages workflow publishes (used only with --with-app). */
const APP_FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'og-image.png', 'css', 'js', 'data', 'vendor', 'icons', 'sounds', 'LICENSE', 'THIRD_PARTY_NOTICES.md'];

// ───────────── consistency with the browser copies of the config ─────────────
const fail = msg => { console.error('✗ ' + msg); process.exit(1); };
if (!SITE.url.endsWith('/')) fail('SITE.url in tools/site.config.mjs must end with a slash');
{
  const siteJs = fs.readFileSync(path.join(root, 'js/site.js'), 'utf8');
  const m = siteJs.match(/SITE_URL\s*=\s*'([^']*)'/);
  if (!m || m[1] !== SITE.url) fail(`js/site.js SITE_URL (${m?.[1]}) differs from tools/site.config.mjs url (${SITE.url}). Change both together.`);
  const an = fs.readFileSync(path.join(root, 'js/analytics.js'), 'utf8').match(/GOATCOUNTER_CODE\s*=\s*'([^']*)'/);
  if (!an || an[1] !== SITE.goatcounter) fail(`js/analytics.js GOATCOUNTER_CODE (${an?.[1]}) differs from tools/site.config.mjs goatcounter (${SITE.goatcounter}). Change both together.`);
}

// ───────────── formatting ─────────────
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const int = new Intl.NumberFormat('en-US');
const fmtInt = n => int.format(Math.round(n));
const SQMI = 0.386102;
/** Whole numbers, except tiny areas (Vatican City 0.44 km², Monaco 2.02 km²) that would round to 0 or lose meaning. */
const fmtSmall = n => (n < 10 ? String(+n.toFixed(2)) : fmtInt(n));
const fmtKm2 = km2 => `${fmtSmall(km2)} km²`;
const fmtArea = km2 => `${fmtSmall(km2)} km² (${fmtSmall(km2 * SQMI)} sq mi)`;
const fmtPeople = n => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} billion` : n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} million` : fmtInt(n));
const fmtGdp = md => (md >= 1e6 ? `$${(md / 1e6).toFixed(2)} trillion` : md >= 1e3 ? `$${(md / 1e3).toFixed(1)} billion` : `$${fmtInt(md)} million`);
const fmtDensity = d => (d < 1 ? 'under 1' : d < 10 ? d.toFixed(1).replace(/\.0$/, '') : fmtInt(d));
const poss = s => s + (s.endsWith('s') ? "'" : "'s");
const times = r => (r >= 100 ? fmtInt(r) : r >= 10 ? String(Math.round(r)) : r.toFixed(1).replace(/\.0$/, ''));
const pct = r => `${Math.round((r - 1) * 100)}%`;
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const ordWord = n => (n === 1 ? '' : ord(n) + ' ');
const latStr = lat => `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'}`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const listText = xs => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1));
const noEmoji = s => String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const prettyDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

const TODAY = new Date().toISOString().slice(0, 10);
function gitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out || TODAY;
  } catch { return TODAY; }
}
/** Date a file was first committed (for datePublished). */
function gitFirstDate(file) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--follow', '--format=%cs', '--', file], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n').at(-1);
    return out || gitDate(file);
  } catch { return gitDate(file); }
}
const DATA_DATE = gitDate('data/world.js');
/** Generated pages change when the data or the template changes: that date is their lastmod / dateModified. */
const PAGE_DATE = [DATA_DATE, gitDate('tools/build-pages.mjs')].sort().at(-1);

// ───────────── data ─────────────
const { default: data } = await import(pathToFileURL(path.join(root, 'data/world.js')).href);
const info = data.info;
const defView = data.views[data.defaultView];
const defUnit = new Map(defView.units.map(u => [u.k, u]));
const unUnit = new Map((data.views.un || defView).units.map(u => [u.k, u]));

/** Friendlier names than Natural Earth's for titles, slugs and sentences. Changing one changes a URL. */
const SLUG_NAME = {
  USA: 'United States', CHN: 'China', COD: 'DR Congo', COG: 'Republic of the Congo', GMB: 'Gambia', BHS: 'Bahamas',
  CYN: 'Northern Cyprus', FSM: 'Micronesia', VIR: 'US Virgin Islands',
};
/** More precise status wording than the generic "territory of …". */
const STATUS = {
  HKG: 'a special administrative region of China', MAC: 'a special administrative region of China',
  GRL: 'an autonomous territory within the Kingdom of Denmark', FRO: 'an autonomous territory within the Kingdom of Denmark',
  ABW: 'a constituent country of the Kingdom of the Netherlands', CUW: 'a constituent country of the Kingdom of the Netherlands',
  SXM: 'a constituent country of the Kingdom of the Netherlands', ALD: 'an autonomous region of Finland',
  JEY: 'a British Crown Dependency', GGY: 'a British Crown Dependency', IMN: 'a British Crown Dependency',
  IOT: 'a British Overseas Territory', FLK: 'a British Overseas Territory',
  PRI: 'an unincorporated territory of the United States', GUM: 'an unincorporated territory of the United States',
  VIR: 'an unincorporated territory of the United States', PYF: 'an overseas collectivity of France', NCL: 'a special collectivity of France',
  ATA: 'a continent governed under the Antarctic Treaty, with no permanent population',
};
const THE = /^(United |Republic of|Central African|Dominican Republic|Czech Republic|Netherlands|Philippines|Maldives|Comoros|Seychelles|Gambia|Bahamas|Isle of Man|US Virgin|.* Islands$)/;

const nameOf = k => SLUG_NAME[k] || info[k]?.name || defUnit.get(k)?.n || k;
/** Name as used inside a sentence ("the United Kingdom"); start=true capitalises. */
const nm = (k, start = false) => { const n = nameOf(k); const s = THE.test(n) ? 'the ' + n : n; return start ? cap(s) : s; };
const slugify = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Area in km²: the official figure unless the mapped shape is very different (then the mapped one, e.g. where the
 * "official" figure belongs to a parent country). Small places (< 20,000 km²) always use the official figure: at
 * 1:50m, islands and city-states are drawn far too small or too big (Maldives 67 km² mapped vs 300 real, Monaco 12 vs 2).
 */
function areaOf(k) {
  const mapped = (unUnit.get(k) || defUnit.get(k))?.area || 0;
  const off = info[k]?.areaOfficial;
  if (off && off < 20000) return off;
  return off && mapped && off / mapped < 2 && off / mapped > 0.5 ? off : mapped || off || 0;
}

// Pages: every country / limited-recognition unit of the default view (not view-specific overlays),
// plus territories with 100,000+ people.
const pageUnits = defView.units.filter(u => info[u.k] && (
  u.t === 'country' || (u.t === 'limited' && u.n === info[u.k].name) || (u.t === 'territory' && (info[u.k].pop || 0) >= 1e5)));
const pageKeys = new Set(pageUnits.map(u => u.k));
const slugs = new Map();
for (const u of pageUnits) {
  const s = slugify(nameOf(u.k));
  if ([...slugs.values()].includes(s)) fail(`duplicate slug ${s} (${u.k}) — add a SLUG_NAME entry`);
  slugs.set(u.k, s);
}

// Ranks, the same set as the app's country card: countries + limited recognition, not Antarctica.
const ranked = defView.units.filter(u => (u.t === 'country' || u.t === 'limited') && u.k !== 'ATA' && info[u.k]).map(u => u.k);
const rankBy = get => { const list = ranked.filter(k => get(k) > 0).sort((a, b) => get(b) - get(a)); return { n: list.length, list, at: new Map(list.map((k, i) => [k, i + 1])) }; };
const R = { area: rankBy(areaOf), pop: rankBy(k => info[k].pop || 0) };
const popOf = k => (info[k].within ? 0 : info[k].pop || 0); // for totals: Northern Cyprus and Somaliland are inside their parents' figures
const worldPop = ranked.reduce((s, k) => s + popOf(k), 0);
const worldArea = ranked.reduce((s, k) => s + areaOf(k), 0);
const worldDensity = worldPop / worldArea;

// ───────────── regions: continent + subregion hubs ─────────────
// Natural Earth files a few island states under "Seven seas (open ocean)", and Cyprus under Asia while its
// subregion is Southern Europe. A unit's continent is therefore the usual continent of its subregion.
const SEVEN_SEAS = /^Seven seas/;
const subCont = new Map();
{
  const votes = new Map();
  for (const i of Object.values(info)) {
    if (!i.subregion || !i.continent || SEVEN_SEAS.test(i.continent)) continue;
    const m = votes.get(i.subregion) || new Map();
    m.set(i.continent, (m.get(i.continent) || 0) + 1);
    votes.set(i.subregion, m);
  }
  for (const [sub, m] of votes) subCont.set(sub, [...m].sort((x, y) => y[1] - x[1])[0][0]);
}
const continentOf = k => { const i = info[k]; return subCont.get(i.subregion) || (SEVEN_SEAS.test(i.continent || '') ? null : i.continent) || null; };
/** Hubs: continents with 2+ pages, subregions with 3+ pages (unless the subregion is the whole continent). */
const regions = new Map(); // name → { name, slug, kind, keys, parent }
for (const k of pageKeys) {
  const c = continentOf(k);
  if (!c) continue;
  if (!regions.has(c)) regions.set(c, { name: c, kind: 'continent', keys: [], parent: null });
  regions.get(c).keys.push(k);
}
for (const k of pageKeys) {
  const sub = info[k].subregion, c = continentOf(k);
  if (!sub || !c || sub === c || regions.get(sub)?.kind === 'continent') continue;
  if (!regions.has(sub)) regions.set(sub, { name: sub, kind: 'subregion', keys: [], parent: c });
  regions.get(sub).keys.push(k);
}
for (const [n, r] of regions) if (r.keys.length < (r.kind === 'continent' ? 2 : 3)) regions.delete(n);
for (const r of regions.values()) r.slug = slugify(r.name);
const regionUrl = r => `${SITE.url}countries/region/${r.slug}/`;
/** The most specific hub a page belongs to (subregion, else continent), and its continent hub. */
function hubsOf(k) {
  const c = regions.get(continentOf(k)) || null;
  const s = regions.get(info[k].subregion);
  return { cont: c, sub: s && s.kind === 'subregion' ? s : null };
}
/** Dependent territories (Greenland, Hong Kong…), as opposed to sovereign or limited-recognition states. */
const isTerr = k => !!info[k].sovereign && defUnit.get(k)?.t !== 'limited';
/** "8 countries", "16 countries and 2 territories" */
const whatOf = keys => { const t = keys.filter(isTerr).length, c = keys.length - t; return [c && `${c} ${c === 1 ? 'country' : 'countries'}`, t && `${t} ${t === 1 ? 'territory' : 'territories'}`].filter(Boolean).join(' and '); };
const regionName = (r, start = false) => (/^Caribbean$/.test(r.name) ? (start ? 'The ' : 'the ') + r.name : r.name);
const RESERVED = ['region', 'ranking'];
for (const r of RESERVED) if ([...slugs.values()].includes(r)) fail(`a country slug collides with countries/${r}/`);

// ───────────── rankings ─────────────
const densityOf = k => (info[k].pop && areaOf(k) > 0 ? info[k].pop / areaOf(k) : 0);
R.density = rankBy(densityOf);
const RANKINGS = [
  { slug: 'largest-countries', short: 'Largest by area', by: 'area', h1: 'Largest countries in the world by area',
    title: 'Largest countries in the world by area: full list' },
  { slug: 'most-populous-countries', short: 'Most populous', by: 'pop', h1: 'Countries by population',
    title: 'Most populous countries in the world: full list' },
  { slug: 'population-density', short: 'Population density', by: 'density', h1: 'Countries by population density',
    title: 'Most densely populated countries: people per km²' },
];
const rankingHref = (by, base) => `${base}countries/ranking/${RANKINGS.find(r => r.by === by).slug}/`;

// ───────────── geometry: Mercator stretch, mainland centre ─────────────
const DEG = Math.PI / 180;
const MAXLAT = 85;
function decode(enc, p) {
  return enc.map(poly => poly.map(ring => { const out = []; let x = 0, y = 0; for (let i = 0; i < ring.length; i += 2) { x += ring[i]; y += ring[i + 1]; out.push([x / p, y / p]); } return out; }));
}
const mercY = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-MAXLAT, Math.min(MAXLAT, lat)) * DEG / 2));
function ringStats(ring) {
  let eq = 0, me = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j], [x1, y1] = ring[i];
    const a = x0 * DEG, b = x1 * DEG, s0 = Math.sin(y0 * DEG), s1 = Math.sin(y1 * DEG);
    const cr = a * s1 - b * s0;           // shoelace in Lambert equal-area (λ, sin φ)
    eq += cr; cx += (a + b) * cr; cy += (s0 + s1) * cr;
    me += a * mercY(y1) - b * mercY(y0);  // shoelace in Mercator (λ, ln tan(π/4 + φ/2))
  }
  return { eq: eq / 2, me: me / 2, cx: cx / (3 * eq), cy: cy / (3 * eq) };
}
const geoCache = new Map();
/** { stretch: Mercator area ÷ true area, lat, lon: centre of the largest landmass } */
function geoOf(k) {
  if (geoCache.has(k)) return geoCache.get(k);
  const u = unUnit.get(k) || defUnit.get(k);
  let eq = 0, me = 0, best = null;
  for (const poly of decode(data.geoms[u.g], data.precision)) {
    let pe = 0, pm = 0;
    poly.forEach((ring, i) => { const s = ringStats(ring); const sign = i === 0 ? 1 : -1; pe += sign * Math.abs(s.eq); pm += sign * Math.abs(s.me); if (i === 0) poly.c = s; });
    eq += pe; me += pm;
    if (!best || pe > best.pe) best = { pe, c: poly.c };
  }
  const g = { stretch: me / eq, lat: Math.asin(Math.max(-1, Math.min(1, best.c.cy))) / DEG, lon: best.c.cx / DEG };
  geoCache.set(k, g);
  return g;
}
function kmBetween(a, b) {
  const A = geoOf(a), B = geoOf(b);
  const h = Math.sin((B.lat - A.lat) * DEG / 2) ** 2 + Math.cos(A.lat * DEG) * Math.cos(B.lat * DEG) * Math.sin((B.lon - A.lon) * DEG / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}
const mercOk = k => k !== 'ATA' && Math.abs(geoOf(k).lat) < 75;

// ───────────── comparison pairs ─────────────
/** Well-known pairs, subject first. Pairs with a key missing from the data are skipped. */
const FAMOUS = [
  ['GRL', 'COD'], ['GRL', 'DZA'], ['GRL', 'IND'], ['GRL', 'AUS'], ['GRL', 'MEX'], ['GRL', 'SAU'], ['GRL', 'USA'], ['GRL', 'BRA'],
  ['RUS', 'CAN'], ['RUS', 'USA'], ['RUS', 'CHN'], ['RUS', 'AUS'], ['RUS', 'BRA'], ['RUS', 'ATA'],
  ['CAN', 'USA'], ['CAN', 'CHN'], ['AUS', 'USA'], ['AUS', 'BRA'], ['AUS', 'CHN'], ['AUS', 'IND'], ['ATA', 'AUS'], ['ATA', 'USA'],
  ['IND', 'USA'], ['IND', 'CHN'], ['BRA', 'USA'], ['CHN', 'USA'], ['MEX', 'USA'], ['IDN', 'USA'], ['ARG', 'IND'], ['KAZ', 'IND'],
  ['GBR', 'USA'], ['GBR', 'AUS'], ['GBR', 'CAN'], ['GBR', 'FRA'], ['GBR', 'DEU'], ['GBR', 'JPN'], ['GBR', 'NZL'], ['GBR', 'ITA'],
  ['GBR', 'ESP'], ['GBR', 'IND'], ['GBR', 'NGA'], ['GBR', 'UKR'], ['IRL', 'GBR'], ['ISL', 'IRL'],
  ['JPN', 'DEU'], ['JPN', 'USA'], ['JPN', 'ITA'], ['JPN', 'CAN'], ['JPN', 'AUS'], ['JPN', 'NZL'], ['KOR', 'PRK'], ['TWN', 'NLD'],
  ['FRA', 'USA'], ['FRA', 'BRA'], ['FRA', 'AUS'], ['DEU', 'USA'], ['ITA', 'USA'], ['ESP', 'USA'], ['NZL', 'AUS'],
  ['NZL', 'ITA'], ['MDG', 'FRA'], ['NGA', 'USA'], ['EGY', 'USA'], ['ZAF', 'USA'], ['PHL', 'ITA'], ['VNM', 'ITA'], ['NOR', 'GBR'],
  ['UKR', 'USA'], ['ISR', 'USA'], ['NLD', 'USA'], ['CHE', 'USA'], ['SGP', 'USA'], ['VAT', 'ITA'], ['LUX', 'USA'], ['CUB', 'GBR'],
];
const MAX_PAIRS = 150;
const pairs = [];
const pairKey = (a, b) => [a, b].sort().join('|');
const pairSeen = new Map();
function addPair(a, b, kind) {
  if (!pageKeys.has(a) || !pageKeys.has(b) || a === b || pairSeen.has(pairKey(a, b)) || pairs.length >= MAX_PAIRS) return;
  const p = { a, b, kind, slug: `${slugs.get(a)}-vs-${slugs.get(b)}` };
  pairs.push(p); pairSeen.set(pairKey(a, b), p);
}
for (const [a, b] of FAMOUS) addPair(a, b, 'famous');
// Each sizeable country vs its largest neighbour (the smaller one first), most populous first.
const withNeighbours = ranked.filter(k => pageKeys.has(k) && (info[k].pop || 0) >= 1e6 && (info[k].borders || []).some(b => pageKeys.has(b)))
  .sort((x, y) => info[y].pop - info[x].pop);
for (const k of withNeighbours) {
  const nb = info[k].borders.filter(b => pageKeys.has(b)).sort((x, y) => areaOf(y) - areaOf(x))[0];
  const [a, b] = areaOf(k) <= areaOf(nb) ? [k, nb] : [nb, k];
  addPair(a, b, 'neighbours');
}
const findPair = (a, b) => pairSeen.get(pairKey(a, b)) || null;

// ───────────── shared page chrome ─────────────
const sitePath = new URL(SITE.url).pathname; // e.g. /earth-interactive/
const contactHref = SITE.contactEmail ? `mailto:${SITE.contactEmail}` : SITE.issuesUrl;
const contactText = SITE.contactEmail || 'GitHub issues';
const analytics = SITE.goatcounter
  ? `<script data-goatcounter="https://${esc(SITE.goatcounter)}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>` : '';
const kofiLink = (text = 'Support') => (SITE.kofi ? `<a href="https://ko-fi.com/${esc(SITE.kofi)}" rel="noopener">${text}</a>` : '');

const OG_ALT = 'A 3D globe with colourful country borders over Africa and Europe';
function headTags({ title, description, canonical, base, jsonld, type = 'website' }) {
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="robots" content="max-image-preview:large">
  <meta name="theme-color" content="#03040b">
  <link rel="icon" href="${base}icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${base}icons/apple-touch-icon.png">
  <link rel="stylesheet" href="${base}css/pages.css">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${esc(SITE.name)}">
  <meta property="og:locale" content="en_GB">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${SITE.url}og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(OG_ALT)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE.url}og-image.png">
  <script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>${analytics ? '\n  ' + analytics : ''}`;
}

function header(base) {
  const home = base || './';
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="logo" href="${home}"><span class="logo-mark" aria-hidden="true"></span>${esc(SITE.name)}</a>
    <nav class="site-nav" aria-label="Main">
      <a href="${base}countries/">Countries</a>
      <a href="${base}compare/">Comparisons</a>
      <a href="${base}why-maps-lie.html">Why maps lie</a>
    </nav>
    <a class="btn" href="${home}">Open the globe</a>
  </header>`;
}

function footer(base) {
  return `<footer class="site-footer">
    <nav class="footer-links" aria-label="Site">
      <a href="${base || './'}">Globe</a>
      <a href="${base}about.html">About</a>
      <a href="${base}how-to-play.html">How to play</a>
      <a href="${base}why-maps-lie.html">Why maps lie</a>
      <a href="${base}countries/">Countries</a>
      <a href="${base}compare/">Comparisons</a>
      <a href="${base}privacy.html">Privacy</a>
      <a href="${base}terms.html">Terms</a>
      <a href="${base}contact.html">Contact</a>
      <a href="https://www.youtube.com/watch?v=pvuN_WvF1to" target="_blank" rel="noopener" title="Lil Dicky, Earth (music video on YouTube)">We love the Earth ↗</a>
      ${kofiLink()}
    </nav>
    <p class="fine">© ${new Date().getFullYear()} ${esc(SITE.name)}. Borders: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain).
      Country facts: <a href="https://github.com/mledoze/countries">mledoze/countries</a>, under the <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>.
      Population and GDP: <a href="https://data.worldbank.org/">World Bank</a> (CC BY 4.0).
      Flags: <a href="https://github.com/lipis/flag-icons">flag-icons</a> (MIT).</p>
  </footer>`;
}

function page({ title, description, canonical, base, jsonld, body, type }) {
  return `<!doctype html>
<html lang="en">
<head>
  ${headTags({ title, description, canonical, base, jsonld, type })}
</head>
<body>
  ${header(base)}
  <main id="main" class="page">
${body}
  </main>
  ${footer(base)}
</body>
</html>
`;
}

const WEBSITE = { '@type': 'WebSite', '@id': SITE.url + '#website', name: SITE.name, url: SITE.url, inLanguage: 'en', publisher: { '@type': 'Person', name: SITE.operator } };
const crumbs = items => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
});
const flag = (k, base, cls = 'flag', size = [40, 30]) => {
  const lazy = cls.includes('sm') ? 'lazy' : 'eager'; // hero flags are above the fold
  const iso = info[k]?.iso2;
  if (!iso || !fs.existsSync(path.join(root, 'vendor/flags', iso.toLowerCase() + '.svg'))) return `<span class="${cls} noflag" aria-hidden="true"></span>`;
  return `<img class="${cls}" src="${base}vendor/flags/${iso.toLowerCase()}.svg" alt="" width="${size[0]}" height="${size[1]}" loading="${lazy}" decoding="async">`;
};
const breadcrumb = items => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([n, href]) => `<li>${href ? `<a href="${href}">${esc(n)}</a>` : `<span aria-current="page">${esc(n)}</span>`}</li>`).join('')}</ol></nav>`;
const sources = `<p class="sources">Sources: ${esc(data.source || 'Natural Earth · mledoze/countries (ODbL)')}. Areas are official figures where available, otherwise measured from the map.
      Population and GDP are estimates for the year shown. Data last updated ${prettyDate(DATA_DATE)}.</p>`;

// ───────────── writing ─────────────
const written = []; // { rel, lastmod }
function write(rel, html, lastmod = PAGE_DATE) {
  const file = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (!/404\.html$/.test(rel)) written.push({ rel: rel.replace(/(^|\/)index\.html$/, '$1'), lastmod });
}

/** Apply the config to a hand-written page: shared regions, contact links, the Ko-fi link. */
function applySite(html, { file, type } = {}) {
  if (file) {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
    if (!title || !description) fail(`${file}: needs a <title> and a <meta name="description"> outside the site:head region`);
    const canonical = SITE.url + file;
    const unq = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const main = { '@type': type, '@id': canonical, url: canonical, name: unq(title), description: unq(description), isPartOf: { '@id': WEBSITE['@id'] } };
    if (type === 'Article') Object.assign(main, { headline: unq(title).replace(/ \| .*$/, ''), author: { '@type': 'Person', name: SITE.operator }, datePublished: gitFirstDate(file), dateModified: gitDate(file), image: SITE.url + 'og-image.png', inLanguage: 'en' });
    const jsonld = { '@context': 'https://schema.org', '@graph': [WEBSITE, main] };
    const shared = headTags({ title: unq(title), description: unq(description), canonical, base: '', jsonld, type: type === 'Article' ? 'article' : 'website' })
      .replace(/^<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*<title>[^<]*<\/title>\s*<meta name="description"[^>]*>\s*/, '');
    const region = (name, content) => {
      const re = new RegExp(`(<!--site:${name}-->)[\\s\\S]*?(<!--/site:${name}-->)`);
      if (!re.test(html)) fail(`${file}: missing <!--site:${name}--> … <!--/site:${name}--> markers`);
      html = html.replace(re, `$1\n  ${content}\n  $2`);
    };
    region('head', shared);
    region('header', header(''));
    region('footer', footer(''));
  }
  if (file) html = html.replace(/(<time data-site="modified")[^>]*>[^<]*<\/time>/g, (_, t) => `${t} datetime="${gitDate(file)}">${prettyDate(gitDate(file))}</time>`);
  html = html.replace(/<a data-site="contact"[^>]*>[\s\S]*?<\/a>/g, `<a data-site="contact" href="${esc(contactHref)}">${esc(contactText)}</a>`);
  html = html.replace(/<a data-site="kofi"[^>]*>([\s\S]*?)<\/a>/g, (_, t) => (SITE.kofi ? `<a data-site="kofi" href="https://ko-fi.com/${esc(SITE.kofi)}" rel="noopener">${t}</a>` : `<a data-site="kofi" href="https://ko-fi.com/" hidden>${t}</a>`));
  html = html.replace(/(data-site="kofi-block")( hidden)?/g, SITE.kofi ? '$1' : '$1 hidden');
  return html;
}

if (SYNC) {
  for (const p of STATIC_PAGES) {
    const f = path.join(root, p.file);
    fs.writeFileSync(f, applySite(fs.readFileSync(f, 'utf8'), p).replace(/\n {2}<script data-goatcounter[^\n]*/, ''));
  }
  console.log(`✓ synced head/header/footer of ${STATIC_PAGES.length} pages`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
if (WITH_APP) {
  for (const f of APP_FILES) fs.cpSync(path.join(root, f), path.join(outDir, f), { recursive: true });
}
// The app page (copied by the workflow or --with-app): fill in the Ko-fi link.
const indexOut = path.join(outDir, 'index.html');
if (fs.existsSync(indexOut)) fs.writeFileSync(indexOut, applySite(fs.readFileSync(indexOut, 'utf8')));
written.push({ rel: '', lastmod: gitDate('index.html') });

for (const p of STATIC_PAGES) {
  const html = applySite(fs.readFileSync(path.join(root, p.file), 'utf8'), p);
  write(p.file, html, gitDate(p.file));
}
fs.mkdirSync(path.join(outDir, 'css'), { recursive: true });
fs.copyFileSync(path.join(root, 'css/pages.css'), path.join(outDir, 'css/pages.css'));

// ───────────── country pages ─────────────
const BASE2 = '../../';
const countryUrl = k => `${SITE.url}countries/${slugs.get(k)}/`;
const cLink = (k, base = BASE2) => (pageKeys.has(k) ? `<a href="${base}countries/${slugs.get(k)}/">${esc(nameOf(k))}</a>` : esc(nameOf(k)));

/** "B is 3.2 times the size of A" style phrase, A and B as keys. */
function sizePhrase(a, b) {
  const A = areaOf(a), B = areaOf(b), r = Math.max(A, B) / Math.min(A, B);
  const [big, small] = A >= B ? [a, b] : [b, a];
  if (r < 1.05) return `${nm(a, true)} and ${nm(b)} are almost exactly the same size`;
  if (r < 1.5) return `${nm(big, true)} is about ${pct(r)} larger than ${nm(small)}`;
  return `${nm(big, true)} is about ${times(r)} times the size of ${nm(small)}`;
}

/** "Western Europe, Europe" with links to the hubs that exist. */
function regionCell(k, base = BASE2) {
  const i = info[k], { cont, sub } = hubsOf(k);
  const link = (r, name) => (r ? `<a href="${base}countries/region/${r.slug}/">${esc(r.name)}</a>` : esc(name));
  const parts = [];
  if (i.subregion && i.subregion !== cont?.name) parts.push(link(sub, i.subregion));
  const c = continentOf(k);
  if (c) parts.push(link(cont, c));
  return parts.join(', ') || null;
}
/** Breadcrumb trail [name, absolute url, relative href] from the countries index down to a hub. */
function hubTrail(r, base) {
  const out = [];
  if (r?.parent && regions.get(r.parent)) { const p = regions.get(r.parent); out.push([p.name, regionUrl(p), `${base}countries/region/${p.slug}/`]); }
  if (r) out.push([r.name, regionUrl(r), `${base}countries/region/${r.slug}/`]);
  return out;
}

function statusSentence(k) {
  const i = info[k], u = defUnit.get(k);
  const where = i.subregion || i.continent;
  const whereTxt = where && k !== 'ATA' ? ` in ${where}` : '';
  if (STATUS[k]) return `${nm(k, true)} is ${STATUS[k]}${k === 'ATA' ? '' : whereTxt}.`;
  if (u.t === 'limited') return `${nm(k, true)} is a state${whereTxt} with limited international recognition.`;
  if (i.sovereign) return `${nm(k, true)} is a territory of ${i.sovereign}${whereTxt}.`;
  if (i.unMember) return `${nm(k, true)} is a sovereign country${whereTxt} and a member of the United Nations.`;
  return `${nm(k, true)} is a country${whereTxt}.`;
}

function mercSentence(k) {
  if (!mercOk(k)) return k === 'ATA'
    ? 'Antarctica cannot be drawn on a Mercator map at all: the projection stretches the poles to infinity, so most world maps cut it off or show a smeared white band.'
    : `${nm(k, true)} lies so far from the equator that a Mercator map blows it up enormously: it is drawn about ${times(geoOf(k).stretch)} times larger than it really is.`;
  const s = geoOf(k).stretch;
  if (s < 1.15) return `${nm(k, true)} lies close to the equator, so on a Mercator world map it appears close to its true size (about ${times(s)}×).`;
  return `On a Mercator world map, the projection most web maps use, ${nm(k)} is drawn about ${times(s)} times larger than its true size because it lies around ${latStr(geoOf(k).lat)}. <a href="${BASE2}why-maps-lie.html">Why maps lie</a>.`;
}

function compareTargets(k) {
  const out = [];
  const add = (b, why) => { if (b && b !== k && pageKeys.has(b) && !out.some(o => o.b === b)) out.push({ b, why }); };
  const near = R.area.list.filter(x => x !== k && pageKeys.has(x)).sort((x, y) => Math.abs(Math.log(areaOf(x) / areaOf(k))) - Math.abs(Math.log(areaOf(y) / areaOf(k))))[0];
  add(near, 'closest in size');
  const nb = (info[k].borders || []).filter(b => pageKeys.has(b)).sort((x, y) => areaOf(y) - areaOf(x))[0];
  add(nb, 'largest neighbour');
  add(k === 'USA' ? 'RUS' : 'USA', 'a familiar yardstick');
  add(k === 'GBR' ? 'FRA' : 'GBR', 'a familiar yardstick');
  return out.slice(0, 4);
}
function compareLink(a, b, base) {
  const p = findPair(a, b);
  return p ? { href: `${base}compare/${p.slug}/`, label: `${nameOf(p.a)} vs ${nameOf(p.b)}`, page: true }
    : { href: `${base}?compare=${a},${b}`, label: `${nameOf(a)} vs ${nameOf(b)}`, page: false };
}

function neighboursAround(list, k, n = 3) {
  const i = list.indexOf(k);
  if (i < 0) return [];
  return list.slice(Math.max(0, i - n), i).concat(list.slice(i + 1, i + 1 + n)).filter(x => pageKeys.has(x));
}

for (const u of pageUnits) {
  const k = u.k, i = info[k], name = nameOf(k), slug = slugs.get(k);
  const area = areaOf(k), aRank = R.area.at.get(k), pRank = R.pop.at.get(k);
  const people = k !== 'ATA'; // Antarctica's figures are seasonal research staff, not a population
  const density = people && i.pop && area > 50 ? i.pop / area : null;
  const nbs = (i.borders || []).filter(b => info[b]).sort((x, y) => areaOf(y) - areaOf(x));
  const facts = [
    ['Official name', i.formal && i.formal !== name ? esc(i.formal) : null],
    ['Capital', i.capital ? esc(i.capital) : null],
    ['Area', `${fmtArea(area)}${aRank ? ` <span class="rank">${ord(aRank)} largest</span>` : ''}`],
    ['Population', people && i.pop ? `${fmtInt(i.pop)}${i.popYear ? ` <span class="muted">(${i.popYear})</span>` : ''}${pRank ? ` <span class="rank">${ord(pRank)} most populous</span>` : ''}` : null],
    ['Density', density ? (density < 1 ? 'Fewer than 1 person per km²' : `${fmtDensity(density)} people per km²`) : null],
    ['Region', regionCell(k)],
    ['Languages', i.languages?.length ? esc(i.languages.join(', ')) : null],
    ['Currency', i.currencies?.length ? esc(i.currencies.join(', ')) : null],
    ['GDP', people && i.gdp && u.t !== 'disputed' ? `${fmtGdp(i.gdp)}${i.gdpYear ? ` <span class="muted">(${i.gdpYear})</span>` : ''}` : null],
    ['GDP per person', people && i.gdp && i.pop ? `$${fmtInt(i.gdp * 1e6 / i.pop)}` : null],
    ['Sovereignty', i.sovereign && u.t !== 'limited' ? esc(i.sovereign) : null],
    ['Landlocked', i.landlocked ? 'Yes' : null],
  ].filter(r => r[1]);

  const hub = hubsOf(k), home = hub.sub || hub.cont;
  const inHub = (by, get) => { if (!home) return ''; const list = home.keys.filter(x => R[by].at.has(x)).filter(x => get(x) > 0).sort((x, y) => get(y) - get(x)); const n = list.indexOf(k) + 1; return n > 0 && list.length > 2 ? { n, of: whatOf(list) } : ''; };
  const hubLink = r => `<a href="${BASE2}countries/region/${r.slug}/">${esc(regionName(r))}</a>`;
  // prose
  const p1 = [statusSentence(k)];
  if (i.capital) p1.push(`Its capital is ${esc(i.capital)}.`);
  if (i.formal && i.formal !== name && i.formal !== i.name) p1.push(`The official name is ${esc(i.formal)}.`);
  const note = noEmoji(u.note);
  const sizeP = [`${nm(k, true)} covers ${fmtArea(area)}${aRank ? `, the <a href="${rankingHref('area', BASE2)}#${slug}">${ordWord(aRank)}largest</a> of the ${R.area.n} countries and territories ranked here` : ''}.`];
  const hA = inHub('area', areaOf);
  if (hA && aRank) sizeP.push(`Within ${hubLink(home)} it is the ${ordWord(hA.n)}largest of ${hA.of}.`);
  const tg = compareTargets(k);
  if (tg[0]) sizeP.push(`The closest in size is ${cLink(tg[0].b)} (${fmtKm2(areaOf(tg[0].b))}). ${sizePhrase(k, tg[0].b)}.`);
  sizeP.push(mercSentence(k));
  const popP = [];
  if (people && i.pop) {
    popP.push(`About ${fmtPeople(i.pop)} people live in ${nm(k)}${i.popYear ? ` (${i.popYear} estimate)` : ''}${pRank ? `, the <a href="${rankingHref('pop', BASE2)}#${slug}">${ordWord(pRank)}largest population</a> of the ${R.pop.n} ranked here` : ''}.`);
    const hP = inHub('pop', x => info[x].pop || 0);
    if (hP && pRank) popP.push(hP.n === 1 ? `No other country in ${esc(regionName(home))} has more people.` : `It has the ${ordWord(hP.n)}largest population of the ${hP.of} in ${esc(regionName(home))}.`);
    if (density) {
      const d = density / worldDensity;
      popP.push(`That is ${density < 1 ? 'fewer than 1 person' : `about ${fmtDensity(density)} people`} per km², ${d > 1.2 ? `${times(d)} times the world average of about ${fmtInt(worldDensity)}` : d < 0.83 ? `well below the world average of about ${fmtInt(worldDensity)}` : `close to the world average of about ${fmtInt(worldDensity)}`}.`);
    }
  }
  const nbP = nbs.length
    ? `${nm(k, true)} shares land borders with ${nbs.length === 1 ? '' : nbs.length + ' countries: '}${listText(nbs.map(b => cLink(b)))}.`
    : `${nm(k, true)} has no land borders${i.landlocked ? '' : ' with other countries'}.`;

  const cmpItems = tg.map(({ b, why }) => {
    const l = compareLink(k, b, BASE2);
    return `<li><a href="${l.href}">${esc(l.label)}</a><span>${sizePhrase(k, b)} (${why}).${l.page ? '' : ' Opens on the globe.'}</span></li>`;
  }).join('\n          ');
  const simArea = neighboursAround(R.area.list, k).map(x => `<li>${flag(x, BASE2, 'flag sm', [24, 18])}${cLink(x)} <span class="muted">${fmtKm2(areaOf(x))}</span></li>`).join('');
  const simPop = neighboursAround(R.pop.list, k).map(x => `<li>${flag(x, BASE2, 'flag sm', [24, 18])}${cLink(x)} <span class="muted">${fmtPeople(info[x].pop)}</span></li>`).join('');

  const title = `${name}: size, population and facts | ${SITE.name}`;
  const description = `${name} covers ${fmtKm2(area)}${aRank ? ` (${ord(aRank)} largest)` : ''}${i.pop ? `, with ${fmtPeople(i.pop)} people` : ''}${i.capital ? `. Capital: ${i.capital}` : ''}. See its true size on a 3D globe.`;
  const canonical = countryUrl(k);
  const placeType = u.t === 'country' && !i.sovereign ? 'Country' : 'AdministrativeArea';
  const trail = hubTrail(home, BASE2);
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    WEBSITE,
    { '@type': 'WebPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] }, dateModified: PAGE_DATE, about: { '@id': canonical + '#place' } },
    { '@type': placeType, '@id': canonical + '#place', name, alternateName: [i.formal, ...(i.alt || [])].filter(x => x && x !== name).slice(0, 4),
      ...(i.wikidata ? { sameAs: `https://www.wikidata.org/wiki/${i.wikidata}` } : {}),
      ...(home ? { containedInPlace: { '@type': 'Place', name: home.name, url: regionUrl(home) } } : {}),
      geo: { '@type': 'GeoCoordinates', latitude: +geoOf(k).lat.toFixed(2), longitude: +geoOf(k).lon.toFixed(2) } },
    crumbs([['Globe', SITE.url], ['Countries', SITE.url + 'countries/'], ...trail.map(([n, u]) => [n, u]), [name, canonical]]),
  ] };
  const body = `    ${breadcrumb([['Globe', BASE2], ['Countries', '../'], ...trail.map(([n, , h]) => [n, h]), [name]])}
    <article>
      <header class="hero">
        ${flag(k, BASE2, 'flag lg', [96, 72]).replace('alt=""', `alt="Flag of ${esc(nm(k))}"`)}
        <div>
          <h1>${esc(name)}</h1>
          <p class="lede">${p1.join(' ')}</p>
        </div>
      </header>
      <p class="cta"><a class="btn" href="${BASE2}?c=${k}">Open ${esc(name)} on the 3D globe</a></p>
      ${note ? `<p class="note">On the globe's De Facto view: ${esc(note)}</p>` : ''}
      <h2>Key facts</h2>
      <dl class="facts">
        ${facts.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('\n        ')}
      </dl>
      <h2>How big is ${esc(nm(k))}?</h2>
      <p>${sizeP.join(' ')}</p>
      ${popP.length ? `<h2>How many people live in ${esc(nm(k))}?</h2>\n      <p>${popP.join(' ')}</p>` : ''}
      <h2>${nbs.length ? `Which countries border ${esc(nm(k))}?` : 'Neighbours'}</h2>
      <p>${nbP}</p>
      <h2>Compare ${esc(nm(k))} with…</h2>
      <ul class="cmp-list">
          ${cmpItems}
      </ul>
      <div class="cols">
        ${simArea ? `<section><h2>Similar in size</h2><ul class="mini">${simArea}</ul></section>` : ''}
        ${simPop ? `<section><h2>Similar population</h2><ul class="mini">${simPop}</ul></section>` : ''}
      </div>
      ${sources}
    </article>`;
  write(`countries/${slug}/index.html`, page({ title, description, canonical, base: BASE2, jsonld, body }));
}

// ───────────── countries index ─────────────
{
  const sorted = [...pageKeys].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'en'));
  const groups = new Map();
  for (const k of sorted) {
    const L = nameOf(k).normalize('NFD').charAt(0).toUpperCase();
    if (!groups.has(L)) groups.set(L, []);
    groups.get(L).push(k);
  }
  const top = (list, fmt) => list.slice(0, 10).map((k, j) => `<li><span class="n">${j + 1}</span>${flag(k, '../', 'flag sm', [24, 18])}${cLink(k, '../')} <span class="muted">${fmt(k)}</span></li>`).join('');
  const title = `All countries A–Z: size, population and facts | ${SITE.name}`;
  const description = `Facts for ${sorted.length} countries and territories: area, population, capital, neighbours and true size compared on a 3D globe.`;
  const canonical = SITE.url + 'countries/';
  const jsonld = { '@context': 'https://schema.org', '@graph': [WEBSITE,
    { '@type': 'CollectionPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] } },
    crumbs([['Globe', SITE.url], ['Countries', canonical]])] };
  const body = `    ${breadcrumb([['Globe', '../'], ['Countries']])}
    <h1>Countries of the world</h1>
    <p class="lede">Size, population, capital and neighbours for ${sorted.length} countries and territories, with links to see each one at its true size on the 3D globe.</p>
    <nav class="az" aria-label="Jump to letter">${[...groups.keys()].map(L => `<a href="#${L}">${L}</a>`).join('')}</nav>
    <div class="cols">
      <section><h2>Largest by area</h2><ol class="mini top">${top(R.area.list, k => fmtKm2(areaOf(k)))}</ol><p class="more"><a href="ranking/largest-countries/">All ${R.area.n} by area</a></p></section>
      <section><h2>Most people</h2><ol class="mini top">${top(R.pop.list, k => fmtPeople(info[k].pop))}</ol><p class="more"><a href="ranking/most-populous-countries/">All ${R.pop.n} by population</a></p></section>
    </div>
    <h2>By region</h2>
    <ul class="regions">${[...regions.values()].filter(r => r.kind === 'continent').sort((a, b) => a.name.localeCompare(b.name)).map(c => `<li><a href="region/${c.slug}/"><b>${esc(c.name)}</b> <span class="muted">${c.keys.length}</span></a>${(() => { const subs = [...regions.values()].filter(r => r.parent === c.name).sort((a, b) => a.name.localeCompare(b.name)); return subs.length ? `<span class="subs">${subs.map(r => `<a href="region/${r.slug}/">${esc(r.name)}</a>`).join(' · ')}</span>` : ''; })()}</li>`).join('')}</ul>
    <p>Rankings: <a href="ranking/largest-countries/">largest by area</a> · <a href="ranking/most-populous-countries/">most populous</a> · <a href="ranking/population-density/">population density</a></p>
    <h2>A–Z</h2>
    ${[...groups].map(([L, ks]) => `<section class="letter" id="${L}" aria-label="${L}"><h3>${L}</h3><ul class="grid">${ks.map(k => `<li><a href="${slugs.get(k)}/">${flag(k, '../', 'flag sm', [24, 18])}<span>${esc(nameOf(k))}</span></a></li>`).join('')}</ul></section>`).join('\n    ')}
    ${sources}`;
  write('countries/index.html', page({ title, description, canonical, base: '../', jsonld, body }));
}

// ───────────── region hubs ─────────────
for (const r of regions.values()) {
  const base = '../../../';
  const keys = [...r.keys].sort((a, b) => areaOf(b) - areaOf(a));
  const ranked = keys.filter(k => R.area.at.has(k));
  const totArea = keys.reduce((s, k) => s + areaOf(k), 0);
  const totPop = keys.reduce((s, k) => s + (k === 'ATA' ? 0 : popOf(k)), 0);
  const byPop = [...ranked].filter(k => info[k].pop).sort((a, b) => info[b].pop - info[a].pop);
  const byDen = [...ranked].filter(k => densityOf(k) > 0 && areaOf(k) > 50).sort((a, b) => densityOf(b) - densityOf(a));
  const what = whatOf(keys), nC = ranked.length;
  const rn = regionName(r), Rn = regionName(r, true);
  const subs = [...regions.values()].filter(x => x.parent === r.name).sort((a, b) => b.keys.reduce((s, k) => s + areaOf(k), 0) - a.keys.reduce((s, k) => s + areaOf(k), 0));
  const parent = r.parent ? regions.get(r.parent) : null;
  const lr = (k, start = false) => (pageKeys.has(k) ? `<a href="${base}countries/${slugs.get(k)}/">${esc(nm(k, start))}</a>` : esc(nm(k, start)));
  const lede = [`${r.kind === 'continent' ? '' : `${esc(Rn)} is a subregion of ${parent ? `<a href="../${parent.slug}/">${esc(parent.name)}</a>` : esc(r.parent)}. `}The ${what} listed here cover ${fmtArea(totArea)} and are home to about ${fmtPeople(totPop)} people, ${Math.round(totPop / worldPop * 1000) / 10}% of the world's population.`];
  const paras = [];
  if (ranked.length > 1) paras.push(`The largest is ${lr(ranked[0])} (${fmtKm2(areaOf(ranked[0]))}) and the smallest is ${lr(ranked.at(-1))} (${fmtKm2(areaOf(ranked.at(-1)))}).${areaOf(ranked[0]) / areaOf(ranked.at(-1)) < 1000 ? ` ${sizePhrase(ranked[0], ranked.at(-1))}.` : ''}`);
  if (byPop.length > 1) paras.push(`${lr(byPop[0], true)} has the most people (${fmtPeople(info[byPop[0]].pop)}), ${Math.round(info[byPop[0]].pop / totPop * 100)}% of the region's total.`);
  if (byDen.length > 2) paras.push(`The most crowded is ${lr(byDen[0])} with ${fmtDensity(densityOf(byDen[0]))} people per km²; the emptiest is ${lr(byDen.at(-1))} with ${densityOf(byDen.at(-1)) < 1 ? 'fewer than 1' : fmtDensity(densityOf(byDen.at(-1)))}. The region as a whole averages ${fmtDensity(totPop / totArea)}, against about ${fmtInt(worldDensity)} for the world.`);
  const mer = ranked.filter(mercOk).map(k => [k, geoOf(k).stretch]).sort((a, b) => b[1] - a[1]);
  if (mer.length > 2 && mer[0][1] / mer.at(-1)[1] > 1.3) paras.push(`Flat maps treat the region unevenly: a Mercator map draws ${lr(mer[0][0])} about ${times(mer[0][1])} times too big, but ${lr(mer.at(-1)[0])} only ${times(mer.at(-1)[1])} times. <a href="${base}why-maps-lie.html">Why maps lie</a>.`);
  const inPairs = pairs.filter(q => r.keys.includes(q.a) && r.keys.includes(q.b)).slice(0, 12);
  const rows = keys.map(k => `<tr><td class="c">${flag(k, base, 'flag sm', [24, 18])}${cLink(k, base)}${isTerr(k) ? ' <span class="muted">(territory)</span>' : ''}</td><td>${fmtKm2(areaOf(k))}</td><td>${k !== 'ATA' && info[k].pop ? fmtPeople(info[k].pop) : '–'}</td><td>${k !== 'ATA' && densityOf(k) && areaOf(k) > 50 ? fmtDensity(densityOf(k)) : '–'}</td><td>${esc(info[k].capital || '–')}</td></tr>`).join('\n          ');
  const label = r.kind === 'continent' ? `Countries in ${r.name}` : `Countries of ${rn}`;
  const title = `${Rn}: countries by size and population | ${SITE.name}`;
  const description = `The ${what} of ${rn} by area, population, density and capital. ${nC > 1 ? `Largest: ${nameOf(ranked[0])}. ` : ''}Total ${fmtKm2(totArea)}, ${fmtPeople(totPop)} people.`;
  const canonical = regionUrl(r);
  const trail = hubTrail(r, base);
  const jsonld = { '@context': 'https://schema.org', '@graph': [WEBSITE,
    { '@type': 'CollectionPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] }, dateModified: PAGE_DATE,
      about: { '@type': 'Place', name: r.name, ...(parent ? { containedInPlace: { '@type': 'Place', name: parent.name, url: regionUrl(parent) } } : {}) },
      mainEntity: { '@type': 'ItemList', numberOfItems: keys.length, itemListElement: keys.map((k, j) => ({ '@type': 'ListItem', position: j + 1, name: nameOf(k), url: countryUrl(k) })) } },
    crumbs([['Globe', SITE.url], ['Countries', SITE.url + 'countries/'], ...trail.map(([n, u]) => [n, u])])] };
  const body = `    ${breadcrumb([['Globe', base], ['Countries', '../../'], ...trail.slice(0, -1).map(([n, , h]) => [n, h]), [r.name]])}
    <h1>${esc(label)}</h1>
    <p class="lede">${lede.join(' ')}</p>
    ${paras.length ? `<p>${paras.join(' ')}</p>` : ''}
    ${subs.length ? `<h2>Subregions</h2>
    <ul class="chips">${subs.map(x => `<li><a href="../${x.slug}/">${esc(x.name)} <span class="muted">${x.keys.length}</span></a></li>`).join('')}</ul>` : ''}
    <h2>${esc(Rn)} by area</h2>
    <div class="table-wrap">
      <table class="vs-table list-table">
        <thead><tr><th scope="col">Country</th><th scope="col">Area</th><th scope="col">Population</th><th scope="col">Per km²</th><th scope="col">Capital</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    ${inPairs.length ? `<h2>Size comparisons in ${esc(rn)}</h2>
    <ul class="chips">${inPairs.map(q => `<li><a href="${base}compare/${q.slug}/">${esc(nameOf(q.a))} vs ${esc(nameOf(q.b))}</a></li>`).join('')}</ul>` : ''}
    <p class="cta"><a class="btn" href="${base}">Explore ${esc(rn)} on the 3D globe</a></p>
    ${sources}`;
  write(`countries/region/${r.slug}/index.html`, page({ title, description, canonical, base, jsonld, body }));
}

// ───────────── rankings ─────────────
for (const rk of RANKINGS) {
  const base = '../../../';
  const list = R[rk.by].list.filter(k => rk.by !== 'density' || areaOf(k) > 0);
  const val = { area: k => fmtKm2(areaOf(k)), pop: k => fmtPeople(info[k].pop), density: k => fmtDensity(densityOf(k)) }[rk.by];
  const share = { area: k => areaOf(k) / worldArea, pop: k => info[k].pop / worldPop, density: null }[rk.by];
  const extra = {
    area: k => (mercOk(k) ? `${times(geoOf(k).stretch)}×` : '–'),
    pop: k => (info[k].popYear ? String(info[k].popYear) : '–'),
    density: k => fmtKm2(areaOf(k)),
  }[rk.by];
  const extraHead = { area: 'Mercator stretch', pop: 'Year', density: 'Area' }[rk.by];
  const valHead = { area: 'Area', pop: 'Population', density: 'People per km²' }[rk.by];
  const top3 = list.slice(0, 3), last = list.at(-1);
  const top10share = share ? list.slice(0, 10).reduce((s, k) => s + share(k), 0) : 0;
  const lk = (k, start = false) => `<a href="${base}countries/${slugs.get(k)}/">${esc(nm(k, start))}</a>`;
  const n = `${list.length} countries and territories`;
  const intro = {
    area: `${listText(top3.map((k, j) => `${lk(k, j === 0)} (${fmtKm2(areaOf(k))})`))} are the three largest of the ${n} ranked here; the smallest is ${lk(last)} at ${fmtKm2(areaOf(last))}. The ten largest together cover ${Math.round(top10share * 100)}% of the land of all ${list.length}. The last column shows how much a Mercator world map enlarges each one, which is why the order on a flat map looks so different.`,
    pop: `${listText(top3.map((k, j) => `${lk(k, j === 0)} (${fmtPeople(info[k].pop)})`))} have the most people of the ${n} ranked here, which together hold about ${fmtPeople(worldPop)}. The ten most populous are home to ${Math.round(top10share * 100)}% of them. The least populous is ${lk(last)} with ${fmtPeople(info[last].pop)}.`,
    density: `The average for the ${n} ranked here is about ${fmtInt(worldDensity)} people per km². Small, city-sized places top the list: ${listText(top3.map((k, j) => `${lk(k, j === 0)} (${fmtDensity(densityOf(k))})`))}. The emptiest is ${lk(last)} with ${densityOf(last) < 1 ? 'fewer than 1 person' : fmtDensity(densityOf(last)) + ' people'} per km².${(() => { const big = list.filter(k => areaOf(k) >= 1e5)[0]; return big ? ` Among countries larger than 100,000 km², the most crowded is ${lk(big)} (${fmtDensity(densityOf(big))}).` : ''; })()}`,
  }[rk.by];
  const rows = list.map((k, j) => `<tr id="${slugs.get(k)}"><td class="n">${j + 1}</td><td class="c">${flag(k, base, 'flag sm', [24, 18])}${cLink(k, base)}${isTerr(k) ? ' <span class="muted">(territory)</span>' : ''}</td><td>${val(k)}</td>${share ? `<td class="sh">${(share(k) * 100).toFixed(share(k) < 0.001 ? 3 : share(k) < 0.01 ? 2 : 1)}%</td>` : ''}<td>${extra(k)}</td></tr>`).join('\n          ');
  const title = `${rk.title} | ${SITE.name}`;
  const description = {
    area: `All ${list.length} countries and territories ranked by area in km² and share of land, from ${nameOf(list[0])} to ${nameOf(last)}, with how much a Mercator map stretches each one.`,
    pop: `${list.length} countries and territories ranked by population (mostly ${info[list[0]].popYear || ''} World Bank figures), from ${nameOf(list[0])} to ${nameOf(last)}, with each one's share of the total.`,
    density: `${list.length} countries and territories ranked by people per km², from ${nameOf(list[0])} to ${nameOf(last)}, against a world average of about ${fmtInt(worldDensity)}.`,
  }[rk.by];
  const canonical = `${SITE.url}countries/ranking/${rk.slug}/`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [WEBSITE,
    { '@type': 'CollectionPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] }, dateModified: PAGE_DATE,
      mainEntity: { '@type': 'ItemList', itemListOrder: 'https://schema.org/ItemListOrderDescending', numberOfItems: list.length,
        itemListElement: list.slice(0, 50).map((k, j) => ({ '@type': 'ListItem', position: j + 1, name: nameOf(k), url: countryUrl(k) })) } },
    crumbs([['Globe', SITE.url], ['Countries', SITE.url + 'countries/'], [rk.short, canonical]])] };
  const others = RANKINGS.filter(x => x !== rk).map(x => `<a href="../${x.slug}/">${esc(x.short.toLowerCase())}</a>`).join(' · ');
  const body = `    ${breadcrumb([['Globe', base], ['Countries', '../../'], [rk.short]])}
    <h1>${esc(rk.h1)}</h1>
    <p class="lede">${intro}</p>
    <p class="muted">Other rankings: ${others}. The list follows the map: UN members, states with limited recognition, and territories the map draws separately, such as Greenland or Hong Kong (marked). Antarctica and smaller territories such as Puerto Rico are left out; they have their own pages in the <a href="../../">A–Z list</a>.</p>
    <div class="table-wrap">
      <table class="vs-table list-table rank-table">
        <thead><tr><th scope="col">#</th><th scope="col">Country</th><th scope="col">${valHead}</th>${share ? `<th scope="col" class="sh">Share</th>` : ''}<th scope="col">${extraHead}</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    <p class="cta"><a class="btn" href="${base}">See them at true size on the 3D globe</a></p>
    ${sources}`;
  write(`countries/ranking/${rk.slug}/index.html`, page({ title, description, canonical, base, jsonld, body }));
}

// ───────────── comparison pages ─────────────
function stretchSentence(a, b) {
  if (!mercOk(a) || !mercOk(b)) {
    const polar = !mercOk(a) ? a : b;
    return `${nm(polar, true)} lies so close to a pole that a Mercator map can't show it fairly${polar === 'ATA' ? ' (or at all)' : ''}, which is why comparisons like this one surprise people. On a globe, every country keeps its true size.`;
  }
  const A = areaOf(a), B = areaOf(b), sa = geoOf(a).stretch, sb = geoOf(b).stretch;
  const trueR = A / B, appR = (A * sa) / (B * sb);
  const s = [`On a Mercator world map, the projection most web maps use, ${nm(a)} is drawn about ${times(sa)}× its true size and ${nm(b)} about ${times(sb)}×.`];
  if ((trueR < 1) !== (appR < 1) && Math.abs(Math.log(appR)) > Math.log(1.05)) {
    const [looksBig, other] = appR > 1 ? [a, b] : [b, a];
    s.push(`That is why ${nm(looksBig)} looks bigger than ${nm(other)} on most maps, even though ${nm(other)} is really ${times(Math.max(trueR, 1 / trueR))} times larger.`);
  } else {
    const t = Math.max(trueR, 1 / trueR), ap = Math.max(appR, 1 / appR);
    const [big, small] = trueR >= 1 ? [a, b] : [b, a];
    if (ap > t * 1.25) s.push(`So the map exaggerates the gap: ${nm(big)} looks about ${times(ap)} times as big as ${nm(small)}, but the real figure is ${times(t)}.`);
    else if (ap < t / 1.25) s.push(`So the map hides part of the gap: ${nm(big)} looks only about ${times(ap)} times as big as ${nm(small)}, but the real figure is ${times(t)}.`);
    else s.push('They sit at similar distances from the equator, so a Mercator map shows this pair fairly honestly.');
  }
  return s.join(' ');
}

/** Plain share links: no third-party scripts, nothing loads until clicked. */
function shareLinks(url, text) {
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  const links = [
    ['X', `https://x.com/intent/post?text=${t}&url=${u}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['Reddit', `https://www.reddit.com/submit?url=${u}&title=${t}`],
    ['Bluesky', `https://bsky.app/intent/compose?text=${encodeURIComponent(text + ' ' + url)}`],
    ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`],
    ['Email', `mailto:?subject=${t}&body=${encodeURIComponent(url)}`],
  ];
  return `<p class="share"><span class="muted">Share:</span> ${links.map(([n, h]) => `<a href="${esc(h)}" rel="noopener nofollow"${h.startsWith('http') ? ' target="_blank"' : ''}>${n}</a>`).join(' ')}</p>`;
}

function comparePage(p, related) {
  const { a, b, slug } = p, ia = info[a], ib = info[b];
  const A = areaOf(a), B = areaOf(b);
  const [big, small] = A >= B ? [a, b] : [b, a];
  const r = Math.max(A, B) / Math.min(A, B);
  const lead = r < 1.05
    ? `${nm(a, true)} (${fmtKm2(A)}) and ${nm(b)} (${fmtKm2(B)}) are almost exactly the same size: the difference is under 5%.`
    : r < 1.5
      ? `${nm(big, true)} is about ${pct(r)} larger than ${nm(small)}: ${fmtKm2(Math.max(A, B))} against ${fmtKm2(Math.min(A, B))}.`
      : `${nm(big, true)} is about ${times(r)} times the size of ${nm(small)}. ${nm(small, true)} would fit into ${nm(big)} about ${times(r)} times over (${fmtKm2(Math.min(A, B))} against ${fmtKm2(Math.max(A, B))}).`;
  const diff = Math.abs(A - B);
  const paras = [];
  const like = R.area.list.filter(k => k !== a && k !== b).sort((x, y) => Math.abs(areaOf(x) - diff) - Math.abs(areaOf(y) - diff))[0];
  paras.push(`The difference is ${fmtArea(diff)}${diff > 1000 && like && Math.abs(areaOf(like) - diff) / diff < 0.08 ? `, roughly the size of ${nm(like)}` : ''}.`);
  if (ia.pop && ib.pop && a !== 'ATA' && b !== 'ATA') {
    const pr = Math.max(ia.pop, ib.pop) / Math.min(ia.pop, ib.pop);
    const [more, fewer] = ia.pop >= ib.pop ? [a, b] : [b, a];
    paras.push(pr < 1.1
      ? `They have about the same number of people: ${fmtPeople(ia.pop)} in ${nm(a)} and ${fmtPeople(ib.pop)} in ${nm(b)}.`
      : `${nm(more, true)} has ${times(pr)} times as many people (${fmtPeople(info[more].pop)} against ${fmtPeople(info[fewer].pop)}).`);
    const da = ia.pop / A, db = ib.pop / B, dr = Math.max(da, db) / Math.min(da, db);
    const denser = da >= db ? a : b;
    paras.push(dr < 1.15
      ? `Both are similarly crowded, with about ${fmtDensity(da)} and ${fmtDensity(db)} people per km².`
      : `${nm(denser, true)} is ${times(dr)} times as densely populated: ${fmtDensity(Math.max(da, db))} people per km² against ${fmtDensity(Math.min(da, db))}.`);
  } else if (a === 'ATA' || b === 'ATA') {
    const o = a === 'ATA' ? b : a;
    if (info[o].pop) paras.push(`Antarctica has no permanent population, only a few thousand research staff, while ${nm(o)} is home to ${fmtPeople(info[o].pop)} people.`);
  }
  const geo = [];
  const ga = geoOf(a), gb = geoOf(b);
  if (a === 'ATA' || b === 'ATA') geo.push(`Antarctica surrounds the South Pole; ${nm(a === 'ATA' ? b : a)} is centred near ${latStr((a === 'ATA' ? gb : ga).lat)}.`);
  else geo.push(`The main landmass of ${nm(a)} is centred near ${latStr(ga.lat)}, ${poss(nm(b))} near ${latStr(gb.lat)}; the two centres are about ${fmtInt(Math.round(kmBetween(a, b) / 10) * 10)} km (${fmtInt(Math.round(kmBetween(a, b) * 0.621371 / 10) * 10)} miles) apart.`);
  if ((ia.borders || []).includes(b)) geo.push(`${nm(a, true)} and ${nm(b)} share a land border.`);
  const shared = (ia.borders || []).filter(x => (ib.borders || []).includes(x) && info[x]);
  if (shared.length) geo.push(`Both border ${listText(shared.map(x => cLink(x)))}.`);
  if (ia.subregion && ia.subregion === ib.subregion) geo.push(`Both are in ${esc(ia.subregion)}.`);

  const row = (label, va, vb, fmt, num = true) => {
    if (va == null && vb == null) return '';
    const win = num && va != null && vb != null && va !== vb ? (va > vb ? 'a' : 'b') : '';
    return `<tr><th scope="row">${label}</th><td${win === 'a' ? ' class="win"' : ''}>${va != null ? fmt(va) : '–'}</td><td${win === 'b' ? ' class="win"' : ''}>${vb != null ? fmt(vb) : '–'}</td></tr>`;
  };
  const dens = (i, ar) => (i.pop && ar > 50 ? i.pop / ar : null);
  const gpp = i => (i.gdp && i.pop ? i.gdp * 1e6 / i.pop : null);
  const pa = a !== 'ATA', pb = b !== 'ATA';
  const table = [
    row('Area', A, B, fmtKm2),
    row('Area (sq mi)', A * SQMI, B * SQMI, fmtInt),
    row('Area rank', R.area.at.get(a) ?? null, R.area.at.get(b) ?? null, ord, false),
    row('Population', pa ? ia.pop || null : null, pb ? ib.pop || null : null, fmtPeople),
    row('People per km²', pa ? dens(ia, A) : null, pb ? dens(ib, B) : null, fmtDensity),
    row('GDP', pa ? ia.gdp || null : null, pb ? ib.gdp || null : null, fmtGdp),
    row('GDP per person', pa ? gpp(ia) : null, pb ? gpp(ib) : null, v => '$' + fmtInt(v)),
    row('Capital', ia.capital || null, ib.capital || null, esc, false),
    row('Region', ia.subregion || ia.continent || null, ib.subregion || ib.continent || null, esc, false),
    row('Land neighbours', ia.borders?.length ?? null, ib.borders?.length ?? null, String),
    row('Mercator stretch', mercOk(a) ? ga.stretch : null, mercOk(b) ? gb.stretch : null, v => times(v) + '×', false),
  ].join('\n          ');

  const na = nameOf(a), nb = nameOf(b);
  const title = `${na} vs ${nb}: size comparison | ${SITE.name}`;
  const description = `${r < 1.05 ? `${na} and ${nb} are almost the same size` : `${nameOf(big)} is ${r < 1.5 ? pct(r) + ' larger than' : times(r) + ' times the size of'} ${nameOf(small)}`}. Compare area, population and density, then see their true size side by side on a 3D globe.`;
  const canonical = `${SITE.url}compare/${slug}/`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [WEBSITE,
    { '@type': 'WebPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] }, dateModified: PAGE_DATE,
      about: [a, b].map(k => ({ '@type': 'Place', name: nameOf(k), url: countryUrl(k) })) },
    crumbs([['Globe', SITE.url], ['Comparisons', SITE.url + 'compare/'], [`${na} vs ${nb}`, canonical]])] };
  const body = `    ${breadcrumb([['Globe', BASE2], ['Comparisons', '../'], [`${na} vs ${nb}`]])}
    <article>
      <header class="hero vs">
        <div class="pair">${flag(a, BASE2, 'flag md', [64, 48])}<span>vs</span>${flag(b, BASE2, 'flag md', [64, 48])}</div>
        <h1>How big is ${esc(nm(a))} compared to ${esc(nm(b))}?</h1>
        <p class="lede">${lead}</p>
      </header>
      <div class="bars" aria-hidden="true">
        <div style="--w:${(A / Math.max(A, B) * 100).toFixed(1)}%"><span>${esc(na)}</span></div>
        <div style="--w:${(B / Math.max(A, B) * 100).toFixed(1)}%"><span>${esc(nb)}</span></div>
      </div>
      <p class="cta"><a class="btn" href="${BASE2}?compare=${a},${b}">See them side by side on the 3D globe</a></p>
      ${shareLinks(canonical, `${nameOf(a)} vs ${nameOf(b)}: ${r < 1.05 ? 'almost exactly the same size' : `${nameOf(big)} is ${r < 1.5 ? pct(r) + ' larger than' : times(r) + ' times the size of'} ${nameOf(small)}`}. See them at true size on a 3D globe:`)}
      <h2>Size, people and density</h2>
      <p>${paras.join(' ')}</p>
      <h2>Why maps get this pair wrong</h2>
      <p>${stretchSentence(a, b)} <a href="${BASE2}why-maps-lie.html">Read more about map projections</a>.</p>
      <h2>Where they are</h2>
      <p>${geo.join(' ')}</p>
      <h2>Side by side</h2>
      <div class="table-wrap">
        <table class="vs-table">
          <thead><tr><td></td><th scope="col">${cLink(a)}</th><th scope="col">${cLink(b)}</th></tr></thead>
          <tbody>
          ${table}
          </tbody>
        </table>
      </div>
      ${related.length ? `<h2>Related comparisons</h2>
      <ul class="chips">${related.map(q => `<li><a href="../${q.slug}/">${esc(nameOf(q.a))} vs ${esc(nameOf(q.b))}</a></li>`).join('')}</ul>` : ''}
      ${sources}
    </article>`;
  write(`compare/${slug}/index.html`, page({ title, description, canonical, base: BASE2, jsonld, body }));
}
for (const p of pairs) {
  const related = pairs.filter(q => q !== p && (q.a === p.a || q.b === p.a || q.a === p.b || q.b === p.b)).slice(0, 6);
  comparePage(p, related);
}

// ───────────── comparisons index ─────────────
{
  const li = q => `<li><a href="${q.slug}/">${esc(nameOf(q.a))} vs ${esc(nameOf(q.b))}</a><span class="muted">${sizePhrase(q.a, q.b)}</span></li>`;
  const title = `Country size comparisons: true size side by side | ${SITE.name}`;
  const description = `${pairs.length} country size comparisons with real areas, populations and Mercator distortion, each viewable side by side on a 3D globe.`;
  const canonical = SITE.url + 'compare/';
  const jsonld = { '@context': 'https://schema.org', '@graph': [WEBSITE,
    { '@type': 'CollectionPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] } },
    crumbs([['Globe', SITE.url], ['Comparisons', canonical]])] };
  const body = `    ${breadcrumb([['Globe', '../'], ['Comparisons']])}
    <h1>Country size comparisons</h1>
    <p class="lede">Flat maps distort size, so the real answers are often surprising. Each page gives the true ratio, people and density, and opens both countries side by side on the 3D globe. For any other pair, open the globe and pick two countries.</p>
    <h2>Famous surprises</h2>
    <ul class="cmp-index">${pairs.filter(q => q.kind === 'famous').map(li).join('')}</ul>
    <h2>Neighbours</h2>
    <ul class="cmp-index">${pairs.filter(q => q.kind === 'neighbours').map(li).join('')}</ul>
    ${sources}`;
  write('compare/index.html', page({ title, description, canonical, base: '../', jsonld, body }));
}

// ───────────── 404 ─────────────
{
  const popular = ['USA', 'GBR', 'FRA', 'DEU', 'IND', 'CHN', 'BRA', 'AUS', 'CAN', 'JPN', 'RUS', 'GRL'].filter(k => pageKeys.has(k));
  const all = [...pageKeys].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'en'));
  const body = `    <h1>Page not found</h1>
    <p class="lede">That page doesn't exist, or it moved. Try the globe, or find a country below.</p>
    <p class="cta"><a class="btn" href="${sitePath}">Open the globe</a></p>
    <form class="find" action="${sitePath}countries/" method="get" role="search">
      <label for="q">Find a country</label>
      <div><input id="q" name="q" list="countries" autocomplete="off" placeholder="e.g. France"><button type="submit">Go</button></div>
      <datalist id="countries">${all.map(k => `<option value="${esc(nameOf(k))}">`).join('')}</datalist>
    </form>
    <p id="guess" hidden></p>
    <h2>Popular countries</h2>
    <ul class="grid">${popular.map(k => `<li><a href="${sitePath}countries/${slugs.get(k)}/">${flag(k, sitePath, 'flag sm', [24, 18])}<span>${esc(nameOf(k))}</span></a></li>`).join('')}</ul>
    <p><a href="${sitePath}countries/">All countries A–Z</a> · <a href="${sitePath}compare/">Size comparisons</a></p>
    <script>
      // Optional: jump straight to the country page you typed, or suggest one from the broken address.
      const C = ${JSON.stringify(Object.fromEntries(all.map(k => [nameOf(k).toLowerCase(), slugs.get(k)])))};
      const S = Object.values(C), base = ${JSON.stringify(sitePath)};
      document.querySelector('.find').addEventListener('submit', e => {
        const s = C[document.getElementById('q').value.trim().toLowerCase()];
        if (s) { e.preventDefault(); location.href = base + 'countries/' + s + '/'; }
      });
      const last = location.pathname.split('/').filter(Boolean).pop() || '';
      const hit = S.find(s => s === last.toLowerCase().replace(/\\.html$/, ''));
      if (hit) { const g = document.getElementById('guess'); g.innerHTML = 'Did you mean <a href="' + base + 'countries/' + hit + '/">this country page</a>?'; g.hidden = false; }
    </script>`;
  const html = page({ title: `Page not found | ${SITE.name}`, description: 'This page does not exist. Open the globe or find a country.', canonical: SITE.url + '404.html', base: sitePath, jsonld: { '@context': 'https://schema.org', ...WEBSITE }, body })
    .replace('<link rel="canonical"', '<meta name="robots" content="noindex">\n  <link rel="canonical"');
  write('404.html', html);
}

// ───────────── sitemap + robots ─────────────
const urls = written.map(w => ({ loc: SITE.url + w.rel, lastmod: w.lastmod }));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
// AI crawlers: everything is allowed on purpose. The site wants to be found and cited, including by AI search
// (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Google's AI features use Googlebot) and by assistants
// fetching a page for a user. Training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot…) are allowed too:
// the facts come from open data and the pages exist to spread them. See docs/seo.md to change this.
fs.writeFileSync(path.join(outDir, 'robots.txt'), `# Crawlers read robots.txt only at the root of a host. While the site lives under ${sitePath}
# on github.io this file is informational; it takes effect once the custom domain is live.
# All crawlers, including AI search and AI training crawlers, are welcome (see docs/seo.md).
User-agent: *
Allow: /

Sitemap: ${SITE.url}sitemap.xml
`);

// ───────────── llms.txt (https://llmstxt.org): a plain map of the site for language models ─────────────
{
  const L = (rel, text, note) => `- [${text}](${SITE.url}${rel})${note ? ': ' + note : ''}`;
  const famous = pairs.filter(q => q.kind === 'famous').slice(0, 30);
  const conts = [...regions.values()].filter(r => r.kind === 'continent').sort((a, b) => a.name.localeCompare(b.name));
  const txt = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is a free, browser-based 3D globe (WebGL, no sign-up) made by ${SITE.operator}. On a globe every country keeps its true size,
so it is a way to see past the distortion of Mercator maps. Alongside the globe the site publishes plain HTML reference pages:
one per country (${pageKeys.size} countries and territories), ${pairs.length} country size comparisons, continent and subregion lists, and rankings.

Facts on the pages:
- Area: official figures (mledoze/countries) where available, otherwise measured from Natural Earth 1:50m borders. km² and sq mi.
- Population and GDP: World Bank World Development Indicators (population mostly ${info.CHN?.popYear || 'recent'}, GDP mostly ${info.CHN?.gdpYear || 'recent'}); older Natural Earth estimates where the World Bank has none. Each page shows the year.
- "Mercator stretch": how many times larger a country is drawn on a Mercator map than its true area, computed from its real outline.
- Rankings cover the ${R.area.n} countries and territories the map draws as separate units (UN members, states with limited recognition, and territories such as Greenland or Hong Kong); Antarctica and small territories are left out.
- Borders are not an endorsement of any claim. The globe offers three border views (UN, de facto, neutral).
- Data last updated ${DATA_DATE}.

Linking into the globe: \`${SITE.url}?c=FRA\` opens a country (ISO 3166-1 alpha-3 code), \`${SITE.url}?compare=GRL,COD\` lifts two countries side by side at true size, \`${SITE.url}?play=daily\` starts the daily geography game, \`${SITE.url}?lens=density\` colours the globe by a statistic (pop, density, gdppc, area). Add \`embed=1\` to any of these to show just the globe inside another page (an iframe).

## Main pages
${L('', 'The 3D globe', 'interactive true-size globe, country facts, size comparison, data maps, games (needs JavaScript and WebGL)')}
${L('why-maps-lie.html', 'Why maps lie', 'the Mercator projection explained, how much each latitude is stretched, famous size illusions')}
${L('how-to-play.html', 'How to play', 'controls, comparing countries, border views, Daily Challenge and Find it')}
${L('about.html', 'About', 'who makes it, data sources and licences')}

## Countries
${L('countries/', 'All countries A–Z', `${pageKeys.size} country pages: area, population, density, capital, languages, currency, neighbours, Mercator stretch`)}
${RANKINGS.map(rk => L(`countries/ranking/${rk.slug}/`, rk.h1)).join('\n')}
${conts.map(c => L(`countries/region/${c.slug}/`, `Countries in ${c.name}`, [...regions.values()].filter(x => x.parent === c.name).map(x => x.name).join(', ') || undefined)).join('\n')}

## Size comparisons
${L('compare/', 'All size comparisons', `${pairs.length} pairs with true area ratio, population, density, distance and map distortion`)}
${famous.map(q => L(`compare/${q.slug}/`, `${nameOf(q.a)} vs ${nameOf(q.b)}`, sizePhrase(q.a, q.b).replace(/^./, c => c.toUpperCase()))).join('\n')}

## Optional
${L('sitemap.xml', 'Sitemap', 'every page')}
${L('privacy.html', 'Privacy policy')}
${L('terms.html', 'Terms of use')}
${L('contact.html', 'Contact')}
`;
  fs.writeFileSync(path.join(outDir, 'llms.txt'), txt);
}

// ───────────── IndexNow ─────────────
if (SITE.indexNowKey) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(SITE.indexNowKey)) fail('SITE.indexNowKey must be 8–128 letters, digits or dashes');
  fs.writeFileSync(path.join(outDir, `${SITE.indexNowKey}.txt`), SITE.indexNowKey);
}
if (INDEXNOW) {
  if (!SITE.indexNowKey) fail('--indexnow needs SITE.indexNowKey in tools/site.config.mjs');
  const u = new URL(SITE.url);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: u.host, key: SITE.indexNowKey, keyLocation: `${SITE.url}${SITE.indexNowKey}.txt`, urlList: urls.map(x => x.loc) }),
  });
  if (res.status !== 200 && res.status !== 202) fail(`IndexNow answered ${res.status} ${await res.text()}`);
  console.log(`✓ IndexNow: submitted ${urls.length} URLs (HTTP ${res.status})`);
}

const count = dir => written.filter(w => w.rel.startsWith(dir + '/') && w.rel !== dir + '/' && !/^countries\/(region|ranking)\//.test(w.rel)).length;
console.log(`✓ ${written.length} pages in ${path.relative(root, outDir) || outDir}: ${count('countries')} countries, ${count('compare')} comparisons, `
  + `${regions.size} region hubs, ${RANKINGS.length} rankings, ${STATIC_PAGES.length} content pages, 2 indexes, home; `
  + `+ 404.html, sitemap.xml (${urls.length} URLs), robots.txt, llms.txt${SITE.indexNowKey ? ', IndexNow key' : ''}`);
