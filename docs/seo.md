# SEO, analytics and the free extras

How EarthInteractive gets found, what is generated at deploy time, and the one-off setup the owner has to do.
Budget: $0. Everything below is free.

## What is published

| Path | Source | Notes |
|---|---|---|
| `/` | `index.html` | The globe. Keyword title + description, `WebSite` + `WebApplication` JSON-LD, `h1` brand, small link row (About · How to play · Countries · Comparisons · Why maps lie · Privacy · Support), `<noscript>` text |
| `about.html`, `how-to-play.html`, `why-maps-lie.html`, `privacy.html`, `terms.html`, `contact.html` | hand-written, repo root | Shared head/header/footer are filled in between `<!--site:…-->` markers. After editing the header/footer template, run `node tools/build-pages.mjs --sync` |
| `countries/`, `countries/<slug>/` | generated | One page per country/limited-recognition unit of the default view, plus territories with 100k+ people (~217) |
| `countries/region/<slug>/` | generated | 27 hubs: 6 continents (2+ pages) and 21 subregions (3+ pages). Totals, largest/smallest, most people, densest/emptiest, uneven Mercator stretch, a sortable-looking table, comparisons inside the region |
| `countries/ranking/<slug>/` | generated | 3 full rankings: `largest-countries` (with a Mercator-stretch column), `most-populous-countries`, `population-density`. Each row has an `id` = country slug, so country pages link to their own row |
| `compare/`, `compare/<a>-vs-<b>/` | generated | 150 curated pairs: a famous list in `FAMOUS`, then each country (1M+ people) vs its largest neighbour. Plain share links (X, Facebook, Reddit, Bluesky, WhatsApp, email; no third-party scripts) |
| `404.html`, `sitemap.xml`, `robots.txt` | generated | 404 uses absolute paths (`/earth-interactive/…`) since it can be served at any depth |
| `llms.txt` | generated | Plain-text map of the site for language models ([llmstxt.org](https://llmstxt.org)): what it is, where the facts come from, deep-link syntax, links to the indexes, rankings, regions and 30 famous comparisons |
| `<indexNowKey>.txt` | generated | IndexNow ownership file (see below) |

Page count at the time of writing: **406 URLs in the sitemap** (home, 6 content pages, 217 countries, 27 region hubs,
3 rankings, 2 indexes, 150 comparisons).

**Regions.** Natural Earth puts a few island states under "Seven seas (open ocean)" and Cyprus under Asia with the
subregion Southern Europe, so a unit's continent is the usual continent of its subregion (`continentOf()`). A
subregion that is the whole continent (South America, the "North America" subregion) has no separate hub.
Breadcrumbs follow the hubs: Globe › Countries › Europe › Western Europe › France, in the HTML and in `BreadcrumbList`.

**Areas.** `areaOf()` uses the official figure, except where it differs from the mapped shape by more than 2×
(then the official figure belongs to something else, e.g. Australia's area on its Indian Ocean territories). Places
under 20,000 km² always use the official figure, because 1:50m outlines of islands and city-states are far off
(Maldives 67 km² mapped vs 300 real, Monaco 12 vs 2). Areas under 10 km² keep two decimals (Vatican City 0.44 km²).

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
- Region hubs and rankings are worth their place because each one is a real list with its own totals and
  extremes that people search for ("countries in Western Europe", "largest countries by area"). Don't add hubs for
  tiny groups (the build skips subregions with fewer than 3 pages) and don't add near-duplicate rankings
  (e.g. "smallest countries" is the bottom of `largest-countries`; link to `#vatican-city` instead).

## AI search and answer engines

What helps (Google's own guidance for AI Overviews / AI Mode, May 2025 and the May 2026 update: no special "AI
schema" or markup is needed; normal, crawlable, useful pages are what get used):

- **Answer first.** Country pages use question headings that match how people ask ("How big is France?", "How many
  people live in France?", "Which countries border France?") and the first sentence under each is the answer with the
  number and its year. Compare pages open with the ratio. Region and ranking pages open with totals and extremes.
- **Plain HTML, no JavaScript needed** for any fact, so every crawler (including AI fetchers that don't run JS) sees it.
- **Sources and dates on every page** (`Data last updated …`, the year next to each population/GDP figure) and an
  author byline + `dateModified` on the article.
- **Structured data that matches the visible page**: `BreadcrumbList`, `WebPage`/`CollectionPage` + `ItemList`,
  `Country`/`AdministrativeArea` with `sameAs` Wikidata and `containedInPlace` (its region hub), `Article` with
  author, `datePublished`, `dateModified`.
- **`llms.txt`.** Cheap to generate, but be realistic: as of mid-2026 no major AI company says it reads llms.txt for
  web content, Google says it ignores it, and log studies show almost no AI-bot requests for it. It's kept because it
  costs nothing and doubles as a human-readable site map; don't spend time on it. Like robots.txt it sits under
  `/earth-interactive/` until the custom domain, which is not where tools look (`/llms.txt`).

What we deliberately did **not** do:

- **No `FAQPage` markup.** Google retired FAQ rich results completely in 2026 (restricted to government/health sites
  since 2023), and studies find no link between schema and AI citations. The questions are visible headings instead,
  which is what answer engines quote. Adding FAQ blocks that repeat the same facts would only add template text.
- **No `Dataset` markup.** It needs a downloadable distribution and a licence per dataset; we don't publish one. If a
  CSV of the country facts is ever published (ODbL share-alike applies), add `Dataset` then.
- **No per-page OG images.** It would need a rasteriser (new dependency) or headless screenshots in CI (slow,
  flaky). All pages share `og-image.png` with `og:image:alt`. Revisit if compare links get shared a lot.
- **No `hreflang`.** The site is English only; `<html lang="en">` and `og:locale` `en_GB` are enough.

### AI crawlers: all allowed

`robots.txt` allows every crawler, including AI search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot;
Google's AI features use ordinary Googlebot) and training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot,
Applebot-Extended). Reasoning: the site wants to be found and cited, the facts are open data, and blocking a search
crawler makes the site uncitable in that assistant. User-triggered fetchers (ChatGPT-User, Claude-User,
Perplexity-User) mostly ignore robots.txt anyway.

To opt out of training only while staying citable, add groups like this to the `robots.txt` template in
`tools/build-pages.mjs` (it only takes effect on the custom domain):

```
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: CCBot
User-agent: Applebot-Extended
Disallow: /
```

**github.io limitation:** crawlers only read `https://john-redman.github.io/robots.txt` (the host root), which belongs
to a `john-redman.github.io` repository, not to this project. Without one, nothing is blocked, which is what we want.
To control crawlers before the custom domain, create that user-site repo with a root `robots.txt` (it affects every
project site under the account).

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

## Other discoverability

- **Internal links**: every country page links to its region hub(s) (breadcrumb + Region fact), to its own row in
  the area and population rankings, and within the region ("the largest of 8 countries in Western Europe"). The A–Z
  index links all hubs and rankings; region hubs link the comparisons inside the region.
- **Share links** on compare pages are plain `<a>` links (nothing loads until clicked, `rel="nofollow"`).
- **App shortcuts** in `manifest.webmanifest` (long-press the installed icon): Daily Challenge, Find it, Size
  comparisons, All countries.
- **Not done, on purpose**: an RSS/Atom feed (nothing changes often enough to be worth following; reconsider if a
  blog or "country of the day" appears), `humans.txt` (no search or AI value), `security.txt` (must live at
  `/.well-known/` on the host root, so only possible on the custom domain; add it then with the contact address), an
  embeddable widget (needs an app-side embed mode without ads and with a "Powered by" link; see the marketing plan §5.7).

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
2. **IndexNow** (Bing, Yandex, Seznam, Naver; Bing shares it with its partners): already set up. The key is
   `indexNowKey` in `tools/site.config.mjs` (a public token, not a secret), and every deploy publishes
   `<key>.txt` next to the pages. A key file in a subfolder is valid for URLs in that folder, so it works under
   `/earth-interactive/` today; the request names it with `keyLocation`. After a deploy has finished, run once from
   your machine:

   ```bash
   node tools/build-pages.mjs dist-pages --indexnow
   ```

   It rebuilds locally and POSTs all sitemap URLs to `api.indexnow.org` (HTTP 200/202 = accepted). Do it after big
   changes (new pages, data refresh), not on every typo fix. Bing Webmaster Tools → IndexNow shows what arrived.
   To rotate the key, put a new random 32-hex string in the config and redeploy before submitting.

## Moving to the custom domain later

1. Buy the domain, point its DNS at GitHub Pages and add it under repo **Settings → Pages → Custom domain**. With an
   Actions deploy (ours) no `CNAME` file is needed; the setting is enough. Enable **Enforce HTTPS**.
2. GitHub then 301-redirects `john-redman.github.io/earth-interactive/*` to the new domain, path for path, so rankings carry over.
3. Change `url` in `tools/site.config.mjs` **and** `SITE_URL` in `js/site.js` (and the hard-coded URLs in `index.html`'s
   canonical, OG tags and JSON-LD). Push. Canonicals, sitemap and OG URLs all switch.
4. The site now lives at the domain root, so `robots.txt` and `llms.txt` start working where tools look for them, and `ads.txt`
   and `/.well-known/security.txt` become possible. Run `--indexnow` once after the move (the key file moves with the build).
5. Search Console: add a **Domain** property for the new domain (DNS TXT verification), submit the new sitemap, and use
   **Settings → Change of address** from the old property. Bing: add the new site and submit its sitemap.
6. Keep the redirect forever (don't delete the github.io Pages setup).

## Core Web Vitals

- Text pages: no JavaScript (except a tiny optional script on 404), no web font (system UI stack, by choice: zero
  font requests and no swap shift), one ~12 KB stylesheet (~3 KB gzipped), flags are small SVGs with width/height set
  (no layout shift) and lazy-loaded below the fold. Long tables drop their least important column under 560 px
  instead of scrolling sideways. They should score 95–100 on PageSpeed Insights.
- Globe: LCP is the canvas after a ~1.1 MB data download; the loader keeps CLS at 0. Fixed-size ad slots (when ads arrive) avoid CLS.
  The `<head>` starts the two big downloads early: `<link rel="preload" href="data/world.js" as="fetch" crossorigin>`
  (matches `fetch()` in `js/load.js`, so it's reused, not fetched twice) and `<link rel="modulepreload">` for three.js
  (placed after the import map, which must come first). If `js/load.js` ever changes the data URL or fetch options,
  change the preload too, or the browser downloads 1.1 MB twice.
- Font: Plus Jakarta Sans is self-hosted (`vendor/fonts/plus-jakarta-sans/`, variable 400–800, latin 27 KB + latin-ext
  22 KB, OFL). No Google Fonts request: two fewer connections, no render-blocking third-party CSS, and no visitor IP
  sent to Google (a GDPR complaint point in the EU). The latin file is preloaded; `font-display: swap`.
  INP is dominated by WebGL work on low-end phones; `js/perf.js` already lowers quality there.
- Check with <https://pagespeed.web.dev> on a country page and on `/` after each big change. Search Console's Core Web Vitals
  report needs real traffic before it shows data.

## How to measure

- **Search Console → Performance → Pages**: filter by `/countries/region/`, `/countries/ranking/`, `/compare/`,
  `/countries/` to see impressions and clicks per page type. **Queries** tells you which comparison pairs to add.
- **Search Console → Pages** (indexing): watch "Crawled – currently not indexed" for the region hubs and rankings in
  the first 4–8 weeks. A lot of unindexed template pages is the early warning sign for thin content.
- **Bing Webmaster Tools → Search performance** also covers Copilot/Bing AI answers' source traffic; **IndexNow**
  shows submitted URLs.
- **AI referrals**: in GoatCounter (once set), referrers such as `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`,
  `gemini.google.com` and `claude.ai` are traffic from AI answers. Check monthly.
- **PageSpeed Insights** on `/`, `/countries/france/`, `/countries/ranking/largest-countries/` (the biggest page,
  ~212 rows) after big changes.

## Keywords by audience

| Audience | Search phrases | Landing page |
|---|---|---|
| Curious adults, social traffic | true size of countries, true size map, how big is greenland really, mercator projection explained, why is greenland so big on maps | `/`, `why-maps-lie.html`, `compare/greenland-vs-*` |
| Comparison searchers | X vs Y size, how big is X compared to Y, how many Xs fit in Y, is X bigger than Y | `compare/<a>-vs-<b>/` |
| Fact lookups | how big is X, X area in km² / sq mi, X population 2025, X neighbours / bordering countries | `countries/<slug>/` |
| List lookups | largest countries in the world, most populous countries, most densely populated countries, countries in Western Europe / the Caribbean | `countries/ranking/<slug>/`, `countries/region/<slug>/` |
| Students and teachers | interactive globe for kids/classroom, 3D globe online, geography game, find the country game, map quiz | `/`, `how-to-play.html` |
| Game players | daily geography game, worldle alternative, country guessing game | `/?play=daily`, `how-to-play.html` |

## Checklist

- [ ] GoatCounter code set in both places, deploy, see a visit in the dashboard
- [ ] Ko-fi page created and `kofi` set
- [ ] `contactEmail` set (or keep GitHub issues)
- [ ] Search Console URL-prefix property verified, `sitemap.xml` submitted, key pages inspected
- [ ] Bing Webmaster Tools imported from GSC
- [ ] After the first deploy with these pages: `node tools/build-pages.mjs dist-pages --indexnow` (expect HTTP 200/202)
- [ ] Rich Results Test on a region hub and a ranking page: BreadcrumbList detected, no errors
- [ ] PageSpeed Insights run on `/countries/france/` and `/`
- [ ] Rich Results Test (<https://search.google.com/test/rich-results>) on a country page: Breadcrumb detected
- [ ] Share a compare page on social: preview shows title and image
- [ ] After 4–8 weeks: Search Console → Pages (indexed count), Queries (which pairs to add)
- [ ] At the custom domain: steps in "Moving to the custom domain later"
- [ ] Before ads: update the privacy policy's Advertising section, add `ads.txt` (needs the custom domain)
