# EarthInteractive — Marketing Plan

*Written 5 October 2026 for the product owner (John). Revised 9 October 2026 against the product as it is now
(CHANGELOG `[Unreleased]`). Covers about 90 days: the four weeks before launch and the nine weeks after it.*

> **Dates are relative to go-live.** Launch waits for the domain purchase, so the fixed October 2026 dates are
> gone. **L day** is the day the launch posts start, on the domain. "L−14" means 14 days before it, "L+3" three
> days after. Allow about four weeks from buying the domain to L day: the service-worker step must ship two weeks
> before the switch ([docs/launch-checklist.md](../launch-checklist.md)), and the domain should settle for a week
> or two before traffic arrives. Pick a **Monday** as L day so the Show HN and Showoff Saturday slots land on the
> right weekdays. Ready-to-paste copy for every channel is in [launch-kit.md](launch-kit.md).

**Live:** https://john-redman.github.io/earth-interactive/ (moves to the custom domain once it's bought)
**Constraints:** one person, low budget, static hosting on GitHub Pages. The leaderboard is built (Cloudflare
Worker + D1, or Node + SQLite) but stays dormant until it's deployed after the domain switch.

How to read this:
- Each **[source]** link points to where a claim comes from.
- **(Assumption)** marks my own judgement, or something I could not verify. Check it before relying on it.
- No traffic or conversion numbers are promised anywhere. The targets in section 8 are starting guesses for you to replace with your own baseline after week 2.
- Subreddit rules change often. Before every post, open the sidebar and read the rules. Where I could not verify a sub's rules, the plan says so.

---

## Contents

1. [Positioning & audiences](#1-positioning--audiences)
2. [Domain name ideas](#2-domain-name-ideas)
3. [Launch plan](#3-launch-plan)
4. [Content engine](#4-content-engine)
5. [Growth loops built into the product](#5-growth-loops-built-into-the-product)
6. [Linking game styles: the Game Hub](#6-linking-game-styles-the-game-hub)
7. [Education channel](#7-education-channel)
8. [Metrics & tools](#8-metrics--tools)
9. [90-day roadmap & budget tiers](#9-90-day-roadmap--budget-tiers)
10. [Risks](#10-risks)

---

## 1. Positioning & audiences

### Positioning statement

> **EarthInteractive is the globe that tells the truth about size.** Spin a true-to-scale 3D Earth, pull countries out like puzzle pieces to compare their real size, and play a daily geography challenge. It's free, it runs in your browser, and there's no sign-up.

What sets it apart from the well-known alternatives (true as of today's feature set):

| Others do… | EarthInteractive does… |
|---|---|
| Flat Mercator maps, where Greenland looks as big as Africa | A real sphere, so nothing is distorted to begin with |
| True-size tools that drag shapes across a flat map | Countries lift out as **3D puzzle pieces** you drag around the globe, plus a side-by-side stats table and a square share image |
| Guessing games that are only a game | An explorer, a data lens, a compare tool and games in one place, all reachable from a single link |
| One political map | **Three border views** (UN / De facto / Neutral) with the reasoning written down |
| A flat blue background behind the countries | A calm, satellite-style ocean with 33 named currents, cargo ships on the sea lanes and real-time day and night |

### Audiences

| Audience | One-line pitch | Where they are | Feature to lead with |
|---|---|---|---|
| **Students & teachers** | "A free globe your class can explore, compare and quiz on, with nothing to install and no logins." | Teacher Facebook groups, X/Bluesky edu-community, TpT, Google Classroom, district tech coordinators | True-size compare (the Mercator lesson), country cards, Daily Challenge and Find it; teacher mode later |
| **Geography nerds** | "Every country, three border views, real sizes, and a daily challenge that punishes 'roughly over there'." | r/geography, r/MapPorn, geography Discords, GeoGuessr community | Distance scoring, the miss line, Daily Challenge, Country of the day, the three views |
| **Casual daily-puzzle players** | "Five countries. One globe. Same puzzle for everyone today. Share your squares." | Wordle-style share threads, group chats, X, Facebook | Daily Challenge plus the emoji grid |
| **Map & data-viz fans** | "Colour the whole planet by population, density or GDP per person, on a real sphere." | r/dataisbeautiful, r/InternetIsBeautiful, HN, Bluesky dataviz | Data lenses, ocean currents with names and speeds, live day/night |
| **Travellers** | "See how big your next trip really is. Lay Japan over California, Italy over your home state." | r/travel-adjacent subs, TikTok/Reels travel content, Pinterest | Compare links (`?compare=JPN,USA`), Move (drag one country anywhere) and country cards |
| *Bonus:* **Web devs / Three.js people** | "A no-build WebGL globe: every country in 3 draw calls, ~80 ships in one, and a stencil trick for seamless fills. Here's how." | r/threejs, r/webdev Showoff Saturday, Three.js forum, HN | The tech write-up (triangulation, stencil, batching, mobile tier) |

### Core hook lines (reuse everywhere)

1. **"Your map has been lying to you."** *(Mercator hook, the strongest.)*
2. **"Pull a country off the globe and drop it somewhere else."**
3. **"Greenland vs Africa. Watch."** *(any big "surprise" pair. The app compares countries, not continents, so
   show Greenland next to DR Congo, which alone is bigger; Africa as a whole is about fourteen times Greenland.)*
4. **"Same 5 countries for everyone today. How close can you get?"**
5. **"Flick the globe hard. Turn your sound on."** *(easter egg, built for TikTok)*
6. **"One globe, three borders. Who draws the map?"** *(use carefully, see §10)*
7. **"How big is Texas, really?"** *(the SEO and travel hook)*

---

## 2. Domain name ideas

> The name choice now lives in the owner's private brand plan (linked from
> [docs/launch-checklist.md](../launch-checklist.md)). This section is kept as background; refer to "the domain"
> in new copy.

**Price notes.** These are Porkbun list prices; first-year promos differ from renewals, so check before buying.
- Porkbun: .app $14.93/yr, .earth $15.96, .games $27.29, .fun $31.41, .world $33.47 at renewal. .world and .fun have cheap first years but much higher renewals [[Porkbun .app](https://porkbun.com/tld/app), [.earth](https://porkbun.com/tld/earth), [.fun](https://porkbun.com/tld/fun), [.games](https://porkbun.com/tld/games)].
- Cloudflare Registrar sells at cost, for example .app at about $14.20 [[tldspy](https://tldspy.com/registrar/cloudflare)].
- **Budget the renewal price, not the promo.**

**TLD caveats**

- **.app** is HTTPS-only: browsers enforce it through the HSTS preload list. That's fine on GitHub Pages, which issues certificates, but the site won't load over plain HTTP while the certificate is pending. *(Assumption, based on how the Google-run .app registry is widely documented.)*
- **.earth / .world**: on-theme and credible. .world renews high.
- **.fun / .games**: playful, but renewals are about twice .app.
- **.xyz**: very cheap. Its reputation for spam means some corporate and school filters treat it with suspicion. *(Assumption. That matters here, because school networks are a target audience.)*
- **.io**: avoid. Its long-term future is uncertain after the UK–Mauritius agreement on the Chagos Islands, and it's priced as a tech TLD. *(Assumption, verify current status.)*
- **.site / .zone / .quest**: cheap and neutral, with weaker credibility. Fine as a redirect, not as the main brand.

**Trademark caution (do not approach these):**
- **Worldle**, run by Teuteuf Games [[Teuteuf](https://teuteuf.fr/)]. The New York Times has already taken a "-dle" geography spinoff to a legal dispute over confusion [[AOL](https://aol.com/war-wordle-york-times-legal-105215546.html)]. **Avoid any `-dle` suffix.**
- **Globle**, **GeoGuessr**, **Seterra**, and **The True Size Of**: don't use names close to these. For example, avoid "truesizeof", "geoguess", "globl", "seterra".
- Before buying, search USPTO (TESS), EUIPO and UKIPO for the exact word in classes 9 and 41 (software and games/education). *(General advice, not legal advice.)*

### Name ideas (availability not checked)

**Descriptive**

Superseded by the owner's private brand plan; kept for history.

| # | Name | Notes |
|---|---|---|
| 1 | `earthinteractive.app` | Keeps the current brand and GitHub history. Clear, credible and school-friendly. |
| 2 | `earthinteractive.earth` | Repeats "earth" twice. Works as a redirect. |
| 3 | `truescale.earth` | Owns the "true scale" idea without echoing "The True Size Of". |
| 4 | `realsize.earth` | Very literal. Check it isn't too close to "true size" products. |
| 5 | `globescale.app` | Descriptive, neutral, easy to spell aloud in class. |
| 6 | `worldscale.app` | Same idea. Slightly more generic. |
| 7 | `spintheglobe.app` | Says exactly what you do. Long. |
| 8 | `sizeof.earth` | Clever, and doubles as a nerdy nod (`sizeof`). Fits the compare angle. |

**Playful**

Superseded by the owner's private brand plan; kept for history.

| # | Name | Notes |
|---|---|---|
| 9 | `spinthe.world` | A domain hack. Memorable, but .world renews high. |
| 10 | `flickthe.world` | Plays on the rollercoaster easter egg. |
| 11 | `whirled.earth` | A "world/whirled" pun. People will misspell it. |
| 12 | `globetrot.fun` | Travel tone. .fun renews high. |
| 13 | `planetpuzzle.app` | Matches the puzzle-piece compare. Child-friendly. |
| 14 | `dizzy.earth` | Rollercoaster and spin energy. Short. |
| 15 | `mapnerd.games` | Self-aware and community-flavoured. Narrower appeal for teachers. |
| 16 | `howbig.earth` | Matches search intent ("how big is…"), which is good for SEO. |

**Short brand**

Superseded by the owner's private brand plan; kept for history.

| # | Name | Notes |
|---|---|---|
| 17 | `orbly.app` | Short and ownable. Check it isn't an existing app name. |
| 18 | `terrao.app` | From "terra". Neutral and international. |
| 19 | `globa.app` | Very short. May collide with existing companies. |
| 20 | `atlasy.app` | Friendly. "Atlas" is crowded, so check trademarks. |
| 21 | `meridio.app` | Evokes meridians. Sounds like a startup. |
| 22 | `kartio.app` | From "carto". Hard to guess the spelling from hearing it. |
| 23 | `geospin.app` | Clear meaning. The "geo-" prefix is crowded. |
| 24 | `orbit.quest` | Game-flavoured. .quest has less credibility for schools. |

### Top 5 picks

Superseded by the owner's private brand plan; kept for history.

| Rank | Name | Why |
|---|---|---|
| 1 | **earthinteractive.app** | No rebrand cost. Existing links, OG tags and the repo all match. .app is cheap to renew, HTTPS-only and reads "legit" to teachers. The safest choice. |
| 2 | **howbig.earth** | Matches the exact search phrase behind the programmatic SEO pages (§5), and works as a hook in videos ("howbig.earth/texas-vs-france"). Can redirect to #1 or become the main brand. |
| 3 | **truescale.earth** | Says what makes the product different. Distinct enough from "The True Size Of". |
| 4 | **planetpuzzle.app** | Best fit for the puzzle-piece compare and for kids and classrooms. Good if the game hub (§6) becomes the centre of the product. |
| 5 | **spinthe.world** | The most memorable to say aloud in a TikTok. Mind the .world renewal price (about $33/yr). |

**Recommendation (assumption).** Buy #1 as the canonical domain. Also buy #2 if it's available at a normal price, and use it in videos and short links with a 301 redirect to #1. Two domains cost roughly $30/yr at list prices.

---

## 3. Launch plan

### 3.1 Pre-launch checklist (L−28 to L−1)

**Must have, or the launch will be judged on it:**

- [ ] **Custom domain** on GitHub Pages. Follow [docs/launch-checklist.md](../launch-checklist.md) in order:
  - **L−28 at the latest:** buy the domain and ship the `sw.js` change for the github.io host (step 1). It needs
    about two weeks before the switch, or returning visitors keep the old cached globe.
  - **About L−14:** point the domain at GitHub Pages and tick **Enforce HTTPS**, which can take up to 24 h to
    become available [[GitHub Docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)].
    GitHub then 301-redirects every old github.io URL, path for path.
  - **Same day:** switch the URLs (`url` in `tools/site.config.mjs`, `SITE_URL` in `js/site.js`, canonical, OG and
    JSON-LD in `index.html`), set `contactEmail`, then Search Console, Bing and one IndexNow ping
    ([docs/seo.md](../seo.md) → "Moving to the custom domain later"). Keep every slug.
- [x] **Fresher population/GDP data.** Done: World Bank WDI, population for 2025 and GDP mostly for 2024
  (CC BY 4.0). Every card shows the year; a few places the World Bank doesn't cover keep an older estimate.
- [ ] **Border-view editorial review** (roadmap item, still open). At minimum, say clearly where the De facto view
  has its documented known limitation ([docs/border-views.md](../border-views.md)), and say on the About page why
  De facto is the default view. See §10.1.
- [ ] **Analytics**: cookieless GoatCounter is already wired in (`js/analytics.js`; page views plus a few events)
  and stays off until the code is set in `tools/site.config.mjs` and `js/analytics.js`
  ([docs/seo.md](../seo.md) → Owner setup). Set it by L−14 so you have a baseline before launch.
- [x] **Privacy page** (`privacy.html`): exists. It covers local storage, the optional leaderboard, GoatCounter and
  how ads would work.
  - [ ] Touch-up before launch: it still says the globe loads its typeface from Google Fonts (the font is now
    self-hosted), and its list of local-storage keys predates `ei-music`, `ei-daynight`, `ei-intro`,
    `ei-tip-tag` and `ei-cotd-seen`.
- [x] **About page** (`about.html`): who made it, data sources and the three views in plain words. *How to play*
  explains each view too.
  - [ ] The written border rules ([docs/border-views.md](../border-views.md)) are only on GitHub. Publishing them as
    a text page linked from About gives border comments a one-link answer (see the launch kit's suggestions).
- [x] **Feedback route**: `contact.html` and the footer link to GitHub issues.
  - [ ] Set `contactEmail` once the domain has a forwarding address. Reply to every message in launch week.
- [x] **OG image**: exists (1200×630). All text pages share it (per-pair images were left out on purpose,
  [docs/seo.md](../seo.md)).
- [x] **Text pages, sitemap and search basics**: About, How to play, Why maps lie, Privacy, Terms and Contact; 217
  country pages, 150 comparison pages, 27 region hubs and 3 rankings; `sitemap.xml` (406 URLs), `robots.txt`,
  `llms.txt` and IndexNow, all generated at deploy.
  - [ ] Owner steps still to do: Search Console, Bing Webmaster Tools and the first IndexNow ping, best done once on
    the domain.
- [ ] **Ads decision.** The ad slots currently show empty "Advertisement" placeholder boxes (two side slots on
  screens 1100 px and wider, one bottom banner on narrower ones), because `ADS.enabled` is on with no network.
  *(Opinion: hide them for launch; HN and Reddit react poorly to ads on "Show" posts, and EEA ads need consent
  tooling anyway, §10.2.)*
- [x] **Clean share text**. The Daily result copies as `EarthInteractive Daily {date}`, the square grid, the score
  and a `?play=daily` link built from the current address, so it follows the domain by itself. It copies to the
  clipboard; the phone share sheet is still a suggestion (§5).
- [ ] **Accounts made by L−28, and actually used.** r/webdev wants accounts at least 14 days old with 25+ karma
  [[founderreply](https://founderreply.com/reddit/webdev)]. Spend 15 min a day commenting helpfully in your target
  subs (the 90/10 norm). Account setup: `marketing/README.md`.
- [ ] **Assets prepared**. `marketing/` already has screenshots, banners, stories and three videos (Greenland vs
  DR Congo, USA vs Australia, data lenses), but they were made on 5 October, before the calm ocean, ships, clouds
  and redrawn currents. Re-shoot anything that shows the ocean. Still to make: the Daily Challenge and
  rollercoaster videos, and one GIF of a piece lifting out. Scripts: [launch-kit.md](launch-kit.md) §6.
- [x] **Launch copy drafted** for every channel, in one doc: [launch-kit.md](launch-kit.md).
- [ ] **Smoke test on the domain (L−7 to L−1)**: phone (390×844), desktop (1280×800), `?quality=low`,
  `?compare=GRL,COD`, `?play=daily`, `?view=neutral`, a country page, a comparison page, the 404 page and an
  offline reload. Check that an old github.io link redirects and that the service worker serves the new origin.

### 3.2 Launch week, day by day (L to L+6)

L day is a Monday. All times are given in **US Eastern (ET)** and **UTC**; convert them to your own time zone, and
check whether daylight saving changes that week (the US and Europe switch on different dates in spring and
autumn). *(Your time zone is an assumption.)* About 57% of Reddit's users are in the US, according to
[[singlegrain](https://www.singlegrain.com/search-everywhere-optimization/best-times-to-post-on-reddit-for-maximum-engagement/)],
so ET is the reference.

The rhythm: one big community post per day, so you can reply to every comment for 2–3 hours afterwards. Never post the same link to several subs in one hour; that looks like spam and is treated as such. Copy for each post is in [launch-kit.md](launch-kit.md).

| Day | Primary action | Time | Secondary |
|---|---|---|---|
| **L (Mon)** | **Soft launch**: personal X, Bluesky, Mastodon and LinkedIn post ("I built this"). Send it to 10–20 friends and ask for honest bug reports, *not* votes. | 12:00–14:00 ET (16:00–18:00 UTC) | Fix anything that breaks. Check that analytics shows referrers. |
| **L+1 (Tue)** | **Show HN** (launch kit §2) | 09:00–10:00 ET (13:00–14:00 UTC). HN advice clusters on Tue–Thu, 14:00–17:00 UTC [[Alcazar](https://blog.alcazarsec.com/tech/posts/best-time-to-post-on-hacker-news)] | Stay at your keyboard for 4 hours and answer every technical question in depth. |
| **L+2 (Wed)** | **r/InternetIsBeautiful.** Frame it as *the globe/true-size explorer*, **not the games**: the sub bans web games, quizzes and puzzles, and sites requiring sign-up [[rankhog](https://rankhog.com/subreddits/internetisbeautiful), [gummysearch](https://gummysearch.com/r/InternetIsBeautiful/)]. | 07:00–10:00 ET [[webtonic](https://www.webtonic.io/blog/best-times-to-post-on-reddit-for-maximum-engagement)] | Post the "Greenland vs DR Congo" video to TikTok/Reels/Shorts (14:00–18:00 local) [[Sprout TikTok](https://sproutsocial.com/insights/best-times-to-post-on-tiktok/)] |
| **L+3 (Thu)** | **r/geography** or **r/MapPorn**, one only. Lead with an image or GIF and a genuine question ("Which pairing surprised you most?"). **I could not verify either sub's current rules on self-made sites.** Read the sidebar and message the mods first if it's unclear. | 08:00–10:00 ET | r/threejs: a technical post with a GIF and how the stencil, triangulation and batching work. |
| **L+4 (Fri)** | **r/SideProject.** It welcomes show-and-tell, but needs a story and context, not a bare link [[alldirectories](https://alldirectories.org/subreddit/r-sideproject/), [launchwake](https://www.launchwake.com/channels/r-sideproject)] | 07:00–09:00 ET | Email 5 newsletters/blogs (template in §7). Join 2–3 geography Discords and read their rules. |
| **L+5 (Sat)** | **r/webdev Showoff Saturday**, the only day self-promo is allowed there. Focus on technical details: stack, challenges, live demo [[founderreply](https://founderreply.com/reddit/webdev), [rankhog](https://rankhog.com/subreddits/webdev)] | Morning ET | Bluesky/Mastodon thread: "5 things I learned building a WebGL globe". |
| **L+6 (Sun)** | **Rest and review.** Write down referrers, top deep links, bug list and the best comments. | — | Draft the r/dataisbeautiful [OC] post for next week. |

**Week 2 follow-ups (L+7 to L+13):**
- **r/dataisbeautiful**: post a *static image or GIF* of a data lens (for example, population density on the globe) titled with **[OC]**. Your first top-level comment must state the data source(s) and the tool [[Wikipedia: r/dataisbeautiful](https://en.wikipedia.org/wiki/R/dataisbeautiful)]. Cite the World Bank WDI (population 2025, GDP mostly 2024), Natural Earth (areas) and "EarthInteractive (Three.js)". The data refresh is done, so this can go ahead.
- **r/WebGames**: rules unverified [[Mike Young](https://mikeyoung.ghost.io/subreddits-you-can-use-to-talk-about-your-game/) says they "are a bit different"]. Read the sidebar and lead with *Daily Challenge*, because this is where the game angle belongs.
- **r/Teachers / r/edtech**: education subs commonly ban direct self-promotion [[thinkacademy](https://www.thinkacademy.ca/blog/blog/2025/09/07/reddit-education-community-rules-guide-2/)]. **Don't post a link.** Ask the mods, or wait for a weekly resource thread, or simply answer "what do you use to teach map projections?" questions with a disclosed mention ("I made a free one"). Mod message and reply text: launch kit §3.

### 3.3 Hacker News — Show HN

Rules that matter: it must be something people can try, with no sign-up; you must be around to discuss it; and **don't ask anyone to upvote or comment** [[showhn.html](https://news.ycombinator.com/showhn.html)]. Show HN posts also live on the /show page after they fall off /new [[dev.to](https://dev.to/developuls/how-to-post-on-hacker-news-without-getting-flagged-or-ignored-2eaf)].

**Title options and first comment:** [launch-kit.md](launch-kit.md) §2. Titles must fit HN's 80 characters, so the
earlier "…to see their true size" option was too long. The first comment now covers the build honestly: plain ES
modules with no build step, every country in 3 draw calls, ~80 ships in one instanced draw call, the stencil and
triangulation tricks, the phone tier, World Bank data, and the fact that the source is public but all rights
reserved.

### 3.4 Product Hunt (later, not launch week)

- **When:** about L+21 to L+42, on a Tuesday to Thursday. If that window touches Geography Awareness Week (the third week of November) [[National Today](https://nationaltoday.com/geography-awareness-week/)] or GIS Day (the third Wednesday of November) [[gisday.com](https://www.gisday.com/en-us/overview)], use it as the education hook; otherwise skip the tie-in. The compare share image already exists; the leaderboard can be live by then.
- **Day and time:** Tue–Thu has the most engagement. Launch at **12:01 AM PT** to get the full 24-hour window [[fastwaitlist](https://blog.fastwaitlist.com/how-launch-successfully-product-hunt-2025), [launchpact](https://www.launchpact.io/blog/how-to-have-a-successful-product-hunt-launch)].
- **How:**
  - Build a list of people who liked the HN/Reddit posts and *ask them to "check it out"*, never to "upvote". Product Hunt penalises vote-begging [[fastwaitlist](https://blog.fastwaitlist.com/how-launch-successfully-product-hunt-2025)].
  - Post the maker comment straight away, and reply to every comment for the first 6 hours [same source].
  - Gallery: compare GIF, daily grid, data lens, phone screenshot. Re-shoot `marketing/banners/producthunt-gallery-*` first (they predate the ocean changes) and leave the border-view image out, or put it last (§10.1).
  - Tagline, description and maker comment: [launch-kit.md](launch-kit.md) §4.
- **Expectation (assumption):** without an existing audience, a solo consumer web toy rarely tops PH. Treat it as a backlink and a source of a few hundred curious visitors, not the main event.

### 3.5 Other channels at launch

| Channel | Norms & approach | Timing |
|---|---|---|
| **X/Twitter** | A thread: hook video, then 3 GIFs, then the link last. Tag @threejs only if the post is technical. | Tue–Thu midday ET (assumption, by analogy with Sprout's cross-platform data [[Sprout](https://sproutsocial.com/insights/best-times-to-post-on-social-media/)]) |
| **Bluesky** | Find and ask to join **maps / economic-geography starter packs** [[blueskystarterpack maps](https://blueskystarterpack.com/maps)]. Post GIFs with alt text. Reply to map people rather than broadcasting. | Weekday daytime ET (assumption) |
| **Mastodon** | Use 3–5 CamelCase hashtags (#Geography #Maps #DataViz #ThreeJS #EdTech). **Always add alt text**, or people won't boost. Promotion is tolerated when it's genuine [[fediview](https://fediview.com/articles/mastering-mastodon-hashtags-visibility-2026/), [fedi.tips](https://fedi.tips/how-do-i-make-posts-more-accessible-to-blind-people-on-mastodon-and-the-fediverse/)]. Good instances for this: mapstodon.space, fosstodon (assumption, verify). | Any weekday |
| **LinkedIn** | A "what I built and learned" story for the dev and edtech crowd. | Tue 11:00–17:00, Wed 11:00–16:00 local [[Sprout LinkedIn](https://sproutsocial.com/insights/best-times-to-post-on-linkedin/)] |
| **TikTok / Reels / Shorts** | 20–35 s screen recordings with the hook in the first 2 s (§4). | TikTok Tue–Thu 14:00–18:00 local [[Sprout TikTok](https://sproutsocial.com/insights/best-times-to-post-on-tiktok/)]. Reels Tue 13:00–19:00, Wed 12:00–21:00 [[Social Media Today](https://www.socialmediatoday.com/news/best-times-to-post-2025-sprout-social/744014/)] |
| **Discord** | Use Disboard or Discord search for "geography" and "GeoGuessr" servers. Read the rules, then post only in #self-promo or #resources channels, or ask a mod. Offer to run a server "Daily Challenge" thread. (Specific servers unverified.) | After launch week |
| **Newsletters** | **TLDR**: editorial selection isn't documented. The public route is paid sponsorship with developer-oriented placements [[advertise.tldr.tech](https://advertise.tldr.tech/)], so it's a $200-tier option at most. Free routes (verify each is active): JavaScript Weekly / Frontend Focus (submit links), Hacker Newsletter (picks from HN), Maps Mania blog, the Three.js forum "Showcase" category. | Week 2 |
| **"Cool sites" directories** | Free listings: Product Hunt, Uneed, Microlaunch, Indie Hackers products, Futurepedia-style lists (only if relevant), itch.io (a link page or HTML embed for the game crowd). Web game portals (CrazyGames, Poki) have their own submission rules and exclusivity terms, so read them first. *(All unverified, assumption.)* | Weeks 2–4, 2–3 per week |

---

## 4. Content engine

### 4.1 Weekly calendar (sustainable: about 3 h/week once batched)

Times are **local to your main audience (US ET)**. They're based on Sprout's 2026 data for TikTok (Tue–Thu 14:00–18:00), Instagram (Tue/Wed afternoons) and LinkedIn (Tue–Thu late morning to afternoon) [[Sprout TikTok](https://sproutsocial.com/insights/best-times-to-post-on-tiktok/), [Social Media Today](https://www.socialmediatoday.com/news/best-times-to-post-2025-sprout-social/744014/), [Sprout LinkedIn](https://sproutsocial.com/insights/best-times-to-post-on-linkedin/)]. Sunday is TikTok's weakest day [Sprout TikTok], so leave it out.

| Day | Format | Platforms | Time (ET) |
|---|---|---|---|
| **Mon** | **"Daily Challenge" share prompt.** Post your own grid and ask "beat me". | X, Bluesky, Mastodon, Threads | 08:00 |
| **Tue** | **True Size Tuesday**: a 20–35 s compare video | TikTok, Reels, Shorts, then X/Bluesky | 15:00 |
| **Wed** | **"Did you know?" country card**: a screenshot carousel (flag, rank, neighbours, one surprising fact) | Instagram carousel, LinkedIn (Wed edu angle), Bluesky | 12:00 |
| **Thu** | **Lens of the Week**: a population/density/GDP globe GIF plus one insight. Every 4th week, make it an r/dataisbeautiful [OC] post. | Bluesky, Mastodon, X, Reddit (monthly) | 14:00 |
| **Fri** | **Poll / guess**: "Which is bigger?" with answers revealed the next day in a video | X poll, IG story poll, YouTube community | 12:00 |
| **Sat** | Optional: a dev log (r/webdev Showoff Saturday only when there's something truly new) | Reddit, Mastodon | Morning |
| **Sun** | Off. Batch-record every other Sunday instead (see 4.3). | — | — |

### 4.2 Post ideas

Rules for captions:
- **Never type a number from memory.** Read the ratio and values from Compare stats and insert them where you see `{X}`.
- `{domain}` is the site address once the domain is live. Ready-made video scripts: [launch-kit.md](launch-kit.md) §6.
- Put the hook in the first 2 seconds of a video and in the first line of a post.
- Use 3–5 hashtags, CamelCase on Mastodon.

| # | Format | Hook / on-screen text | Caption | Hashtags |
|---|---|---|---|---|
| 1 | Compare video | "Greenland vs Africa? Your map lied." | "Flat maps make Greenland look as big as Africa. On the globe it's smaller than DR Congo alone ({X} vs {X} km²). {domain}/?compare=GRL,COD" | #Geography #Maps #Mercator #TrueSize |
| 2 | Compare video | "Is Alaska really that big?" | "Dropped Alaska on the lower 48. {X}." | #Alaska #USA #Maps |
| 3 | Compare video | "Texas vs France" | "Texans, prepare yourselves. Texas is {X}× France." | #Texas #France #Geography |
| 4 | Compare video | "The UK on top of {US state}" | "Every Brit has wondered this." | #UK #Maps #TrueSize |
| 5 | Compare video | "Russia moved to the equator" | "Dragged Russia to the equator with Move. On a globe it stays the same size; only flat maps blow it up." | #Russia #Mercator #MapFacts |
| 6 | Compare video | "Australia vs Europe" | "Laid Australia over Europe: {X}." | #Australia #Europe #Geography |
| 7 | Compare video | "Japan is not small." | "Japan over California. {X}." | #Japan #California #Travel |
| 8 | Compare video | "DR Congo vs Western Europe" | "The country nobody realises is huge." | #Africa #Geography #Maps |
| 9 | Compare video | "Antarctica: the real size" | "Flat maps make it a smear along the bottom. Here it is on a globe." | #Antarctica #Maps |
| 10 | Compare video | "Indonesia across the USA" | "Laid Indonesia across the US. It reaches further than you think." (The app shows area, not width, so don't quote a span.) | #Indonesia #Travel #Maps |
| 11 | Country card | "Did you know? {Country} has {N} neighbours" | "Tap any country for facts." | #DidYouKnow #Geography |
| 12 | Country card | "Most neighbours of any country" | Read the answer from the app. | #Geography #Trivia |
| 13 | Country card | "Smallest country you can actually tap" | Zoom-in video (Shift zooms in smoothly; search finds the ones too small to tap). | #Microstates #Geography |
| 14 | Country card | "Capital that's not the biggest city" | A series, one country per post. | #Capitals #Geography |
| 15 | Daily share | "Today's Daily Challenge: I got {score}. Your turn." | "Same 5 for everyone. ?play=daily" | #DailyChallenge #GeographyGame |
| 16 | Daily share | "Only {N}/5 exact today. Brutal." | Invite people to reply with their squares. | #DailyPuzzle |
| 17 | Daily share | "Weekly recap: hardest country this week" | A replay of your own misses with the miss line (aggregate data would need new events or the leaderboard). | #Geography #Quiz |
| 18 | Lens GIF | "The world by population density" | "One tap recolours the planet." | #DataViz #DataIsBeautiful #Maps |
| 19 | Lens GIF | "GDP per person, on a real globe" | Note the data year honestly. | #DataViz #Economics |
| 20 | Lens GIF | "Area ranking, but on a sphere" | — | #Maps #Geography |
| 21 | Day/night | "Right now, here's where it's night" | A live terminator screen recording. | #Earth #Space |
| 22 | Day/night | "Winter solstice: the Arctic in darkness" (21 Dec) | A seasonal tie-in. | #Solstice #Earth |
| 23 | Day/night | "Who reaches the new year first?" (31 Dec) | Watch the night side cross the globe; midnight itself isn't drawn, so say so. | #NewYear #Geography |
| 24 | Easter egg | "Flick it hard. Sound ON." | "I may have added a rollercoaster." (A screaming crowd, the owner's recording.) | #WebGL #Rollercoaster #Fun |
| 25 | Poll | "Bigger: Mongolia or Iran?" | Reveal the answer the next day. | #Quiz #Geography |
| 26 | Poll | "Which country has the most neighbours?" | — | #Trivia |
| 27 | Border explainer | "One country, three maps: why borders depend on who's drawing" | Calm and neutral. Comments moderated (§10). | #Geography #Maps |
| 28 | Dev log | "How I stopped Antarctica turning into 200k triangles" | A Mastodon/HN-style thread. Follow-ups: "Every country in 3 draw calls", "80 ships, one draw call". | #ThreeJS #WebGL #GameDev |
| 29 | Teacher | "A 10-minute Mercator lesson with a free globe" | Link to the lesson plan (§7). | #TeacherTwitter #EdTech #GeographyTeacher |
| 30 | Challenge | "Stitch/duet this with your score" | TikTok duet/stitch prompt. | #GeographyChallenge |
| 31 | Ocean | "The Gulf Stream leaves the coast here." | Zoom in on Cape Hatteras: the name, arrow and typical speed fade in. 33 currents in all. | #Oceans #Geography #Maps |
| 32 | Ocean | "Tiny cargo ships on the main sea lanes" | Zoom in on Suez or the Singapore Strait until the wakes show. Say they're decoration, not live positions. | #Shipping #Maps #WebGL |
| 33 | Live | "How many people are on Earth right now?" | The population strip ticking at globe view (UN WPP 2024 estimate). | #Population #Earth #DataViz |
| 34 | Daily | "Today's country of the day: {Country}" | The chip, then the card with its two facts. | #Geography #DidYouKnow |

### 4.3 Batch recording workflow

- **Cadence:** every other Sunday, 90 minutes, record 6 to 8 videos.
- **Desktop (best quality):** OBS Studio (free).
  - Set the canvas to **1080×1920**, with a browser window cropped to a 9:16 region. Or record 1920×1080 and crop in an editor.
  - Use **60 fps**. Use `?quality=high` and hide the cursor, or use a large highlighted cursor for "drag" moments.
  - Use deep links to set up each shot instantly: `?compare=GRL,COD`, `?compare=USA,AUS`, `?c=FRA`, `?view=neutral`, `?play=daily`, `?play=classic`.
  - Shift on its own zooms in and Ctrl zooms out (tap for a step, hold to glide). Turn day & night off with the corner button for evenly lit shots. Mute the music (on by default for a first visit) unless the clip needs sound.
  - For stills of a pair, Compare → Share image already makes a square true-size image with the ratio and link.
- **Phone:** the built-in screen recorder (iOS Control Centre / Android Quick Settings). Turn on Do Not Disturb, and record with system audio for the rollercoaster.
- **Edit:** CapCut or DaVinci Resolve (free). Add **burned-in captions**, since many people watch muted (assumption, a widely held norm). Add on-screen text for the hook in the first 2 s, and end with a 1-second end card showing the domain.
- **Length:**
  - TikTok: aim for **21–34 s** [[Loomly](https://www.loomly.com/blog/tiktok-video-length)]. Longer compare explainers of 60–180 s are an option [[quso](https://quso.ai/blog/best-video-length-for-tiktok)].
  - YouTube Shorts: allowed up to 3 min since Oct 2024 [[Descript](https://www.descript.com/blog/article/how-long-can-youtube-shorts-be)], but keep the same 20–40 s cut.
- **Repurpose:** one recording becomes a vertical video, a GIF for Bluesky/Mastodon/Reddit, and a still for an Instagram carousel.

---

## 5. Growth loops built into the product

Ranked from **highest impact per hour of effort**. Effort is for you, solo, on a static site. Status as of 9 October 2026.

| Rank | Loop | Status | Effort left | Impact | Notes |
|---|---|---|---|---|---|
| 1 | **Shareable daily result** | Built | S (polish) | High | *Copy result* copies the title with the date, the square grid, the score and a `?play=daily` link. Still to add: `navigator.share()` on phones (the native share sheet), keeping the clipboard as the fallback. |
| 2 | **Compare links and pages** | Partly built | M | High | `?compare=FRA,DEU` works, and 150 pairs have their own pre-rendered page (`compare/<a>-vs-<b>/`). Every page and link still previews the same `og-image.png`; per-pair preview images were left out on purpose (they need a rasteriser or CI screenshots, [docs/seo.md](../seo.md)). Revisit if compare links get shared a lot. |
| 3 | **Compare share image** | Built | — | Medium | Compare → *Share image*: a square image of both countries at true size with the ratio, population and link, via the share sheet or a download. Ready for Instagram and TikTok users. |
| 4 | **Country of the day** | Built | — | Medium | One country a day for everyone: a chip at the top (once a day) and in the Play menu; the card shows two facts. A daily reason to come back, and a daily post (§4.2 #34). |
| 5 | **"Challenge a friend" link** | Not built | S–M | High | After any game: "Challenge a friend". The link carries a seed and your score (`?play=classic&seed=abc&vs=8420`). The friend plays the same 10 countries and sees "Beat John's 8,420". No backend needed. |
| 6 | **Streaks (local)** | Not built | S | Medium–High | Use localStorage (already used for daily results). Show the streak in the share text. **Assumption:** emoji fits CLAUDE.md's rule, since the shareable result is the stated exception. Add a "streak freeze" later. |
| 7 | **Leaderboards** | Built, dormant | S (deploy) | Medium | Top-10 boards on the quiz end screen, names with a profanity filter, witty suggested names ("Tectonic Toucan 42"). Goes live when `server/` is deployed and `API_BASE` is set (after the domain). A daily board gives people a reason to come back at reset time. |
| 8 | **Programmatic SEO pages** | Built | Ongoing | High (slow, 2–6 months) | The long-term compounding channel. Details below. |
| 9 | **Embeddable widget** | Not built | M | Medium | `<iframe src="https://{domain}/?embed=1&compare=GBR,USA">` with a "Powered by EarthInteractive" link. Bloggers and teachers embed it, and you earn backlinks. Needs an embed mode with no ads and minimal UI. |
| 10 | **Classroom / teacher mode** | Not built | L | Medium–High (education channel) | Custom rounds by region, a class code, nickname-only names, no ads. Section 7. |

### Programmatic SEO: "How big is Texas compared to France?"

**The opportunity.** People search for exact comparisons ("how big is X compared to Y", "X vs Y size", "how many Xs fit in Y"). A page that answers with the real ratio *and* an interactive 3D comparison is better than a text answer. *(No search-volume claims here. Check pairs in Google Search Console after launch, plus free keyword tools.)*

**The guardrail.** Google's **scaled content abuse** policy (March 2024, reinforced by an August 2025 spam update) targets many template pages whose main purpose is ranking, especially "swap the keyword, keep everything else" pages [[Patrick Stox](https://patrickstox.com/programmatic-seo/risks/scaled-content-abuse/), [bulkbase](https://bulkbase.ai/seo/understanding-googles-scaled-content-abuse-policy)]. Programmatic pages themselves aren't banned; thin ones are [[eastondev](https://eastondev.com/blog/en/posts/media/20260326-programmatic-seo-guide-2025/)].

**What's built** (`tools/build-pages.mjs`, run at deploy; details in [docs/seo.md](../seo.md)):

- **217 country pages** (`countries/<slug>/`) with question headings ("How big is France?"), facts with their year, neighbours, the Mercator stretch, and a link that opens the globe on that country.
- **150 comparison pages** (`compare/<a>-vs-<b>/`): a famous list (Greenland vs DR Congo, UK vs US, Russia vs Canada…) plus each country of 1M+ people against its largest neighbour. Each opens with the ratio and has its own numbers, a Mercator note, plain share links and an "open in 3D" link.
- **27 region hubs and 3 rankings** (largest, most populous, most densely populated), A–Z and comparison indexes.
- `sitemap.xml` (406 URLs), `robots.txt`, `llms.txt`, IndexNow, breadcrumbs and structured data that matches the page.
- Deliberately **not** done: `FAQPage` markup, per-page OG images, thousands of pairs (reasons in docs/seo.md).

**Still to do:**

1. Submit the sitemap in **Google Search Console** and **Bing Webmaster Tools**, and run the IndexNow ping once, after the domain switch.
2. **Hand-write a short intro** for the top 20–30 pairs when there is time.
3. **Add pairs people actually search for** (Search Console → Queries). Don't grow to thousands.
4. **Measure:** Search Console impressions per page type after 4–8 weeks. Improve or remove pages with zero impressions after 3 months.

---

## 6. Linking game styles: the Game Hub

### Concept: "Your World"

One personal globe that **fills in as you learn.** Every game mode feeds the same progress system, so a flag fan, a capital fan and a true-size fan all build toward one thing.

```
            ┌─────────────── YOUR WORLD (personal globe) ───────────────┐
            │ each country: grey → bronze → silver → gold (mastery)      │
            └──────────▲───────────▲──────────▲──────────▲──────────────┘
                       │XP         │XP        │XP        │XP
  Daily Challenge ─────┤  Find it ─┤ Flags ───┤ Capitals ┤ Borders ── True-size guess ── History slider
  (location)              (location)  (flag)     (capital)  (neighbours) ("which is bigger?")  ("who held this in 1914?")
```

| Mechanic | How it works | Backend needed? |
|---|---|---|
| **Mastery per country** | Each mode is a *skill* for a country (location, flag, capital, neighbours, size). Get 3 skills right and the country turns bronze; 5 makes it gold. | No (localStorage); later sync via an export code |
| **XP & level** | Points from any mode turn into XP. Levels have geography titles (the existing "Seasoned traveller" and "Cartographer level" verdicts become level names). | No |
| **Streak** | One streak shared across modes: any daily game keeps it alive. | No (local); yes for cross-device |
| **Badges** | Continent complete, "all island nations", "every landlocked country", "100 exact finds", "found a microstate". | No |
| **Daily trio** | Daily Location (existing Daily Challenge) + Daily Flag + Daily "Bigger?" combined into one share card (Country of the day already gives a daily visit without a game): `🌍🟩🟩🟨⬛🟩 🏳️🟩🟩🟩 📏🟩🟨`. | No |
| **"Fill your map" share** | A share image of your personal globe: "I've mastered 87 / 197". | No (client-side render) |
| **Teacher mode** | Choose region and mode, then share a class link. Students use nicknames, and the class sees a shared results board. | Yes (with leaderboards) |

**Suggested build order** (each reuses the quiz engine and layer marks):
1. "Bigger?" true-size guess. It reuses the compare pieces and is the most on-brand.
2. Flag game (flags are already vendored).
3. Capital game (data exists).
4. Borders game ("tap all neighbours of X").
5. Streaks plus the local "Your World" map.
6. Teacher mode.
7. History slider (data-heavy and politically sensitive, so last).

**Rule for every new game:** keep to the existing quiz rule (only keys that are a `country` in all three views) so games never depend on the border view.

### Seasonal and event calendar

These are real-world events, so they keep their dates. Use the ones that fall after L day; skip any that come before it.

| When | Event | Content / feature hook |
|---|---|---|
| 16–20 Nov 2026 | **Geography Awareness Week** (third week of November) [[National Today](https://nationaltoday.com/geography-awareness-week/), [awarenessdays](https://www.awarenessdays.com/awareness-days-calendar/geography-awareness-week/)] | Product Hunt launch if it falls in the L+21 to L+42 window (§3.4), a teacher outreach wave, a "GAW Daily" themed week |
| 18 Nov 2026 | **GIS Day** (third Wednesday of November) [[gisday.com](https://www.gisday.com/en-us/overview)] | Data-lens content and a tech/GIS community post |
| 21 Dec 2026 | Winter solstice | Day/night video |
| 31 Dec 2026 | New Year's Eve | "The night side on New Year's Eve" live day/night video (the globe draws sunlight, not a midnight line) |
| Jan 2027 | New school term (UK/AU; US semester 2) | Teacher outreach wave 2 |
| 22 Apr 2027 | Earth Day | "Explore the Earth" press pitch |
| Mid-2027 | FIFA Women's World Cup 2027, Brazil (verify dates) | "Find the qualifiers" Daily theme, compare host vs. teams |
| Aug–Sep 2027 | **Back-to-school (US/Northern Hemisphere)** | The biggest teacher push. TpT freebie refresh. |
| Oct–Nov 2027 | Men's Rugby World Cup 2027, Australia (verify dates) | Themed daily |
| Jul 2028 | LA 2028 Olympics (verify dates) | "Parade of nations" game mode |

The 2026 FIFA World Cup and the 2026 Winter Olympics have already passed. Don't plan around them.

---

## 7. Education channel

### 7.1 Teacher assets to create (one weekend)

A first version of items 1, 2, 3 and 5 is the teacher one-pager in [launch-kit.md](launch-kit.md) §7.1 (three 10-minute activities, privacy in plain words, tips).

1. **"Map Projections in 10 Minutes"** lesson plan, one page as PDF/Google Doc.
   - Objective → hook (Greenland vs Africa on a flat map) → students use `?compare=` links → worksheet (5 pairs: predict, then check the ratio) → discussion ("why do we still use Mercator?").
2. **"Country Detective"** worksheet using country cards: neighbours, capital, rank.
3. **"Daily Challenge Warm-up"**: a bell-ringer slide template that teachers project each morning. Each device plays a day's challenge once, so point repeat players to Find it (`?play=classic`).
4. **"Who draws the borders?"** (older students): compares the three views. Neutral framing, optional, and clearly marked as sensitive.
5. **Quick-start card**: link, keyboard shortcuts, `?quality=low` for old Chromebooks, the speaker button (music starts with the first tap on a first visit), and "no sign-up, no student data collected".

### 7.2 Where to distribute

| Channel | How | Notes |
|---|---|---|
| **Teachers Pay Teachers** | List items 1–3 as **free** resources linking to the site. | TpT requires a free product before paid ones. Seller fee terms have changed recently and sources disagree (a $29 one-time fee vs. a free basic account) [[goldcityventures](https://goldcityventures.com/how-to-sell-on-teachers-pay-teachers/), [itsallprimary](https://itsallprimary.com/the-costs-of-selling-on-teachers-pay-teachers/)]. **Check current terms first.** Fall back to hosting the PDFs on your own `/teachers` page. |
| **Google Classroom** | A "Share to Classroom" button on the `/teachers` page. Google provides an official share button; verify the current embed snippet in Google's docs. | Low effort. |
| **Your own `/teachers` page** (not built yet) | Lesson plans, deep links, the privacy statement for schools, embed codes (once an embed mode exists). Start from the launch kit's one-pager. A new hand-written page sits in the repo root like `about.html` and must be added to the page list in `tools/build-pages.mjs`, which copies it at deploy with the shared header and footer ([docs/seo.md](../seo.md)). | Gives teachers one page they can bookmark. |
| **Teacher communities** | Facebook groups for geography/social studies teachers, #TeacherTwitter / edu Bluesky, r/geography teachers' threads. Disclose that you made it. | Ask mods before posting a link. |
| **Common Sense Education / edtech directories** | Submit for review (verify their submission process). | Slow but credible. |

### 7.3 Email template: teacher outreach

Attach the one-pager from [launch-kit.md](launch-kit.md) §7.1 until a `/teachers` page exists. Drop "no cookies" if ads go live.

```
Subject: Free 3D globe for your map-projection lesson (no logins)

Hi {Name},

I saw your {post/resource} on {topic} and thought this might be useful.

I built EarthInteractive, a free, true-to-scale 3D globe that runs in any recent
browser (Chromebooks included). Students can pull two countries off the globe and
drag them side by side to see their real size; it makes the "Mercator distorts
size" point in about ten seconds. Example: {domain}/?compare=GRL,COD

I've attached a one-page sheet with three 10-minute activities.
No sign-up, no student data collected, no cookies.

If you try it with a class, I'd love one sentence of feedback on what worked or
didn't. I'm a solo developer.

Thanks,
John
{domain}
```

### 7.4 YouTuber / TikToker outreach

Targets are geography, maps, travel and edu creators: small to mid-size accounts, who are more likely to reply (assumption). Before writing, check that the creator has made Mercator or true-size content before.

```
Subject: A 3D "true size" toy for your next map video (free, no strings)

Hi {Name},

Loved your video on {specific video}, especially {specific detail}.

I made a free browser globe where countries lift out as 3D puzzle pieces you can
drag anywhere to compare their real size, plus a daily geography challenge.
Here's {their topic} in one link: {domain}/?compare={A},{B}

If it's useful for a video, use it freely: screen-record whatever you like, no
credit required (a link is appreciated). If there's a comparison or feature that
would make a better video, tell me and I'll try to build it.

John, solo dev, {domain}
```

### 7.5 Press / blog pitch

Targets: map blogs (Maps Mania), edtech blogs, local press near you ("local developer builds…"), and dev newsletters. The fact sheet, screenshot list and a shorter pitch are in [launch-kit.md](launch-kit.md) §8.

```
Subject: The globe that shows how big countries really are

Hi {Name},

Most maps we grew up with shrink Africa and inflate Greenland. EarthInteractive is a
free, true-to-scale 3D globe where you can pull countries off the planet and lay them
side by side to see their real size, plus a daily geography challenge with the same
five countries for everyone.

Why it might interest your readers:
- {Hook for their beat: classroom use / data lenses / WebGL craft / Geography Awareness Week}
- It shows the world three ways: UN membership, who administers each area on the
  ground, and a neutral view that marks disputed areas
- Free, no sign-up, works on phones and Chromebooks

Try: {domain}/?compare=GRL,COD
Fact sheet and screenshots: {attachment, or a press page once one exists}

Happy to answer questions or provide a custom comparison for your piece.
John Redman, {city}, {contact address once the domain is live}
```

---

## 8. Metrics & tools

### 8.1 Analytics options

| Tool | Cost | Cookieless | Custom events | Recommendation |
|---|---|---|---|---|
| **Cloudflare Web Analytics** | Free | Yes [[klymentiev](https://klymentiev.com/blog/best-free-analytics-2026)] | Limited (assumption, check docs) | Good free baseline for page views and referrers |
| **GoatCounter** | Free for non-commercial use; donation-supported [[flowconsent](https://www.flowconsent.com/en/services/analytics/goatcounter)] | Yes | Yes (event counts) | **Start here.** Once ads go live the site is arguably commercial, so check GoatCounter's terms or move on. |
| **Plausible** | From $9/mo hosted, or free self-hosted [[seline](https://seline.com/blog/google-analytics-alternatives)] | Yes | Yes (goals, props) | $50 tier: the best balance of insight and privacy |
| **GA4** | Free | No: uses cookies, so needs a consent banner in the EEA/UK | Yes | Avoid for a school and child audience unless ads require it |

**Chosen: GoatCounter.** It is wired into the globe and every text page (`js/analytics.js`), and stays off until
the owner sets the code in `tools/site.config.mjs` and `js/analytics.js` ([docs/seo.md](../seo.md) → Owner setup).
Nothing is sent on localhost or inside the native app.

**Events already counted** (they show in GoatCounter as paths):
- `country/<KEY>`: a country tapped (title = its name)
- `compare`: a comparison made, once per pair (title = the pair); `compare-pick` and `move` when a piece is lifted
- `compare-image`: a compare share image made
- `play/daily`, `play/classic`: a game started
- `error/<message @ file:line>`: visitor errors (once per message per visit, at most 10), and `error/webgl-lost`

**Not counted yet** (ideas, add only if a decision depends on them): Daily finish and *Copy result*, data-lens and
border-view changes, the rollercoaster, app install, leaderboard submissions, and which deep link a visit landed on
(GoatCounter's page path partly covers this).

### 8.2 UTM conventions

```
?utm_source={platform}&utm_medium={social|community|email|video|directory|referral}&utm_campaign={yyyy-mm-name}&utm_content={variant}
```

| Example | Use |
|---|---|
| `utm_source=tiktok&utm_medium=video&utm_campaign={yyyy-mm}-launch&utm_content=greenland-drcongo` | Link in bio and video descriptions |
| `utm_source=newsletter-jsweekly&utm_medium=email&utm_campaign={yyyy-mm}-launch` | Newsletter submissions |
| `utm_source=teachers&utm_medium=email&utm_campaign={yyyy-mm}-teachers` | Teacher outreach |

- **Don't use UTMs on Reddit or HN**: they look spammy, and the referrer is already captured. Use clean links there.
- Keep links short. Videos can use a short link that redirects to the full URL with UTMs. GitHub Pages can't send redirects itself, so that needs a redirect rule at the registrar or DNS provider *(assumption, check what yours offers)*.
- The card's copy-link button and the compare share link build clean URLs, so they never carry UTMs. The address bar does: the app updates `?c=` and `?compare=` in place and keeps any `utm_*`. A small `history.replaceState` that strips `utm_*` after the analytics script has counted the visit would stop UTMs spreading through copy-pasted address-bar links. *(Suggestion only, not implemented.)*

### 8.3 KPIs per stage (replace the targets with your week-2 baseline)

| Stage | KPI | Source |
|---|---|---|
| **Awareness** | Unique visitors per week; referrer mix; video views | Analytics, platform dashboards |
| **Activation** | % of visitors who open a country, start a compare, or start a game | Events ÷ visitors |
| **Engagement** | Daily Challenge starts per day (`play/daily`); comparisons per visit (`compare`) | Events |
| **Retention** | Returning visitors per week; median streak length (once built) | Analytics, local streak to event |
| **Referral** | Share rate (needs Daily-finish and *Copy result* events, not counted yet, §8.1); visits landing on `?play=daily` or `?compare=` | Events, landing pages |
| **SEO** | Search Console impressions and clicks on country/compare pages | GSC |
| **Education** | Visits to `/teachers`; lesson plan downloads; teacher replies | Analytics, inbox |
| **Revenue** (later) | Ad RPM; ad-free share of sessions | Ad network |

### 8.4 Weekly review ritual (Sundays, 30 minutes)

1. **5 min:** Fill in a one-row-per-week spreadsheet with visitors, activation %, daily starts, share rate (once counted), returning %, and top 3 referrers.
2. **10 min:** Check the top content. Which post or video drove the most visits, and why?
3. **5 min:** Triage feedback and issues. Pick at most 2 product fixes for the week.
4. **5 min:** Choose next week's 4 posts from the idea bank (§4.2).
5. **5 min:** Burnout check: hours spent vs. planned (§10). Cut something if you're over.

---

## 9. 90-day roadmap & budget tiers

Assumes **8–10 hours a week** (evenings and one weekend block). Marketing and product share the same hours. Weeks
count from L day (§3); the four weeks before it start when the domain is bought. Plan one light week whenever
holidays fall, and let scheduled posts cover it.

| Wk | When | Focus | Key tasks | Hrs |
|---|---|---|---|---|
| −4 | L−28 to L−22 | Domain and warm-up | Buy the domain; ship the github.io service-worker change (launch checklist step 1); create and warm up Reddit/Bluesky accounts (comment daily); decide on the ad placeholders | 6 |
| −3 | L−21 to L−15 | Assets | Re-shoot screenshots and videos that show the ocean; record the Daily Challenge and rollercoaster videos and a lift-out GIF (launch kit §6); privacy page touch-up | 8 |
| −2 | L−14 to L−8 | Domain switch | Launch checklist steps 2–7: point the domain, switch the URLs, contact address, GoatCounter code, Search Console, Bing, IndexNow, leaderboard deploy | 8 |
| −1 | L−7 to L−1 | Launch-ready | Smoke test on the domain; border-view known-limitation wording and the "why De facto is the default" line; final pass on the launch kit | 6 |
| 1 | L to L+6 | **Launch week** | Day-by-day plan in §3.2 | 15 (spike) |
| 2 | L+7 to L+13 | Follow-through | r/dataisbeautiful [OC], r/WebGames, newsletters, directories; fix the top bugs from feedback; `navigator.share` on the daily | 8 |
| 3 | L+14 to L+20 | Loops | "Challenge a friend" links and local streaks; start the weekly content calendar | 9 |
| 4 | L+21 to L+27 | Education prep | `/teachers` page from the launch kit's one-pager; TpT listing; email 20 teachers; schedule Product Hunt | 9 |
| 5 | L+28 to L+34 | **Product Hunt** | PH launch (Tue–Thu, §3.4); teacher wave; GAW or GIS Day posts if they fall here | 12 |
| 6 | L+35 to L+41 | SEO check | Search Console: indexed pages, queries; add the pairs people search for; hand-write intros for the top pairs | 6 |
| 7 | L+42 to L+48 | Game hub v1 | "Bigger?" true-size guess game, combined daily share | 9 |
| 8 | L+49 to L+55 | Content | Batch-record seasonal videos for the coming weeks; creator outreach (10 emails) | 6 |
| 9 | L+56 to L+62 | Review | 90-day review (from L−28); plan the next quarter (flag game, teacher mode, school-term outreach) | 5 |

### Budget tiers (per month)

| Tier | Spend on | Approx. |
|---|---|---|
| **Free** | GoatCounter or Cloudflare Web Analytics; OBS, CapCut or DaVinci; Search Console and Bing Webmaster; Canva free; GitHub Pages; Tally/Google Forms. Domain is ~$15/yr (about $1.25/mo). | ~$1–3/mo for domains |
| **$50 / month** | Plausible ($9) for events and goals. A second domain for short links (~$1–3/mo). A scheduler such as Buffer/Typefully at entry level (verify current pricing). A small Reddit/Meta test boost ($20–30) on the single best-performing organic video, only after it has proven itself organically. | ~$50 |
| **$200 / month** | Everything above, plus a small paid newsletter placement in a geography or edtech niche newsletter (TLDR's developer placements are likely priced above this tier; ask for a rate card [[advertise.tldr.tech](https://advertise.tldr.tech/)]). Or pay a micro-creator ($50–150) for a single geography video with disclosure. A Canva Pro or stock music licence. **Don't** spend on Product Hunt "upvote services": they break PH rules and risk removal. | ~$200 |

**Spending rule (assumption):** spend money only to *amplify something that already works organically*. Never use paid spend to find product-market fit.

---

## 10. Risks

### 10.1 Border views (political sensitivity)

**Likely flashpoints:** every area drawn differently across the three views (the disputed, limited-recognition
and breakaway areas listed in [docs/border-views.md](../border-views.md)), and above all the De facto view's
**documented known limitation** in the same file, which critics will raise first. Keep this list in that file, not
here, and never name a specific dispute in marketing copy.

In public copy, describe the views only this way: *the globe shows the world three ways: UN membership, who
administers each area on the ground, and a neutral view that marks disputed areas.*

**Before launch:**
- [ ] Fix the De facto view's known limitation (the roadmap needs a newer source) or **label it clearly**, in the UI or at least on the About page.
- [ ] Publish the border rules as an "About the borders" text page: the three views, the sources, and how to report an error. Today `about.html` and `how-to-play.html` describe the views and `contact.html` explains how to report a border; the written rules are only in `docs/border-views.md` on GitHub.
- [ ] The default view is De facto (`DEFAULT_VIEW` in `tools/views.config.mjs`; games always use UN). Make it a conscious choice and say on the About page *why* it's the default.
- [ ] Don't lead marketing with borders. Keep the border explainer (idea #27) for after you have an audience, and keep it neutral.

**Comment-handling playbook:**

| Situation | Response |
|---|---|
| Factual error ("this border is wrong") | Thank them, ask for a source, and log a GitHub issue. "Thanks, I've logged it here: {link}. Changes go through the documented border policy." |
| "Why do you show X as a country?" | "There are three views because people disagree. Switch to {view} for {perspective}. The rules are here: {link}." Don't argue for or against any side. |
| Hostile or nationalistic thread | Reply once with the policy link. Don't continue. On your own posts, lock or hide comments; on Reddit, let the mods handle it. |
| Brigading or report campaigns on app stores or directories | Log them; contact the platform. Don't change the rules under pressure. Changes happen only through `views.config.mjs` plus a documented PR (CLAUDE.md). |
| Press asks about a dispute | Send the written policy. Don't comment beyond it. |

**Audience note (assumption):** some countries legally require specific depictions of their borders. If a regional distribution partner or app store asks, the neutral view is your safest answer. Get legal advice before any market-specific build.

### 10.2 Ads and child audiences

- **COPPA (US):** the amended rule took effect 23 June 2025, with **full compliance required by 22 April 2026**. It includes separate parental consent before disclosing children's data for targeted advertising, a broader definition of personal information, and data-retention limits [[FTC FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/coppa-rule-amendment-compliance-deadline-approaches), [Securiti](https://securiti.ai/ftc-coppa-final-rule-amendments/)]. A geography game marketed to classrooms can easily count as **child-directed or mixed-audience**.
- **Google ads:** use Google's age-treatment tagging. TFCD is deprecated in favour of the **Tag for age treatment (TFAT)**, which disables interest-based and remarketing ads for those requests [[Google Ad Manager help](https://support.google.com/admanager/answer/4442399?hl=en), [AdSense TFAT](https://support.google.com/adsense/answer/9007197?hl=en)]. EEA/UK serving needs consent handling [[AdSense](https://support.google.com/adsense/answer/9009582)].
- **Practical policy (assumption, not legal advice):**
  - Teacher/classroom mode and `/embed` are **ad-free**.
  - Main-site ads are **non-personalised** (age-treated) by default.
  - No ads near game answer areas.
  - Read Google's policies on ads on animated or game pages (already a roadmap item).
- **Leaderboard names:** a typed name could be a child's real full name, which counts as personal information under COPPA. What's built (dormant until deployed):
  - [x] A profanity filter, one copy shared by the browser and the server (`js/net/profanity.js`).
  - [x] Generated name suggestions ("Tectonic Toucan 42", *Shuffle* for another), so typing a name is optional.
  - [x] Names up to 20 characters (`NAME_MAX`).
  - [x] The privacy page says what is stored (a random player ID, the display name, score, game, rounds, time and date), asks people not to use their real full name, and explains removal on request.
  - [ ] A real-name check, and automatic deletion after N days (the server keeps scores until removed by hand).
  - [ ] In classroom mode, offer **generated nicknames only**.
- **Don't** advertise directly to under-13s on social platforms. Market to teachers and parents.

### 10.3 Burnout (the biggest risk for a solo project)

| Signal | Mitigation |
|---|---|
| Working more than 12 h/week for 2+ weeks outside launch | Cut the content calendar to Tue (video) + Thu (lens) only |
| Doom-refreshing analytics or comments | Check twice a day in launch week, once a day after, and weekly reviews only from week 5 |
| Feature creep from feedback | Use one public "ideas" issue and pick at most 2 items per week |
| Negative or hostile comments | Use the canned responses in §10.1, and walk away after one reply |
| Content treadmill | Batch-record every other Sunday; reuse each recording in 3 formats; repost your best evergreen video every 6–8 weeks (assumption: recycling top content is common practice) |
| Holiday gap | Plan one light week whenever holidays fall (§9), and let scheduled posts cover it |

### 10.4 Other risks

| Risk | Mitigation |
|---|---|
| Old data undermines credibility | Done: population is World Bank 2025 and GDP mostly 2024, and every card shows the year. Still open: show the year in the lens legend too. |
| Phones or Chromebooks run slowly, causing poor first impressions | Already has a `low` tier and an adaptive resolution governor; all countries draw in 3 draw calls, and phones draw at half rate while nothing moves. Mention `?quality=low` in teacher materials. |
| ~1.1 MB data load on slow school networks | The loader shows progress. Minifying is on the roadmap. Keep the SEO pages lightweight. |
| Name or trademark conflict | Avoid "-dle" and close variants of competitor names (§2); search trademarks before buying |
| Reddit shadow-ban or removal | Use an aged account, the 90/10 rule, one sub per day, read rules, message mods |
| Copycats | Ship weekly, build community (daily habit, teachers), keep "all rights reserved" (LICENSE) |

---

*Sources are linked inline. Sections marked **(Assumption)** are judgement calls to verify. Re-check subreddit rules, platform timings and registrar prices at the moment you act on them.*
