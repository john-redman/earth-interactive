# SEO, analytics and the free extras

How EarthInteractive gets found, what is generated at deploy time, and the one-off setup the owner has to do.
Budget: $0. Everything below is free.

## What is published

| Path | Source | Notes |
|---|---|---|
| `/` | `index.html` | The globe. Keyword title + description, `WebSite` + `WebApplication` JSON-LD, `h1` brand, small link row (About · How to play · Countries · Comparisons · Why maps lie · Privacy · Support), `<noscript>` text |
| `about.html`, `how-to-play.html`, `why-maps-lie.html`, `privacy.html`, `terms.html`, `contact.html` | hand-written, repo root | Shared head/header/footer are filled in between `<!--site:…-->` markers. After editing the header/footer template, run `node tools/build-pages.mjs --sync` |
| `countries/`, `countries/<slug>/` | generated | One page per country/limited-recognition unit of the default view, plus territories with 100k+ people (~217) |
| `compare/`, `compare/<a>-vs-<b>/` | generated | 150 curated pairs: a famous list in `FAMOUS`, then each country (1M+ people) vs its largest neighbour |
| `404.html`, `sitemap.xml`, `robots.txt` | generated | 404 uses absolute paths (`/earth-interactive/…`) since it can be served at any depth |

Generated pages are **never committed**: `.github/workflows/pages.yml` runs `node tools/build-pages.mjs _site`
after copying the app. Preview locally with `npm run build:pages` (writes `dist-pages/`, git-ignored) and
`npx serve dist-pages`. The 404 page's links only work when served under `/earth-interactive/`.

**Slugs are URLs.** Don't rename a country (`SLUG_NAME` in `tools/build-pages.mjs`) or drop a pair after launch
without a reason: the old URL loses its ranking. Adding pairs is fine.

### Avoiding "scaled content abuse"

Google penalises template pages that swap one keyword and keep everything else. Each page here is built from
the page's own numbers: area and population ranks, density vs the world average, the Mercator stretch computed
from the real geometry, the closest-in-size countries, neighbours, shared borders, distance between centres, and
pair-specific sentences ("the map hides part of the gap…"). Keep it that way:

- Don't grow to thousands of pairs. Add pairs people actually search for (see Search Console → Queries).
- After 3 months, improve or remove pages with zero impressions.
- Hand-write a short intro for the top 20–30 pairs when there is time (not built yet).

## Config: one file, two mirrors

`tools/site.config.mjs` holds `url`, `name`, `description`, `contactEmail`, `kofi`, `goatcounter`, `operator`.
Two values also live in browser code and **must match** (the page build fails if they don't):

| site.config.mjs | Browser copy |
|---|---|
| `url` | `SITE_URL` in `js/site.js` |
| `goatcounter` | `GOATCOUNTER_CODE` in `js/analytics.js` |

`contactEmail` and `kofi` are applied by the build to every page (links marked `data-site="contact"` /
`data-site="kofi"`), including `index.html` in `_site`. With `contactEmail` empty, contact links go to GitHub
issues; with `kofi` empty, every "Support" link is removed.

## Owner setup (one-off)

### 1. GoatCounter analytics (2 minutes)
1. Sign up at <https://www.goatcounter.com/signup>. Pick a code, e.g. `earthinteractive` → `https://earthinteractive.goatcounter.com`.
2. Put the code in `tools/site.config.mjs` (`goatcounter`) **and** `js/analytics.js` (`GOATCOUNTER_CODE`). Push.
3. In GoatCounter settings, optionally tick "Collect: Sessions" off and add the site domain to "Allowed domains".

No cookies and no personal data, so no consent banner is needed. Page views are counted on every page; the globe
also counts events: `country/<KEY>` (country tapped), `compare` (title = the pair), `play/daily`, `play/classic`.
Nothing is sent on localhost or inside the native app.

### 2. Ko-fi tip link
1. Create a free page at <https://ko-fi.com> (0% fee on one-off tips).
2. Set `kofi: '<your page name>'` in `tools/site.config.mjs`. Push. "Support" appears in the globe's link row, every page footer, About and Contact.

### 3. Contact address
Set `contactEmail` (e.g. a free forwarding address from your domain registrar or Cloudflare Email Routing once the domain exists).

### 4. Google Search Console
1. Open <https://search.google.com/search-console> → **Add property** → **URL prefix** → `https://john-redman.github.io/earth-interactive/`.
   (A *Domain* property needs DNS access, which github.io doesn't give you. It's the better choice once the custom domain exists.)
2. Verify with **HTML file**: Google gives you a file like `google1234abcd.html`. Commit it to the repo root and add it
   to the `cp` line in `pages.yml`, push, then click Verify. The file holds only a public token; it is not a secret.
   (Alternative: the **HTML tag** method — paste the `<meta name="google-site-verification">` tag into `index.html`'s `<head>`.)
3. **Sitemaps** → submit `sitemap.xml` (full URL `https://john-redman.github.io/earth-interactive/sitemap.xml`).
4. **URL inspection** → request indexing for `/`, `/countries/`, `/compare/` and `/why-maps-lie.html` to speed up the first crawl.

`robots.txt` only works at the root of a host, so `/earth-interactive/robots.txt` is ignored on github.io (it
contains `Allow: /` anyway). That's why the sitemap must be submitted by hand until the custom domain is live.

### 5. Bing Webmaster Tools (also feeds DuckDuckGo, Yahoo, Ecosia, ChatGPT search)
1. <https://www.bing.com/webmasters> → sign in → **Import from Google Search Console**. Verification and the sitemap come across.
2. Optional **IndexNow**: Bing → Settings → IndexNow gives you a key. Host `<key>.txt` at the site root (custom domain only) and
   ping `https://api.indexnow.org/indexnow?url=<page>&key=<key>` after deploys. Not worth it before the custom domain.

## Moving to the custom domain later

1. Buy the domain, point its DNS at GitHub Pages and add it under repo **Settings → Pages → Custom domain**. With an
   Actions deploy (ours) no `CNAME` file is needed; the setting is enough. Enable **Enforce HTTPS**.
2. GitHub then 301-redirects `john-redman.github.io/earth-interactive/*` to the new domain, path for path, so rankings carry over.
3. Change `url` in `tools/site.config.mjs` **and** `SITE_URL` in `js/site.js` (and the hard-coded URLs in `index.html`'s
   canonical, OG tags and JSON-LD). Push. Canonicals, sitemap and OG URLs all switch.
4. The site now lives at the domain root, so `robots.txt` starts working and `ads.txt` becomes possible.
5. Search Console: add a **Domain** property for the new domain (DNS TXT verification), submit the new sitemap, and use
   **Settings → Change of address** from the old property. Bing: add the new site and submit its sitemap.
6. Keep the redirect forever (don't delete the github.io Pages setup).

## Core Web Vitals

- Text pages: no JavaScript (except a tiny optional script on 404), no web font, one ~10 KB stylesheet (~3 KB gzipped), flags are small SVGs with
  width/height set (no layout shift) and lazy-loaded below the fold. They should score 95–100 on PageSpeed Insights.
- Globe: LCP is the canvas after a ~1.1 MB data download; the loader keeps CLS at 0. Fixed-size ad slots (when ads arrive) avoid CLS.
  INP is dominated by WebGL work on low-end phones; `js/perf.js` already lowers quality there.
- Check with <https://pagespeed.web.dev> on a country page and on `/` after each big change. Search Console's Core Web Vitals
  report needs real traffic before it shows data.

## Keywords by audience

| Audience | Search phrases | Landing page |
|---|---|---|
| Curious adults, social traffic | true size of countries, true size map, how big is greenland really, mercator projection explained, why is greenland so big on maps | `/`, `why-maps-lie.html`, `compare/greenland-vs-*` |
| Comparison searchers | X vs Y size, how big is X compared to Y, how many Xs fit in Y, is X bigger than Y | `compare/<a>-vs-<b>/` |
| Fact lookups | how big is X, X area in km² / sq mi, X population 2025, X neighbours / bordering countries | `countries/<slug>/` |
| Students and teachers | interactive globe for kids/classroom, 3D globe online, geography game, find the country game, map quiz | `/`, `how-to-play.html` |
| Game players | daily geography game, worldle alternative, country guessing game | `/?play=daily`, `how-to-play.html` |

## Checklist

- [ ] GoatCounter code set in both places, deploy, see a visit in the dashboard
- [ ] Ko-fi page created and `kofi` set
- [ ] `contactEmail` set (or keep GitHub issues)
- [ ] Search Console URL-prefix property verified, `sitemap.xml` submitted, key pages inspected
- [ ] Bing Webmaster Tools imported from GSC
- [ ] PageSpeed Insights run on `/countries/france/` and `/`
- [ ] Rich Results Test (<https://search.google.com/test/rich-results>) on a country page: Breadcrumb detected
- [ ] Share a compare page on social: preview shows title and image
- [ ] After 4–8 weeks: Search Console → Pages (indexed count), Queries (which pairs to add)
- [ ] At the custom domain: steps in "Moving to the custom domain later"
- [ ] Before ads: update the privacy policy's Advertising section, add `ads.txt` (needs the custom domain)
