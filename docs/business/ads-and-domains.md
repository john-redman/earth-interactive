# Ads, monetisation and domains: research notes

Researched 2026-10-05 for EarthInteractive (currently `https://john-redman.github.io/earth-interactive/`).

> **Reviewed 2026-10-09** against the product as it is now: the site-side steps that are already done are marked
> **(done)**, and the ad slots' current behaviour is described in §2.4. Network terms, thresholds and prices were
> not re-checked. The domain and brand choice now lives in the owner's private plan (linked from
> [docs/launch-checklist.md](../launch-checklist.md)); the name ideas in §6 are kept for history only.

**How to read this**
- Facts are linked to their source. Most come from search-engine summaries of the pages. The research sandbox blocked direct fetches of Google, GitHub Docs, the registrars, RDAP and most publisher sites, so anything marked **(unverified)** needs a quick check before you rely on it.
- Prices are USD per year and include the ICANN fee where the source says so. Registrar prices change often, so check them at checkout.
- "My estimate" means a judgement call, not a sourced number.

---

## 0. TL;DR

1. **Buy a domain first** (≈ $10–15/yr: `.com` if a good name is free, otherwise `.app`). Buy from **Cloudflare Registrar or Porkbun**, not GoDaddy, because GoDaddy's renewals are about twice the price. Point it at GitHub Pages, or better, Cloudflare Pages (see §1.4).
2. **(done)** Privacy policy, terms, about and contact pages and original text content: `privacy.html`, `terms.html`, `about.html`, `contact.html`, plus 400+ generated text pages. Still to do: **`ads.txt`** at the domain root, then apply to **Google AdSense** and turn on Google's **free certified CMP** (Privacy & messaging).
3. **(done)** Audience stance: a general-audience site, not "for kids" (see §1.3). The privacy page says so ("for a general audience of all ages… not directed at children under 13"). This affects AdSense personalised ads, Amazon Associates eligibility and which premium networks you can join later.
4. Add **Ko-fi** (0% fee on one-off tips) on day one. The "Support" links are already wired into every page and stay hidden until `kofi` is set in `tools/site.config.mjs`; only the Ko-fi page itself is missing.
5. Next steps by traffic: **Mediavine Journey** (≥ 1k sessions/mo) is possible but a poor fit for a one-page WebGL app. Look at **Raptive** (≥ 25k pageviews, mostly tier-1 traffic) or a game-focused stack (**AdinPlay**, **Playwire** at 500k pageviews) once traffic is real. Ezoic now wants 250k users/mo.
6. Consider a **separate "game edition"** (Daily Challenge / Find-it) for **CrazyGames / Poki / GameMonetize**. These portals bring their own traffic. Poki asks for web exclusivity for the game you submit, so don't submit the main site.
7. Be realistic. With 1–3 banner units on a single-page app, expect roughly **$0.50–$3 per 1,000 visits** early on (my estimate). **$100/mo needs on the order of 30k–100k+ visits/mo.**

---

## 1. Ad network path by stage

### 1.1 Comparison table

| Network | Entry threshold | Rev share to you | Payout min | Approval difficulty | Takes new / low-traffic sites? | Fit for a one-page WebGL game |
|---|---|---|---|---|---|---|
| **Google AdSense** | No traffic minimum. Needs an "owned" site, original content and policy compliance ([eligibility](https://support.google.com/adsense/answer/9724?hl=en)) | 80% of revenue after the buy-side fee, about **68%** effective when Google Ads buys ([Google blog](https://blog.google/products/adsense/evolving-how-publishers-monetize-with-adsense/), [SEJ](https://www.searchenginejournal.com/google-adsense-shifts-to-ecpm-payment-model/508132/)) | **$100** ([MonetizeMore](https://www.monetizemore.com/blog/the-adsense-payment-threshold-explained/)) | Medium. "Low value content" rejections are common for thin, text-light sites ([adsenseaudit](https://adsenseaudit.net/guides/low-value-content-adsense)) | **Yes** | Good. Fixed-size `<ins>` units in our fixed slots cause zero CLS. No auto-refresh, so long sessions earn little. **H5 Games Ads** (interstitial/rewarded via the Ad Placement API) is a by-application add-on for sites with playable H5 games ([Google](https://www.google.com/adsense/start/solutions/h5-games-ads/), [signup](https://developers.google.com/ad-placement/docs/signup)) |
| **Mediavine Journey** | ≥ **1,000 sessions/mo** (since 15 Jan 2026) ([Productive Blogging](https://www.productiveblogging.com/everything-you-need-to-know-about-journey-by-mediavine/), [Jupiter](https://www.jupiter.co/blog/mediavine-requirements-2026-how-to-qualify)) | **70%** ([Journey help](https://journeymv.zendesk.com/hc/en-us/articles/23783857493787-Revenue-Share)) | $100 | Easy-ish. You must run **Grow** for 30+ days first ([Journey](https://www.journeymv.com/getting-started-with-journey-by-mediavine/)) | Yes | **Poor fit (my estimate).** Built for blogs with in-content ads. A full-screen canvas has no article body to place ads in. |
| **Mediavine (main)** | **$5,000 ad revenue in the past 12 months** (since Jan 2026, replaces 50k sessions) ([Jupiter](https://www.jupiter.co/blog/mediavine-requirements-2026-how-to-qualify)) | ~75% (unverified for 2026) | $25 (unverified) | Medium | No | Poor fit (blog-centric) |
| **Raptive** | ≥ **25,000 pageviews/mo** (lowered Oct 2025). Between 25k and 99,999, at least 50% of traffic must come from US/UK/CA/AU/NZ ([summary](https://www.jupiter.co/blog/mediavine-requirements-2026-how-to-qualify), [Raptive help](https://help.raptive.com/hc/en-us/articles/360035078152-Getting-Started-with-Raptive)) | **75%** ([Raptive FAQ via search](https://help.raptive.com/hc/en-us/articles/360031181471-Raptive-FAQs)) | (unverified) | Medium-hard | Not at launch | Mostly blog/lifestyle. Fit for an app page unverified, so ask before applying. |
| **Ezoic** | **250,000 users/mo** since 19 Feb 2026 (sites already earning are grandfathered). A small **Incubator** takes about 20 sites/month ([search summary of makethatseachange.com](https://makethatseachange.com/ezoic-review/), [Publift](https://www.publift.com/blog/ezoic-vs-adsense-vs-publift)). **(Unverified first-hand.)** | 90% (10% fee) or the "ads pay for it" plan ([Publift](https://www.publift.com/blog/ezoic-vs-adsense-vs-publift)) | $20 (unverified) | Hard now | **No** (except the Incubator) | Heavy script stack and site speed tooling. Test carefully against our frame budget. |
| **Monumetric (Propel)** | ≥ **10,000 pageviews/mo**, **$99 setup fee**, **at least six ad units** ([Neworm](https://newormedia.com/blog/adpushup-vs-monumetric-vs-newor-media/), [Blogging Guide](https://bloggingguide.com/monumetric-review/)) | ~70% (unverified) | $10 (unverified) | Medium | Yes at 10k | **Poor.** We have 2–3 slots, not 6+. |
| **Playwire** | **500,000 pageviews/mo**, GA installed, IVT ≤ 7% ([Playwire](https://www.playwire.com/blog/eligibility-requirements-for-working-with-the-top-ad-monetization-platforms), [FAQ](https://www.playwire.com/faq)) | Negotiated (unverified) | (unverified) | Hard | No | **Great when big.** Gaming/education specialist with video, rewarded and refresh. |
| **Snigel (AdEngine)** | Reports conflict: ~100k pageviews with 20%+ tier-1 traffic, or about **€300/day** revenue ([publishergrowth](https://publishergrowth.com/software/snigel), [Snigel FAQ](https://snigel.com/faq)) | ~70–85%, often 80% NET30 (secondary sources) | (unverified) | Hard | No | Good. Gaming-friendly; works with many .io games. |
| **AdinPlay** | **No public minimum.** Strongest with established game portals; harder for solo devs ([AdinPlay](https://adinplay.com/publishers), [applixir](https://www.applixir.com/adinplay-alternatives-for-web-game-developers-2026/)) | Not published | Not published | Hard for small sites | Unclear, so ask | **Best fit on paper**: built for browser games, with video, rewarded, banners and header bidding |

**Game portals (distribution and monetisation together):** these bring their own players, so they help with the zero-traffic problem.

| Portal | Your share | Payout | Key conditions | Fit |
|---|---|---|---|---|
| **Poki** | **100%** of revenue on traffic you bring, **50/50** on Poki's traffic ([cinevva guide](https://app.cinevva.com/guides/publish-game-poki), [Poki docs](https://developers.poki.com/guide/working-with-poki)) | Wire / PayPal | Human review; Poki SDK; initial download < 8 MB; 16:9; **web exclusivity** ([cinevva](https://app.cinevva.com/guides/publish-game-poki)) | Exclusivity would clash with our own domain. Only consider it for a separate spin-off game. |
| **CrazyGames** | ~**60% of ad revenue** (from 2026 jam terms; not in the main docs) ([cinevva](https://app.cinevva.com/guides/publish-game-crazygames)) | **€100** min, monthly via Tipalti | CrazyGames SDK, its ads only | Good for a "Find-it" spin-off. Our 1.1 MB data plus three.js is a small build. |
| **GameDistribution** | **33%** of net revenue ([GD developer terms](https://static.gamedistribution.com/terms/developer.html)) | €100 | Syndicates to 4,000+ portals | Reach, but a low share |
| **GameMonetize** | **45%** to developers, plus 45% if you also host the game (90%) ([GameMonetize FAQ](https://gamemonetize.com/faq)) | **$30** PayPal/USDT, NET30 | Their SDK | Low bar, low RPM (my estimate) |

### 1.2 Recommended path by stage

| Stage | Monthly traffic | Do this |
|---|---|---|
| **0: Launch** | 0–1k visits | Buy the domain, add `ads.txt` (the legal and about pages are done), **apply to AdSense**, set up Ko-fi. Submit a spin-off quiz game to **CrazyGames** for exposure (optional). |
| **1: Prove it** | 1k–25k | AdSense in the 3 slots. Apply for **AdSense H5 Games Ads** (interstitial between Daily Challenge rounds, rewarded "hint"). Try **Journey** only if you add a blog/article section; otherwise skip it. |
| **2: Grow** | 25k–100k pageviews | If ≥ 50% of traffic is tier-1, apply to **Raptive** (ask whether they take app-style pages). Email **AdinPlay** and **Snigel** with traffic stats. |
| **3: Scale** | 100k–500k+ | **AdinPlay / Snigel / Playwire** (Playwire at 500k). Ezoic only at 250k+ users. Look at sponsorships (§4). |

### 1.3 Children / COPPA: decide this before you apply

- **COPPA** covers US sites **directed to children under 13**, and general-audience sites with *actual knowledge* of under-13 users. Ad cookies and device IDs count as personal information. If you're covered, you must tag ad requests **child-directed (TFCD)**, which turns off interest-based ads and remarketing ([Google: tag site or ad request](https://support.google.com/adsense/answer/3248194?hl=en), [Google Publisher Policies](https://support.google.com/adsense/answer/10502938?hl=en)).
- The **2025 COPPA Rule amendments** took effect 23 Jun 2025, with a **compliance deadline of 22 Apr 2026** (now in force). They require *separate* verifiable parental consent before sharing a child's data for targeted ads ([Jones Day](https://www.jonesday.com/en/insights/2025/05/ftc-finalizes-amendments-to-coppa--rule), [Hunton](https://www.hunton.com/privacy-and-information-security-law/ftc-publishes-final-coppa-rule-amendments)).
- **Amazon Associates bans sites directed to children under 13** ([Amazon policy coverage](https://mikeyounglaw.com/amazon-associates-child-policy-coppa-affiliate-websites/), [UK policies](https://affiliate-program.amazon.co.uk/help/operating/policies)).
- **Recommendation (done in the privacy page):** position EarthInteractive as **general audience** ("for curious people of all ages"). Don't use "for kids" or primary-school marketing, cartoon mascots or kid-targeted copy. Don't collect personal data. Keep the privacy policy honest about ads and cookies; it already promises to update before any ads go live.
  - Tagging: the marketing plan (§10.2) notes that Google now steers publishers from TFCD to **Tag for age treatment (TFAT)**. Check which one Google's help pages ask for when you set it up.
  - If you later sell to **classrooms**, ship a **`?classroom=1` / teacher mode with ads off** rather than tagging the whole site child-directed. This is my suggestion; get legal advice before marketing to under-13s.
  - The UK Children's Code and similar EU rules may also apply to child users (unverified detail; out of scope here).

### 1.4 GitHub Pages caveat

GitHub says Pages is "not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site, or … SaaS" ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [community discussion](https://github.com/orgs/community/discussions/37435)).
- A hobby site with a few banners is a grey area. Many such sites exist, but it is not explicitly blessed.
- **Cloudflare Pages' free tier explicitly allows commercial use** and has unlimited static bandwidth ([vpsranking](https://vpsranking.com/serverless/cloudflare-pages/), [freetiers](https://www.freetiers.com/directory/cloudflare-pages)). (Unverified against Cloudflare's own terms.)
- Low-effort option: keep GitHub Pages for now, and move hosting to Cloudflare Pages if ads start earning. A custom domain makes that move invisible to users and to AdSense.

---

## 2. Getting started with AdSense, step by step

### 2.1 Why the domain comes first

- AdSense now only accepts **registrable domains**, or subdomains on platforms that are on the **Public Suffix List** ([AdSense site management change](https://support.google.com/adsense/answer/12170421?hl=en)). `github.io` **is** on the PSL, so the AdSense "site" would be `john-redman.github.io`, not `/earth-interactive/` ([gibbok guide](https://gibbok.github.io/myvar/github/configure-google-adsense-for-github-pages-usernamegithubio-sites/), [richoh86 example](https://github.com/richoh86/richoh86.github.io)).
- **`ads.txt` must sit at the root** (`https://john-redman.github.io/ads.txt`). A project site at `/earth-interactive/` can't serve that. You would need a second repo called `john-redman.github.io` just to hold `ads.txt`.
- So it is *technically possible* on github.io, but you would get approved on a host you plan to leave, under GitHub's ToS grey area. When you move, you lose the review history and SEO.
- **Buy the domain first, then apply once.**

### 2.2 Prerequisites checklist (site side)

| Item | Notes |
|---|---|
| Custom domain + HTTPS | GitHub Pages issues certificates automatically. `.app`/`.dev` are HSTS-preloaded (HTTPS required), which is fine. Steps: [docs/launch-checklist.md](../launch-checklist.md). |
| `ads.txt` at the domain root | `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0` (your publisher ID from AdSense) ([Google ads.txt guide](https://developers.google.com/adsense/platforms/direct/ads-txt)). **Add `ads.txt` to the copy line in `.github/workflows/pages.yml`**, because the workflow only publishes the listed files. (The text pages are already published: `tools/build-pages.mjs` copies them at deploy.) |
| **Privacy policy** | **(done:** `privacy.html`). It already covers Google/partner ad cookies and the consent message (as "if and when ads are shown"), local storage, the leaderboard, GoatCounter and the general audience. Before ads go live: rewrite the Advertising section in the present tense, add the newer local-storage keys (`ei-music`, `ei-daynight`, `ei-intro`, `ei-tip-tag`, `ei-cotd-seen`), drop the outdated Google Fonts paragraph (the font is self-hosted now), and add the contact email once it exists. |
| **Cookie consent (EEA/UK/CH)** | A **Google-certified, TCF-integrated CMP** is required for personalised ads in the EEA and UK (since 16 Jan 2024) and Switzerland (since 31 Jul 2024) ([Google requirement](https://support.google.com/adsense/answer/13554116?hl=en)). Use AdSense → **Privacy & messaging → European regulations message**, which is **free and certified** ([webnots how-to](https://www.webnots.com/how-to-setup-gdpr-consent-message-in-google-adsense-account/), [secureprivacy](https://secureprivacy.ai/blog/adsense-certified-cmp)). Add the US-states message too. |
| Terms of use | **(done:** `terms.html`). Short: as-is, no warranty, data sources and licences, border-view disclaimer. |
| About / contact | **(done:** `about.html`, `contact.html`). Contact goes to GitHub issues until `contactEmail` is set. |
| Original, crawlable content | **(done)** This was the biggest risk: AdSense sees a mostly empty HTML page with a canvas. The site now has six hand-written pages (About, How to play, Why maps lie, Privacy, Terms, Contact) and generated plain-HTML pages: 217 countries (`countries/<slug>/`), 150 comparisons, 27 region hubs and 3 rankings, 406 URLs in all ([docs/seo.md](../seo.md)). That is well past the 5–15 pages that help against "low value content" ([adsenseaudit](https://adsenseaudit.net/guides/low-value-content-adsense), [theguidex](https://theguidex.com/google-adsense-approval/)). |
| Navigation | **(done)** A small link row under the brand on the globe (a menu on phones) and a footer on every text page. |
| Search Console + sitemap | `sitemap.xml` is generated at deploy **(done)**. Still to do: verify the domain in Search Console and submit it ([docs/seo.md](../seo.md) → Owner setup). |

### 2.3 Applying and the timeline

1. Create an AdSense account with your Google account. Add the site (`yourdomain.tld`).
2. Paste the verification snippet (`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…" crossorigin="anonymous"></script>`) into `index.html` `<head>`. Upload `ads.txt`.
3. Request review. Typical reviews take **a few days to about 4 weeks**; some 2026 reports say 2–3 months ([adsenseaudit](https://adsenseaudit.net/guides/adsense-approval-time), [webtimize](https://webtimizesolutions.com/blog/adsense-approval-new-website-2026/)). If rejected, fix the issues and wait a few weeks before reapplying.
4. **While you wait:**
   - Text pages: done.
   - Set up the Privacy & messaging CMP.
   - Create the Ko-fi page and set `kofi`.
   - Submit to Search Console.
   - Launch: the marketing plan §3, with copy in [launch-kit.md](launch-kit.md) (r/InternetIsBeautiful, r/geography, r/MapPorn, Show HN, Product Hunt, teacher communities; general audience).
   - Build a CrazyGames spin-off if you want portal traffic.
5. Once approved:
   - Create **3 display ad units with fixed sizes**: 160×600 (side), 728×90 (bottom), and 320×50 (mobile bottom; choose fixed-size units, not responsive).
   - Apply for **H5 Games Ads** separately ([Get started](https://support.google.com/adsense/answer/9959170?hl=en)).
   - Leave **Auto ads OFF**. Auto ads would inject anchors and vignettes over the globe.

### 2.4 Wiring the code into `js/ads.js`

- **Today:** `ADS.enabled` is `true` and every slot's `html` is `null`, so visitors see empty "Advertisement" placeholder boxes: two side slots (160×600 or 120×240) on screens at least 1100 px wide, and one bottom banner (728×90, 468×60 or 320×50) on narrower ones, which also shrinks the stage. Decide before launch whether to hide them (`ADS.enabled = false`) until a network is approved; the marketing plan §3.1 suggests hiding them.
- `mountAds()` writes `ADS.slots[side].html` with **`innerHTML`, which does not run `<script>` tags**. So:
  - Load `adsbygoogle.js` **once** in `index.html`.
  - Put only the `<ins>` element in the slot.
  - Call `adsbygoogle.push({})` **after** the slot is painted.
- `sw.js` already lets cross-origin ad requests bypass the cache (`if (!sameOrigin && !FONTS.test(...)) return;`), so no service-worker change is needed.

```html
<!-- index.html <head> -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossorigin="anonymous"></script>
```

```js
// js/ads.js: example config (sizes must match the unit sizes created in AdSense)
const unit = (slot, w, h) =>
  `<ins class="adsbygoogle" style="display:inline-block;width:${w}px;height:${h}px" data-ad-client="ca-pub-XXXX" data-ad-slot="${slot}"></ins>`;
// In paint()/paintBottom() (or via EarthInteractive.ads.set) after setting innerHTML:
//   try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
```

Things to watch:
- **Sizes change on resize.** `apply()` repaints when the best-fit size changes (160×600 to 120×240, or 728×90 to 468×60 to 320×50), and each repaint is a new ad request.
  - Create one ad unit per size and pick the slot ID by size.
  - Throttle repaints. Don't repaint on every resize event, only when the size bucket changes, which is what the code already does.
  - AdSense **forbids automatic refresh** of ads without user action, so never re-push on a timer.
- **No ads over or inside the canvas, and no "click"-bait placement.** Our slots are outside the stage, which is good. Keep a visible "Advertisement" label (the placeholder already has one).
- **Performance:** ad iframes run on the main thread. Run `?quality=low` on a phone with ads on and check that the perf governor doesn't drop to a blurry pixel ratio. If it does, lazy-load ads after the first globe frame (`requestIdleCallback`).
- **CLS:** slots already have fixed width and height before the ad loads, so layout shift is zero. Keep it that way.

---

## 3. Realistic revenue

### 3.1 Benchmarks found

| Source | Niche | Figure |
|---|---|---|
| [WordStream display benchmarks 2026](https://www.wordstream.com/blog/display-video-ads-benchmarks) (via search summary) | Education CPM | $2.95 Google Display Network, $5.60 programmatic, $7.65 PMP |
| same | Gaming CPM | $2.20 GDN, $4.45 programmatic, $6.10 PMP |
| [monetizationguy: session RPM](https://monetizationguy.com/minis/so-what-exactly-is-session-rpm) / [revenuelab.fyi](https://www.revenuelab.fyi/blog/website-rpm-benchmarks-2026) (via search summary) | Web gaming | **$2–6 session RPM** (young audience, high ad-block rate) |
| same | Tech/education content | $12–18 typical, $25 top quartile (content sites with many ads/page) |
| [adstimate](https://adstimate.com/blog/niche/education-adsense-rpm.html) | Education AdSense | $15–30 RPM. **Treat as optimistic:** text-heavy US blog pages, not a canvas app. |

### 3.2 What that means for us (my estimate)

- **One page load per visit.** It's a single-page app, so pageviews ≈ visits, and long sessions don't create new impressions. AdSense doesn't refresh.
- **1–2 ad units per page.** Desktop gets 2 side units (≥ 1100 px wide); phones and tablets get 1 small banner.
- **Thin contextual signal.** The page has little text, so contextual targeting is weak, and the EEA no-consent share earns less.
- Assumed **effective RPM per 1,000 visits:** low **$0.50**, mid **$1.50**, high **$4** (high means mostly US/UK desktop traffic plus H5 interstitials).

| Target / month | at $0.50 RPM | at $1.50 RPM | at $4 RPM |
|---|---|---|---|
| **$10** | 20,000 visits | ~6,700 | 2,500 |
| **$100** | 200,000 | ~67,000 | 25,000 |
| **$1,000** | 2,000,000 | ~670,000 | 250,000 |

AdSense pays only once the balance reaches **$100**. At $10/mo, that means one payment about every 10 months.

---

## 4. Alternatives and complements

| Option | Cost / fee | Fit | Notes |
|---|---|---|---|
| **Ko-fi** | **0%** on one-off tips (Free plan); 5% on memberships/shop; Gold $12/mo removes fees ([SchoolMaker](https://schoolmaker.com/blog/ko-fi-pricing)) | ★★★ | Start here. The "Support" links are already wired (globe link row, every footer, About, Contact) and appear once `kofi` is set. Plus a supporter perk: **"remove ads"** via a Ko-fi membership and a code stored in localStorage (honour system, no accounts). |
| Buy Me a Coffee | 5% plus Stripe fees ([SchoolMaker](https://schoolmaker.com/blog/buy-me-a-coffee-pricing)) | ★★ | Same idea, higher fee |
| Patreon | ~8–12% plus processing (10% standard for new creators from Aug 2025, per [unilink](https://app.unilink.us/blog/patreon-vs-buymeacoffee-vs-kofi-2026)) | ★ | Only if you post regular updates or extra content |
| **Affiliate** (globes, atlases, map posters, geography books) | Amazon: physical books ~4.5%, toys ~3% ([azonpress](https://azonpress.com/amazon-affiliate-commission-rates/)); **3 qualifying sales in 180 days** or the account is closed ([getaawp](https://getaawp.com/blog/amazon-affiliate-program-requirements/)) | ★★ | **Not allowed on child-directed sites** (§1.3). One "Get a real globe" link on the country card or about page, with an affiliate disclosure. Also consider map-poster and print shops (Etsy/Awin; unverified rates). |
| **Sponsorship** | Direct deals | ★★ (later) | Natural sponsors: atlas/globe makers, language-learning apps, travel/eSIM brands, edtech. Use the existing slots (`ads.set(side, '<a><img></a>')`) or a "Daily Challenge presented by …" line. Pitch at 10k+ monthly visits with a simple media kit (visits, countries, devices). |
| **Classroom / teacher licence** | Later | ★★★ (long-term) | Ad-free teacher mode plus class quiz codes, lesson plans, offline/PWA. Use a school site licence (~$X/year; price untested) rather than per-student billing, and avoid collecting any student data. Ad-free also solves COPPA for school use. |
| Game portals (§1.1) | Rev share | ★★ | A spin-off "Find-it / Daily Challenge" game on CrazyGames/Poki for traffic, linking back "Explore the full globe at …" (check each portal's outbound-link rules; unverified). |

---

## 5. Domains

### 5.1 Price table (first year → renewal, USD/yr)

Cells marked "?" were not found. Figures come from aggregator or search summaries because the registrars' own pages were blocked here, so **check at checkout**. Cloudflare charges at cost and the same price every year, but only for TLDs it supports and only with Cloudflare DNS.

| TLD | GoDaddy | Cloudflare | Porkbun | Namecheap | Notes |
|---|---|---|---|---|---|
| **.com** | $9.99–11.99 promo → **$22.99** ([stackscored](https://www.stackscored.com/pricing/domain-registrars/godaddy/), [digitalhosting](https://digitalhosting.com/articles/godaddy-renewal-prices)) | **$10.46 → $10.46** ([tld-list](https://tld-list.com/registrars/cloudflare), [startupowl](https://startupowl.com/reviews/cloudflare-registrar)) | ~$11.08 → ~$11.08 (sources: $9.73–11.80) ([affmaven](https://affmaven.com/porkbun-vs-namecheap/)) | promo → **$18.48** ([elvisonunwa](https://elvisonunwa.com/vs/cloudflare-vs-porkbun-vs-namecheap)) | Most trusted |
| **.app** | ? → **~$28.19** (unverified) ([tldspy](https://tldspy.com/registrar/godaddy)) | **$14.20 → $14.20** | **$8.75–9.81 → $14.93** ([domainoffer](https://domainoffer.net/tld/app/porkbun)) | ? → **$22.98** | HTTPS-only (HSTS preload). Google registry. Credible. |
| **.dev** | ? | **$12.20 → $12.20** | ? | ? | HTTPS-only. Reads as "developer". |
| **.org** | ? | **$11.20 → $11.20** | ? | ? | Trusted; reads "non-profit/educational" |
| **.io** | ? | **$50 → $50** (another source: $44.95) | ? → **$51.80** | ? → **$75.98** ([tldspy](https://tldspy.com/tld/io), [findcheapdomain](https://findcheapdomain.com/tld/io/)) | Expensive. Long-term uncertainty over the British Indian Ocean Territory sovereignty change (unverified status). |
| **.earth** | ? | ? (support unverified) | **$14.96 → $15.96** ([tld-list](https://tld-list.com/tld/earth)) | $19.98 → ? | Perfect theme; low abuse; less familiar |
| **.world** | ? | ? | ~$33 → ~$31 (unverified) ([search](https://porkbun.com/products/domains)) | ? → **$52.98** | Pricey for what it is |
| **.games** | ? | ? | $7.43 promo → ? | ? → **$42.98** | Expensive renewal |
| **.fun** | ? | ? | **$1.57 → $31.41** | ? → $32.98 | Classic cheap-promo, expensive-renewal TLD |
| **.xyz** | ? | **$12.00** (unverified) | ? → **$14.21** | ? → $21.48 ([tldbee](https://www.tldbee.com/tlds/xyz)) | Abuse reputation (below) |
| **.co** | ? | ? | ? → **$25.97** | ? → **$39.98** ([affmaven](https://affmaven.com/porkbun-vs-namecheap/)) | Often mistaken for typo'd .com |
| **.us** | ? | **$6.50** (unverified) | $7.00 → $4.43 (unverified; looks odd) | ? | **Requires US nexus**; WHOIS privacy not allowed for .us (unverified) |
| **.live / .zone / .quest** | ? | ? | $9.66 / $8.24 / $14.21 renewal (**low confidence**, search snippet only) | .live → $39.48 | Not recommended |
| **.site / .online** | ? | ? | ? | ? | Not found. These are promo-bait TLDs with high renewals and abuse reputation. |

### 5.2 Trust, SEO and ad networks

- **SEO:** Google treats generic TLDs (gTLDs) the same as `.com` for ranking. Country codes (`.us`, `.co`, `.io`) are mostly treated as generic too, except true ccTLDs which geo-target. (Google's public guidance; not re-verified this session.)
- **Trust and email deliverability:** Spamhaus's Oct 2025 – Mar 2026 data puts **.top (#2)** and **.xyz (#3)** among the most-abused TLDs. **.online** and **.site** have a high share of newly observed (often throwaway) domains ([Spamhaus domain reputation](https://www.spamhaus.org/resource-hub/domain-reputation/domain-reputation-update-oct-2024-mar-2025/), [Ubilibet](https://www.ubilibet.com/en/the-most-commonly-used-domain-extensions-for-fraud-in-2025/)). Ad-tech fraud filters, school web filters and spam filters are more suspicious of these. **Avoid** them for a site that wants AdSense approval and school use.
- **Schools:** district content filters are more likely to block odd new gTLDs (my estimate). `.com`, `.org` and `.app` are the safest choices.

### 5.3 Recommendation

1. **`.com` at Cloudflare (~$10.46/yr flat)** if you can get a short, clear name.
2. Otherwise **`.app` at Cloudflare or Porkbun (~$14–15/yr renewal)**. It is credible, HTTPS-only (GitHub Pages handles this) and fits an interactive app.
3. Thematic alternative: **`.earth` at Porkbun (~$16/yr)**.
4. Skip `.io` (≥ $50/yr), `.world`, `.games` and `.fun` (renewals of $30–53) and `.xyz`/`.online`/`.site`/`.top` (reputation).
5. Avoid GoDaddy unless it's a deal you'll transfer out of. Its renewals are about 2× Cloudflare/Porkbun.
6. Turn on **auto-renew** and registrar lock. Use a mailbox you'll keep (e.g. Cloudflare Email Routing to Gmail) for the registrant email.

---

## 6. Name candidates

**I could not check availability.** RDAP (`rdap.org`), Porkbun, GoDaddy and Cloudflare were all blocked by this sandbox's egress proxy. Check each name yourself in about a minute:
- `https://rdap.org/domain/<name>`: HTTP 404 usually means unregistered.
- Or the Porkbun / Cloudflare search box.
- Then search **USPTO (tmsearch.uspto.gov)** and **EUIPO** for the word mark.

Superseded by the owner's private brand plan; kept for history.

| # | Name | What web search turned up (not an availability check) | Trademark / confusion notes |
|---|---|---|---|
| 1 | **earthinteractive.app** | Only our own GitHub repo and site showed for "EarthInteractive" ([search](https://github.com/john-redman/earth-interactive)) | Generic words; low risk. **Top pick if free.** |
| 2 | earthinteractive.com | Not checked; possibly parked (unverified) | Same as above |
| 3 | earthinteractive.earth | n/a | Repetitive, but on-theme |
| 4 | globetrue.com | No obvious site seen | Low risk |
| 5 | truesize.world / truesize.app | n/a | **Caution:** *The True Size Of…* (thetruesize.com) is well known in this exact feature space. Confusion risk. |
| 6 | spintheglobe.app | Several "Spin the Globe" travel blogs exist (spintheglobe.net, spintheglobeproject.com) ([search](https://spintheglobe.net/dir/)) | Crowded name, weak brand |
| 7 | globequest.app | "GlobeQuest" is used by a travel club and a travel-tracking app (globequest.nl) | Crowded; check marks |
| 8 | worldsize.app | No site found | Low risk; descriptive |
| 9 | countrysize.app | n/a | Descriptive; weak brand but good SEO intent |
| 10 | mapmash.app | n/a | Doesn't say "globe" |
| 11 | geoglobe.fun | n/a | `.fun` renewal ~$31; skip the TLD |
| 12 | *my additions:* **realglobe.app**, **trueglobe.app**, **globecards.app**, **spinearth.app** | not checked | Short, descriptive, no known conflicts (unverified) |

**Trademark caution:**
- Avoid names that echo **Globle**, **Worldle** (the NYT opposed the "Worldle" trademark application over its similarity to *Wordle*; [Mondaq](https://www.mondaq.com/canada/trademark/1521262/worldle-faces-a-wordle-hurdle), [Wikipedia](https://en.wikipedia.org/wiki/Worldle)), **GeoGuessr**, **Google Earth** and **The True Size Of**.
- Avoid "-le" daily-game names and "Earth" names that look like Google Earth's branding.

---

## 7. Do this next (in order)

1. **(done)** Audience stance: general audience, not "for kids". The privacy page says so.
2. **Pick the name and check it.** Superseded: the choice is in the owner's private brand plan. Still check
   availability via RDAP/Porkbun and trademarks via USPTO/EUIPO before buying.
3. **Buy the domain** at Cloudflare (`.com`/`.app`) or Porkbun (`.earth`). Turn on auto-renew, registrar lock and WHOIS privacy.
4. **Point it at GitHub Pages:** follow [docs/launch-checklist.md](../launch-checklist.md) (service-worker change
   two weeks before, custom domain, Enforce HTTPS, switch the URLs in `tools/site.config.mjs`, `js/site.js` and
   `index.html`). Use DNS-only, not Cloudflare-proxied, while the certificate issues.
   - (Optional later: move to Cloudflare Pages for clearly allowed commercial use.)
5. **(done)** Pages: `about.html`, `privacy.html`, `terms.html`, `contact.html`, `how-to-play.html`,
   `why-maps-lie.html`, plus the generated country, comparison, region and ranking pages, with a footer on every
   page.
6. **Search Console:** verify the domain and submit `sitemap.xml` (it already exists); Bing; one IndexNow ping
   ([docs/seo.md](../seo.md)).
7. **Ko-fi page**, then set `kofi` (the footer links are already wired).
8. **Apply to AdSense:**
   - Put the snippet in `<head>`.
   - Publish `ads.txt` at the root (and add it to `pages.yml`).
   - Set up the **Privacy & messaging** GDPR message (EEA/UK/CH) and the US-states message.
   - Update the privacy page's Advertising section first.
   - Leave Auto ads off.
9. **While in review:** launch (marketing plan §3, copy in [launch-kit.md](launch-kit.md)) and an optional
   CrazyGames spin-off. Decide whether the empty ad placeholders stay visible meanwhile (§2.4).
10. **On approval:**
    - Create fixed-size units (160×600, 120×240, 728×90, 468×60, 320×50).
    - Wire them into `js/ads.js` with `adsbygoogle.push({})` after painting.
    - Test 1280×800, 390×844 and `?quality=low`.
    - Apply for H5 Games Ads.
11. **Monthly:** review traffic and RPM. At **25k pageviews** with mostly tier-1 traffic, apply to Raptive or contact AdinPlay/Snigel. At **500k**, apply to Playwire.
12. **Later:** sponsorship media kit (10k+ visits), then an ad-free teacher/classroom mode and licence.

---

### Unverified or blocked during this research

- **Direct page fetches were blocked** for support.google.com, docs.github.com, adinplay.com, poki.com, crazygames.com, porkbun.com, tld-list.com, tldspy.com, rdap.org and makethatseachange.com. All figures from these come from search-engine summaries.
- **Domain availability:** none checked (RDAP and registrars blocked).
- **Ezoic's 250k-users rule** (Feb 2026) comes from a single secondary source.
- **Not published:** AdinPlay's revenue share and minimums, Playwire's revenue share, Snigel's exact threshold.
- **Not found:** Mediavine main, Raptive and Monumetric payout minimums.
- **Domain prices:** most GoDaddy prices for TLDs other than `.com`; Cloudflare's support for `.earth`/`.world`/`.fun`/`.games`; and the odd-looking Porkbun `.us`/`.live`/`.zone` renewals.
- **Other:** current `.io` registry status; the exact AdSense TFCD tag syntax (follow Google's help page); Cloudflare Pages' commercial-use terms (confirm on Cloudflare's own site).
