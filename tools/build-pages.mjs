/**
 * Builds the crawlable, no-JavaScript pages around the globe:
 *   about.html, how-to-play.html, … (copied from the repo root, with the shared head/header/footer)
 *   countries/index.html, countries/<slug>/index.html   one page per country (+ a few big territories)
 *   compare/index.html,   compare/<a>-vs-<b>/index.html  a curated set of size comparisons
 *   404.html, sitemap.xml, robots.txt
 *
 * Usage:
 *   node tools/build-pages.mjs <outDir>              generated pages only (CI: the app is already in _site)
 *   node tools/build-pages.mjs dist-pages --with-app also copies the app, for a local preview
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
const APP_FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'og-image.png', 'css', 'js', 'data', 'vendor', 'icons', 'LICENSE', 'THIRD_PARTY_NOTICES.md'];

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
const fmtKm2 = km2 => `${fmtInt(km2)} km²`;
const fmtArea = km2 => `${fmtInt(km2)} km² (${fmtInt(km2 * SQMI)} sq mi)`;
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
const DATA_DATE = gitDate('data/world.js');

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

/** Area in km²: the official figure unless the mapped shape is very different (then the mapped one). */
function areaOf(k) {
  const mapped = (unUnit.get(k) || defUnit.get(k))?.area || 0;
  const off = info[k]?.areaOfficial;
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
const worldPop = ranked.reduce((s, k) => s + (info[k].pop || 0), 0);
const worldArea = ranked.reduce((s, k) => s + areaOf(k), 0);
const worldDensity = worldPop / worldArea;

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

function headTags({ title, description, canonical, base, jsonld, type = 'website' }) {
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="theme-color" content="#03040b">
  <link rel="icon" href="${base}icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${base}icons/apple-touch-icon.png">
  <link rel="stylesheet" href="${base}css/pages.css">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${esc(SITE.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${SITE.url}og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
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

const WEBSITE = { '@type': 'WebSite', '@id': SITE.url + '#website', name: SITE.name, url: SITE.url };
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
function write(rel, html, lastmod = DATA_DATE) {
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
    if (type === 'Article') Object.assign(main, { headline: unq(title).replace(/ \| .*$/, ''), author: { '@type': 'Person', name: SITE.operator }, dateModified: gitDate(file), image: SITE.url + 'og-image.png' });
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
    ['Region', esc([i.subregion, i.continent].filter((x, j, a) => x && a.indexOf(x) === j).join(', ')) || null],
    ['Languages', i.languages?.length ? esc(i.languages.join(', ')) : null],
    ['Currency', i.currencies?.length ? esc(i.currencies.join(', ')) : null],
    ['GDP', people && i.gdp && u.t !== 'disputed' ? `${fmtGdp(i.gdp)}${i.gdpYear ? ` <span class="muted">(${i.gdpYear})</span>` : ''}` : null],
    ['GDP per person', people && i.gdp && i.pop ? `$${fmtInt(i.gdp * 1e6 / i.pop)}` : null],
    ['Sovereignty', i.sovereign && u.t !== 'limited' ? esc(i.sovereign) : null],
    ['Landlocked', i.landlocked ? 'Yes' : null],
  ].filter(r => r[1]);

  // prose
  const p1 = [statusSentence(k)];
  if (i.capital) p1.push(`Its capital is ${esc(i.capital)}.`);
  if (i.formal && i.formal !== name && i.formal !== i.name) p1.push(`The official name is ${esc(i.formal)}.`);
  const note = noEmoji(u.note);
  const sizeP = [`${nm(k, true)} covers ${fmtArea(area)}${aRank ? `, the ${ordWord(aRank)}largest of the ${R.area.n} countries and territories ranked here` : ''}.`];
  const tg = compareTargets(k);
  if (tg[0]) sizeP.push(`The closest in size is ${cLink(tg[0].b)} (${fmtKm2(areaOf(tg[0].b))}). ${sizePhrase(k, tg[0].b)}.`);
  sizeP.push(mercSentence(k));
  const popP = [];
  if (people && i.pop) {
    popP.push(`About ${fmtPeople(i.pop)} people live in ${nm(k)}${i.popYear ? ` (${i.popYear} estimate)` : ''}${pRank ? `, the ${ordWord(pRank)}largest population of the ${R.pop.n} ranked here` : ''}.`);
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
  const description = `${name} covers ${fmtKm2(area)}${aRank ? ` (${ord(aRank)} largest)` : ''}${i.pop ? `, with ${fmtPeople(i.pop)} people` : ''}${i.capital ? `. Capital: ${i.capital}` : ''}. See its true size on a 3D globe and compare it with other countries.`;
  const canonical = countryUrl(k);
  const placeType = u.t === 'country' && !i.sovereign ? 'Country' : 'AdministrativeArea';
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    WEBSITE,
    { '@type': 'WebPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] }, dateModified: DATA_DATE, about: { '@id': canonical + '#place' } },
    { '@type': placeType, '@id': canonical + '#place', name, alternateName: [i.formal, ...(i.alt || [])].filter(x => x && x !== name).slice(0, 4),
      ...(i.wikidata ? { sameAs: `https://www.wikidata.org/wiki/${i.wikidata}` } : {}),
      geo: { '@type': 'GeoCoordinates', latitude: +geoOf(k).lat.toFixed(2), longitude: +geoOf(k).lon.toFixed(2) } },
    crumbs([['Globe', SITE.url], ['Countries', SITE.url + 'countries/'], [name, canonical]]),
  ] };
  const body = `    ${breadcrumb([['Globe', BASE2], ['Countries', '../'], [name]])}
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
      ${popP.length ? `<h2>Population</h2>\n      <p>${popP.join(' ')}</p>` : ''}
      <h2>Neighbours</h2>
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
      <section><h2>Largest by area</h2><ol class="mini top">${top(R.area.list, k => fmtKm2(areaOf(k)))}</ol></section>
      <section><h2>Most people</h2><ol class="mini top">${top(R.pop.list, k => fmtPeople(info[k].pop))}</ol></section>
    </div>
    <h2>A–Z</h2>
    ${[...groups].map(([L, ks]) => `<section class="letter" id="${L}" aria-label="${L}"><h3>${L}</h3><ul class="grid">${ks.map(k => `<li><a href="${slugs.get(k)}/">${flag(k, '../', 'flag sm', [24, 18])}<span>${esc(nameOf(k))}</span></a></li>`).join('')}</ul></section>`).join('\n    ')}
    ${sources}`;
  write('countries/index.html', page({ title, description, canonical, base: '../', jsonld, body }));
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
    { '@type': 'WebPage', '@id': canonical, url: canonical, name: title, description, isPartOf: { '@id': WEBSITE['@id'] }, dateModified: DATA_DATE,
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
fs.writeFileSync(path.join(outDir, 'robots.txt'), `# Crawlers read robots.txt only at the root of a host. While the site lives under ${sitePath}
# on github.io this file is informational; it takes effect once the custom domain is live.
User-agent: *
Allow: /

Sitemap: ${SITE.url}sitemap.xml
`);

const count = dir => written.filter(w => w.rel.startsWith(dir + '/') && w.rel !== dir + '/').length;
console.log(`✓ ${written.length} pages in ${path.relative(root, outDir) || outDir}: ${count('countries')} countries, ${count('compare')} comparisons, `
  + `${STATIC_PAGES.length} content pages, 2 indexes, home; + 404.html, sitemap.xml (${urls.length} URLs), robots.txt`);
