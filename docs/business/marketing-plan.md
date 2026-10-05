# EarthInteractive — Marketing Plan

*Written 5 October 2026 for the product owner (John). Covers October 2026 to early January 2027.*

**Live:** https://john-redman.github.io/earth-interactive/ (moving to a custom domain soon)
**Constraints:** one person, low budget, no backend yet (leaderboards with a type-in name are in progress), static hosting on GitHub Pages.

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
| True-size tools that drag shapes across a flat map | Countries lift out as **3D puzzle pieces** you drag around the globe, plus a side-by-side stats table |
| Guessing games that are only a game | An explorer, a data lens, a compare tool and games in one place, all reachable from a single link |
| One political map | **Three border views** (UN / De facto / Neutral) with the reasoning written down |

### Audiences

| Audience | One-line pitch | Where they are | Feature to lead with |
|---|---|---|---|
| **Students & teachers** | "A free, ad-light globe your class can explore, compare and quiz on, with nothing to install and no logins." | Teacher Facebook groups, X/Bluesky edu-community, TpT, Google Classroom, district tech coordinators | True-size compare (the Mercator lesson), country cards, Find it, and teacher mode later |
| **Geography nerds** | "Every country, three border views, real sizes, and a daily challenge that punishes 'roughly over there'." | r/geography, r/MapPorn, geography Discords, GeoGuessr community | Neutral/de facto views, distance scoring, Daily Challenge |
| **Casual daily-puzzle players** | "Five countries. One globe. Same puzzle for everyone today. Share your squares." | Wordle-style share threads, group chats, X, Facebook | Daily Challenge plus the emoji grid |
| **Map & data-viz fans** | "Flip the whole planet to population, density or GDP per person in one tap, on a real sphere." | r/dataisbeautiful, r/InternetIsBeautiful, HN, Bluesky dataviz | Data lenses, live day/night, WebGL polish |
| **Travellers** | "See how big your next trip really is. Lay Japan over California, Italy over your home state." | r/travel-adjacent subs, TikTok/Reels travel content, Pinterest | Compare links (`?compare=JPN,USA`) and country cards |
| *Bonus:* **Web devs / Three.js people** | "A no-build, ~1 MB-data WebGL globe with a stencil trick for seamless fills. Here's how." | r/threejs, r/webdev Showoff Saturday, Three.js forum, HN | The tech write-up (triangulation, stencil, mobile tier) |

### Core hook lines (reuse everywhere)

1. **"Your map has been lying to you."** *(Mercator hook, the strongest.)*
2. **"Pull a country off the globe and drop it somewhere else."**
3. **"Greenland vs Africa. Watch."** *(any big "surprise" pair)*
4. **"Same 5 countries for everyone today. How close can you get?"**
5. **"Flick the globe hard. Turn your sound on."** *(easter egg, built for TikTok)*
6. **"One globe, three borders. Who draws the map?"** *(use carefully, see §10)*
7. **"How big is Texas, really?"** *(the SEO and travel hook)*

---

## 2. Domain name ideas

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

### 3.1 Pre-launch checklist (5–18 Oct 2026)

**Must have, or the launch will be judged on it:**

- [ ] **Custom domain** on GitHub Pages.
  - Verify the domain in GitHub first (TXT record), then add the A records `185.199.108.153` to `.111.153` and a `www` CNAME. GitHub then redirects between apex and www automatically [[GitHub Docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)].
  - Tick **Enforce HTTPS**. It can take up to 24 h to become available [same source].
  - Update `og:url` and `og:image` to the new domain. Keep the old github.io URL working: GitHub redirects it when a custom domain is set.
- [ ] **Fresher population/GDP data.** The current figures are mostly from 2019 (README). HN and r/dataisbeautiful will point this out within minutes. *(Assumption, based on how those communities usually react.)*
- [ ] **Border-view editorial review** (roadmap item). At minimum, label the De facto view's pre-2022 eastern Ukraine line as a known limitation in the UI and on an "About the borders" page. See §10.
- [ ] **Analytics**: a cookieless tool, so no consent banner is needed for basic counts (§8) [[Plausible](https://plausible.io/cookieless-web-analytics)].
- [ ] **Privacy page** (`/privacy`): what analytics collects (no cookies, no personal data), what ads collect (once enabled), localStorage use (daily results, best score), and the leaderboard name policy.
- [ ] **About / borders page**: who made it, data sources (with ODbL attribution already in the footer), and the three-view policy in plain words, linked from the view switcher.
- [ ] **Feedback link**: a footer link to a GitHub issue template, plus a mailto or a free Tally/Google Form. Reply to every message in launch week.
- [x] **OG image**: already exists (1200×630). Optional: a second variant showing the compare pieces, for compare links.
- [ ] **Ads decision**. *(Assumption/opinion: launch without ads, or with them clearly minimal.)* HN and Reddit react poorly to ad-heavy "Show" posts, and you need consent tooling for EEA ads anyway (§10).
- [ ] **Clean share text**. The Daily share already includes the day and a link. Point it at the new domain.
- [ ] **Accounts made 2+ weeks before launch, and actually used.** r/webdev wants accounts at least 14 days old with 25+ karma [[founderreply](https://founderreply.com/reddit/webdev)]. Spend 15 min a day commenting helpfully in your target subs now (the 90/10 norm).
- [ ] **Assets prepared**: three 20–35 s vertical videos (Mercator compare, Daily Challenge, rollercoaster with sound), five screenshots (desktop and phone), and one GIF of puzzle pieces lifting out.
- [ ] **Launch copy drafted** for every channel below, kept in one doc.
- [ ] **Smoke test on the new domain**: phone (390×844), desktop (1280×800), `?quality=low`, `?compare=GRL,COD`, `?play=daily`, offline reload. Make sure the service worker serves the new origin.

### 3.2 Launch week, day by day (Mon 19 – Sun 25 Oct 2026)

All times are given in **US Eastern (ET)** and **UTC**. If you're in the UK, BST ends on 25 Oct, so UTC+1 applies until then. *(Your timezone is an assumption.)* About 57% of Reddit's users are in the US, according to [[singlegrain](https://www.singlegrain.com/search-everywhere-optimization/best-times-to-post-on-reddit-for-maximum-engagement/)], so ET is the reference.

The rhythm: one big community post per day, so you can reply to every comment for 2–3 hours afterwards. Never post the same link to several subs in one hour; that looks like spam and is treated as such.

| Day | Primary action | Time | Secondary |
|---|---|---|---|
| **Mon 19** | **Soft launch**: personal X, Bluesky, Mastodon and LinkedIn post ("I built this"). Send it to 10–20 friends and ask for honest bug reports, *not* votes. | 12:00–14:00 ET (16:00–18:00 UTC) | Fix anything that breaks. Check that analytics shows referrers. |
| **Tue 20** | **Show HN** (template below) | 09:00–10:00 ET (13:00–14:00 UTC). HN advice clusters on Tue–Thu, 14:00–17:00 UTC [[Alcazar](https://blog.alcazarsec.com/tech/posts/best-time-to-post-on-hacker-news)] | Stay at your keyboard for 4 hours and answer every technical question in depth. |
| **Wed 21** | **r/InternetIsBeautiful.** Frame it as *the globe/true-size explorer*, **not the games**: the sub bans web games, quizzes and puzzles, and sites requiring sign-up [[rankhog](https://rankhog.com/subreddits/internetisbeautiful), [gummysearch](https://gummysearch.com/r/InternetIsBeautiful/)]. | 07:00–10:00 ET [[webtonic](https://www.webtonic.io/blog/best-times-to-post-on-reddit-for-maximum-engagement)] | Post the "Greenland vs Africa" video to TikTok/Reels/Shorts (14:00–18:00 local) [[Sprout TikTok](https://sproutsocial.com/insights/best-times-to-post-on-tiktok/)] |
| **Thu 22** | **r/geography** or **r/MapPorn**, one only. Lead with an image or GIF and a genuine question ("Which pairing surprised you most?"). **I could not verify either sub's current rules on self-made sites.** Read the sidebar and message the mods first if it's unclear. | 08:00–10:00 ET | r/threejs: a technical post with a GIF and how the stencil and triangulation work. |
| **Fri 23** | **r/SideProject.** It welcomes show-and-tell, but needs a story and context, not a bare link [[alldirectories](https://alldirectories.org/subreddit/r-sideproject/), [launchwake](https://www.launchwake.com/channels/r-sideproject)] | 07:00–09:00 ET | Email 5 newsletters/blogs (template in §7). Join 2–3 geography Discords and read their rules. |
| **Sat 24** | **r/webdev Showoff Saturday**, the only day self-promo is allowed there. Focus on technical details: stack, challenges, live demo [[founderreply](https://founderreply.com/reddit/webdev), [rankhog](https://rankhog.com/subreddits/webdev)] | Morning ET | Bluesky/Mastodon thread: "5 things I learned building a WebGL globe". |
| **Sun 25** | **Rest and review.** Write down referrers, top deep links, bug list and the best comments. | — | Draft the r/dataisbeautiful [OC] post for next week. |

**Week 2 follow-ups (26 Oct – 1 Nov):**
- **r/dataisbeautiful**: post a *static image or GIF* of a data lens (for example, population density on the globe) titled with **[OC]**. Your first top-level comment must state the data source(s) and the tool [[Wikipedia: r/dataisbeautiful](https://en.wikipedia.org/wiki/R/dataisbeautiful)]. Cite Natural Earth and mledoze/countries plus "EarthInteractive (Three.js)". **Only do this after the data refresh.**
- **r/WebGames**: rules unverified [[Mike Young](https://mikeyoung.ghost.io/subreddits-you-can-use-to-talk-about-your-game/) says they "are a bit different"]. Read the sidebar and lead with *Daily Challenge*, because this is where the game angle belongs.
- **r/Teachers / r/edtech**: education subs commonly ban direct self-promotion [[thinkacademy](https://www.thinkacademy.ca/blog/blog/2025/09/07/reddit-education-community-rules-guide-2/)]. **Don't post a link.** Ask the mods, or wait for a weekly resource thread, or simply answer "what do you use to teach map projections?" questions with a disclosed mention ("I made a free one").

### 3.3 Hacker News — Show HN

Rules that matter: it must be something people can try, with no sign-up; you must be around to discuss it; and **don't ask anyone to upvote or comment** [[showhn.html](https://news.ycombinator.com/showhn.html)]. Show HN posts also live on the /show page after they fall off /new [[dev.to](https://dev.to/developuls/how-to-post-on-hacker-news-without-getting-flagged-or-ignored-2eaf)].

**Title options** (plain and specific, no superlatives):
- `Show HN: A true-to-scale 3D globe where countries pop out to compare real sizes`
- `Show HN: EarthInteractive – drag countries around a WebGL globe to see their true size`

**First comment** (post it immediately):

```
Hi HN, I'm John. I built EarthInteractive, a browser globe (Three.js, no build step,
plain ES modules) that started as "how big is Greenland really?".

What you can do:
- Tap a country for facts; pick two and they lift out as curved puzzle pieces you
  can drag anywhere on the sphere to compare real size (?compare=GRL,COD).
- Recolour the planet by population, density, GDP per person, area.
- A daily challenge: same 5 countries for everyone, distance-scored.
- Flick the globe hard with sound on. (Sorry.)

Some things that were harder than expected:
- Large flat triangles sag below the ocean sphere, so fills use depthTest off +
  far-side discard + a stencil so each pixel blends once (no seams).
- Earcut in lon/lat then longest-edge bisection measured on the sphere; measuring
  in raw degrees turned Antarctica alone into ~200k triangles.
- Phones get a lighter tier and an adaptive resolution governor.

Borders are political. There are three views (UN / de facto / recognition-neutral)
and the rules are written down here: <link>. Happy to hear where they're wrong.

Data: Natural Earth, mledoze/countries (ODbL). No sign-up, no cookies.
Feedback very welcome, especially on phones.
```

### 3.4 Product Hunt (later, not launch week)

- **When:** Tuesday 17 Nov 2026, during Geography Awareness Week (16–20 Nov 2026) [[National Today](https://nationaltoday.com/geography-awareness-week/)]. That gives you an education news hook, and leaderboards or the share card should ship by then.
- **Day and time:** Tue–Thu has the most engagement. Launch at **12:01 AM PT** to get the full 24-hour window [[fastwaitlist](https://blog.fastwaitlist.com/how-launch-successfully-product-hunt-2025), [launchpact](https://www.launchpact.io/blog/how-to-have-a-successful-product-hunt-launch)].
- **How:**
  - Build a list of people who liked the HN/Reddit posts and *ask them to "check it out"*, never to "upvote". Product Hunt penalises vote-begging [[fastwaitlist](https://blog.fastwaitlist.com/how-launch-successfully-product-hunt-2025)].
  - Post the maker comment straight away, and reply to every comment for the first 6 hours [same source].
  - Gallery: compare GIF, daily grid, data lens, phone screenshot, "three border views" image.
  - Tagline (≤60 chars): *"A true-to-scale globe: pull countries out, compare, play."*
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

### 4.2 Thirty post ideas

Rules for captions:
- **Never type a number from memory.** Read the ratio and values from the compare bar and insert them where you see `{X}`.
- Put the hook in the first 2 seconds of a video and in the first line of a post.
- Use 3–5 hashtags, CamelCase on Mastodon.

| # | Format | Hook / on-screen text | Caption | Hashtags |
|---|---|---|---|---|
| 1 | Compare video | "Greenland vs Africa. Your map lied." | "Pulled both off the globe. Africa is {X}× bigger. Mercator, explain yourself. howbig.earth" | #Geography #Maps #Mercator #TrueSize |
| 2 | Compare video | "Is Alaska really that big?" | "Dropped Alaska on the lower 48. {X}." | #Alaska #USA #Maps |
| 3 | Compare video | "Texas vs France" | "Texans, prepare yourselves. Texas is {X}× France." | #Texas #France #Geography |
| 4 | Compare video | "The UK on top of {US state}" | "Every Brit has wondered this." | #UK #Maps #TrueSize |
| 5 | Compare video | "Russia moved to the equator" | "Dragged Russia south. Watch it shrink." | #Russia #Mercator #MapFacts |
| 6 | Compare video | "Australia vs Europe" | "Laid Australia over Europe: {X}." | #Australia #Europe #Geography |
| 7 | Compare video | "Japan is not small." | "Japan over California. {X}." | #Japan #California #Travel |
| 8 | Compare video | "DR Congo vs Western Europe" | "The country nobody realises is huge." | #Africa #Geography #Maps |
| 9 | Compare video | "Antarctica: the real size" | "Flat maps make it a smear along the bottom. Here it is on a globe." | #Antarctica #Maps |
| 10 | Compare video | "Indonesia across the USA" | "Indonesia stretches {X} km. Here it is laid across the US." | #Indonesia #Travel #Maps |
| 11 | Country card | "Did you know? {Country} has {N} neighbours" | "Tap any country for facts." | #DidYouKnow #Geography |
| 12 | Country card | "Most neighbours of any country" | Read the answer from the app. | #Geography #Trivia |
| 13 | Country card | "Smallest country you can actually tap" | Zoom-in video. | #Microstates #Geography |
| 14 | Country card | "Capital that's not the biggest city" | A series, one country per post. | #Capitals #Geography |
| 15 | Daily share | "Today's Daily Challenge: I got {score}. Your turn." | "Same 5 for everyone. ?play=daily" | #DailyChallenge #GeographyGame |
| 16 | Daily share | "Only {N}/5 exact today. Brutal." | Invite people to reply with their squares. | #DailyPuzzle |
| 17 | Daily share | "Weekly recap: hardest country this week" | A replay video of everyone's misses (once you have aggregate data). | #Geography #Quiz |
| 18 | Lens GIF | "The world by population density" | "One tap recolours the planet." | #DataViz #DataIsBeautiful #Maps |
| 19 | Lens GIF | "GDP per person, on a real globe" | Note the data year honestly. | #DataViz #Economics |
| 20 | Lens GIF | "Area ranking, but on a sphere" | — | #Maps #Geography |
| 21 | Day/night | "Right now, here's where it's night" | A live terminator screen recording. | #Earth #Space |
| 22 | Day/night | "Winter solstice: the Arctic in darkness" (21 Dec) | A seasonal tie-in. | #Solstice #Earth |
| 23 | Day/night | "Who hits 2027 first?" (31 Dec) | Watch midnight cross the globe. | #NewYear #Geography |
| 24 | Easter egg | "Flick it hard. Sound ON." | "I may have added a rollercoaster." | #WebGL #Rollercoaster #Fun |
| 25 | Poll | "Bigger: Mongolia or Iran?" | Reveal the answer the next day. | #Quiz #Geography |
| 26 | Poll | "Which country has the most neighbours?" | — | #Trivia |
| 27 | Border explainer | "One country, three maps: why borders depend on who's drawing" | Calm and neutral. Comments moderated (§10). | #Geography #Maps |
| 28 | Dev log | "How I stopped Antarctica turning into 200k triangles" | A Mastodon/HN-style thread. | #ThreeJS #WebGL #GameDev |
| 29 | Teacher | "A 10-minute Mercator lesson with a free globe" | Link to the lesson plan (§7). | #TeacherTwitter #EdTech #GeographyTeacher |
| 30 | Challenge | "Stitch/duet this with your score" | TikTok duet/stitch prompt. | #GeographyChallenge |

### 4.3 Batch recording workflow

- **Cadence:** every other Sunday, 90 minutes, record 6 to 8 videos.
- **Desktop (best quality):** OBS Studio (free).
  - Set the canvas to **1080×1920**, with a browser window cropped to a 9:16 region. Or record 1920×1080 and crop in an editor.
  - Use **60 fps**. Use `?quality=high` and hide the cursor, or use a large highlighted cursor for "drag" moments.
  - Use deep links to set up each shot instantly: `?compare=GRL,COD`, `?compare=USA,AUS`, `?play=daily`.
- **Phone:** the built-in screen recorder (iOS Control Centre / Android Quick Settings). Turn on Do Not Disturb, and record with system audio for the rollercoaster.
- **Edit:** CapCut or DaVinci Resolve (free). Add **burned-in captions**, since many people watch muted (assumption, a widely held norm). Add on-screen text for the hook in the first 2 s, and end with a 1-second end card showing your domain.
- **Length:**
  - TikTok: aim for **21–34 s** [[Loomly](https://www.loomly.com/blog/tiktok-video-length)]. Longer compare explainers of 60–180 s are an option [[quso](https://quso.ai/blog/best-video-length-for-tiktok)].
  - YouTube Shorts: allowed up to 3 min since Oct 2024 [[Descript](https://www.descript.com/blog/article/how-long-can-youtube-shorts-be)], but keep the same 20–40 s cut.
- **Repurpose:** one recording becomes a vertical video, a GIF for Bluesky/Mastodon/Reddit, and a still for an Instagram carousel.

---

## 5. Growth loops built into the product

Ranked from **highest impact per hour of effort**. Effort is for you, solo, on a static site.

| Rank | Loop | Effort | Impact | Notes |
|---|---|---|---|---|
| 1 | **Shareable daily result** (exists) | Done, plus polish (S) | High | Add `navigator.share()` on mobile (it opens the native share sheet) and keep clipboard copy as a fallback. Make sure the link says `?play=daily`. Put the date and "#EarthInteractive" in the text. |
| 2 | **Compare links with per-pair preview images** | M | High | `?compare=FRA,DEU` works today, but every link previews the same OG image. Social previews come from static HTML, so you need **pre-rendered pages per pair** (see SEO below), each with its own `og:image`. |
| 3 | **"Challenge a friend" link** | S–M | High | After any game: "Challenge a friend". The link carries a seed and your score (`?play=find&seed=abc&vs=8420`). The friend plays the same 10 countries and sees "Beat John's 8,420". No backend needed. |
| 4 | **Streaks (local)** | S | Medium–High | Use localStorage (already used for daily results). Show "🔥 5-day streak" in the share text. **Assumption:** emoji fits CLAUDE.md's rule, since the shareable result is the stated exception. Add a "streak freeze" later. |
| 5 | **Leaderboards (in progress)** | M | Medium | Daily top 50 plus "your rank". Moderate names (§10). The daily board gives people a reason to come back at reset time. |
| 6 | **Programmatic SEO pages** | M–L | High (slow, 2–6 months) | The long-term compounding channel. Details below. |
| 7 | **Embeddable widget** | M | Medium | `<iframe src="https://domain/embed?compare=GBR,USA">` with a "Powered by EarthInteractive" link. Bloggers and teachers embed it, and you earn backlinks. Needs an embed mode with no ads and minimal UI. |
| 8 | **Classroom / teacher mode** | L | Medium–High (education channel) | Custom rounds by region, a class code, nickname-only names, no ads. Section 7. |
| 9 | **Shareable compare image export** (on the roadmap) | M | Medium | "Save image" renders the canvas plus a caption ("Texas is {X}× France — domain") as a PNG, ready for Instagram and TikTok users. |

### Programmatic SEO: "How big is Texas compared to France?"

**The opportunity.** People search for exact comparisons ("how big is X compared to Y", "X vs Y size", "how many Xs fit in Y"). A page that answers with the real ratio *and* an interactive 3D comparison is better than a text answer. Pairs grow combinatorially, so there are thousands of possible pages. *(No search-volume claims here. Check pairs in Google Search Console after launch, plus free keyword tools.)*

**The guardrail.** Google's **scaled content abuse** policy (March 2024, reinforced by an August 2025 spam update) targets many template pages whose main purpose is ranking, especially "swap the keyword, keep everything else" pages [[Patrick Stox](https://patrickstox.com/programmatic-seo/risks/scaled-content-abuse/), [bulkbase](https://bulkbase.ai/seo/understanding-googles-scaled-content-abuse-policy)]. Programmatic pages themselves aren't banned; thin ones are [[eastondev](https://eastondev.com/blog/en/posts/media/20260326-programmatic-seo-guide-2025/)]. So:

1. **Start small.** Launch about 200 country pages and about 150 hand-picked pairs, not 40,000 combinations. Prioritise:
   - US states vs countries, UK vs states
   - "Surprise" pairs: Greenland/Africa, Alaska/USA, Russia/Africa
   - Neighbour pairs
   - Commonly searched travel pairs
2. **Make every page unique and useful:**
   - Ratio and the "fits {N} times" figure
   - Areas and populations (sourced)
   - A latitude note (why Mercator distorts this pair)
   - Shared neighbours
   - Population density comparison
   - A per-pair image
   - A big **"Open in 3D"** button → `/?compare=A,B`
   - Links to 5 related pairs
3. **Add a short human-written intro** to the top 30 pairs.

**How to do it on a static site (no framework):**

1. Add a Node script, for example `tools/build-pages.mjs`, run in CI like `build:data`. It reads `data/world.js` (units, info, area) and writes:
   - `/country/{slug}/index.html`: a lightweight HTML page with facts, flag, neighbours, related compares, and a CTA to `/?c=FRA`
   - `/compare/{a-slug}-vs-{b-slug}/index.html`: H1 "How big is Texas compared to France?", ratio, stats table, image, CTA to `/?compare=…`
   - Each page gets its own `<title>`, meta description, `<link rel="canonical">`, `og:image` and JSON-LD (`WebPage` / `FAQPage`, used sparingly).
2. **Per-page OG images, two options:**
   - (a) Playwright screenshots of `/?compare=A,B&quality=high` at 1200×630, made locally or in CI (CLAUDE.md already documents headless Playwright flags; it renders about 1 fps, so wait on frames).
   - (b) Cheaper: draw both outlines in flat 2D with d3-geo (already a dev dependency) into an SVG, then rasterise with a small library such as `@resvg/resvg-js`. *(Assumption: that this library fits your vendoring rules. Check before adding.)*
3. **`sitemap.xml`** listing every page with `<lastmod>`, plus `robots.txt` pointing to it. Submit the sitemap in **Google Search Console** and **Bing Webmaster Tools** (both free).
4. **Deploy:** `pages.yml` publishes only listed directories, so `country/`, `compare/`, `sitemap.xml` and `robots.txt` must be added to the workflow (CLAUDE.md: "add new top-level files there"). Keep the pages out of the service worker's `CORE` list.
5. **Internal links:** the app's country card can link to "Compare {country} with…" pages, and every SEO page links back into the app. Footer "Popular comparisons" links help crawlers find the pages.
6. **Measure:** Search Console impressions per page after 4–8 weeks. Prune or improve pages with zero impressions after 3 months.

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
| **Daily trio** | Daily Location (existing) + Daily Flag + Daily "Bigger?" combined into one share card: `🌍🟩🟩🟨⬛🟩 🏳️🟩🟩🟩 📏🟩🟨`. | No |
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

| When | Event | Content / feature hook |
|---|---|---|
| 16–20 Nov 2026 | **Geography Awareness Week** (third week of November) [[National Today](https://nationaltoday.com/geography-awareness-week/), [awarenessdays](https://www.awarenessdays.com/awareness-days-calendar/geography-awareness-week/)] | Product Hunt launch, a teacher outreach wave, a "GAW Daily" themed week |
| 18 Nov 2026 | **GIS Day** (third Wednesday of November) [[gisday.com](https://www.gisday.com/en-us/overview)] | Data-lens content and a tech/GIS community post |
| 21 Dec 2026 | Winter solstice | Day/night video |
| 31 Dec 2026 | New Year's Eve | "Midnight crossing the globe" live day/night video |
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

1. **"Map Projections in 10 Minutes"** lesson plan, one page as PDF/Google Doc.
   - Objective → hook (Greenland vs Africa on a flat map) → students use `?compare=` links → worksheet (5 pairs: predict, then check the ratio) → discussion ("why do we still use Mercator?").
2. **"Country Detective"** worksheet using country cards: neighbours, capital, rank.
3. **"Daily Challenge Warm-up"**: a bell-ringer slide template that teachers project each morning.
4. **"Who draws the borders?"** (older students): compares the three views. Neutral framing, optional, and clearly marked as sensitive.
5. **Quick-start card**: link, keyboard shortcuts, `?quality=low` for old Chromebooks, and "no sign-up, no student data collected".

### 7.2 Where to distribute

| Channel | How | Notes |
|---|---|---|
| **Teachers Pay Teachers** | List items 1–3 as **free** resources linking to the site. | TpT requires a free product before paid ones. Seller fee terms have changed recently and sources disagree (a $29 one-time fee vs. a free basic account) [[goldcityventures](https://goldcityventures.com/how-to-sell-on-teachers-pay-teachers/), [itsallprimary](https://itsallprimary.com/the-costs-of-selling-on-teachers-pay-teachers/)]. **Check current terms first.** Fall back to hosting the PDFs on your own `/teachers` page. |
| **Google Classroom** | A "Share to Classroom" button on the `/teachers` page. Google provides an official share button; verify the current embed snippet in Google's docs. | Low effort. |
| **Your own `/teachers` page** | Lesson plans, deep links, the privacy statement for schools, embed codes. | Gives teachers one page they can bookmark. |
| **Teacher communities** | Facebook groups for geography/social studies teachers, #TeacherTwitter / edu Bluesky, r/geography teachers' threads. Disclose that you made it. | Ask mods before posting a link. |
| **Common Sense Education / edtech directories** | Submit for review (verify their submission process). | Slow but credible. |

### 7.3 Email template: teacher outreach

```
Subject: Free 3D globe for your map-projection lesson (no logins)

Hi {Name},

I saw your {post/resource} on {topic} and thought this might be useful.

I built EarthInteractive, a free, true-to-scale 3D globe that runs in any browser
(Chromebooks included). Students can pull two countries off the globe and drag them
side by side to see their real size; it makes the "Mercator distorts size" point in
about ten seconds. Example: {domain}/?compare=GRL,COD

There's a one-page lesson plan and worksheet here: {domain}/teachers
No sign-up, no student data collected, no cookies.

If you try it with a class, I'd love one sentence of feedback on what worked or
didn't. I'm a solo developer and I'm building a teacher mode next.

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

Targets: map blogs (Maps Mania), edtech blogs, local press near you ("local developer builds…"), and dev newsletters.

```
Subject: The globe that shows how big countries really are

Hi {Name},

Most maps we grew up with shrink Africa and inflate Greenland. EarthInteractive is a
free, true-to-scale 3D globe where you can pull countries off the planet and lay them
over each other to see their real size, plus a Wordle-style daily geography challenge.

Why it might interest your readers:
- {Hook for their beat: classroom use / data lenses / WebGL craft / Geography Awareness Week}
- Three border views (UN, de facto, recognition-neutral) with published rules
- Free, no sign-up, works on phones and Chromebooks

Try: {domain}/?compare=GRL,COD
Press kit (screenshots, GIFs, video): {domain}/press

Happy to answer questions or provide a custom comparison for your piece.
John {Surname}, {city}, {email}
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

**Events to track** (names are snake_case, used the same way everywhere):
- `open_country`
- `compare_start`
- `compare_stats_open`
- `lens_change`
- `view_change`
- `daily_start`, `daily_finish`, `daily_share`
- `find_start`, `find_finish`
- `rollercoaster`
- `pwa_install`
- `leaderboard_submit`
- `deeplink_open` (with prop `type=c|compare|play`)

### 8.2 UTM conventions

```
?utm_source={platform}&utm_medium={social|community|email|video|directory|referral}&utm_campaign={yyyy-mm-name}&utm_content={variant}
```

| Example | Use |
|---|---|
| `utm_source=tiktok&utm_medium=video&utm_campaign=2026-10-launch&utm_content=greenland-africa` | Link in bio and video descriptions |
| `utm_source=newsletter-jsweekly&utm_medium=email&utm_campaign=2026-10-launch` | Newsletter submissions |
| `utm_source=teachers&utm_medium=email&utm_campaign=2026-11-gaw` | Teacher outreach |

- **Don't use UTMs on Reddit or HN**: they look spammy, and the referrer is already captured. Use clean links there.
- Keep links short. Videos can use a short path on the redirect domain (for example `howbig.earth/tx-fr` → 301 to the full URL with UTMs).
- The app already resets the query string when you open a country card, so copied card links won't carry UTMs. A small `history.replaceState` that strips `utm_*` after the analytics script fires would stop UTMs spreading through copy-pasted address-bar links. *(Suggestion only, not implemented.)*

### 8.3 KPIs per stage (replace the targets with your week-2 baseline)

| Stage | KPI | Source |
|---|---|---|
| **Awareness** | Unique visitors per week; referrer mix; video views | Analytics, platform dashboards |
| **Activation** | % of visitors who open a country, start a compare, or start a game | Events ÷ visitors |
| **Engagement** | Daily Challenge finishes per day; compare sessions per visit | Events |
| **Retention** | Returning visitors per week; median streak length (once built) | Analytics, local streak to event |
| **Referral** | `daily_share` ÷ `daily_finish` (share rate); visits landing on `?play=daily` or `?compare=` | Events, landing pages |
| **SEO** | Search Console impressions and clicks on country/compare pages | GSC |
| **Education** | Visits to `/teachers`; lesson plan downloads; teacher replies | Analytics, inbox |
| **Revenue** (later) | Ad RPM; ad-free share of sessions | Ad network |

### 8.4 Weekly review ritual (Sundays, 30 minutes)

1. **5 min:** Fill in a one-row-per-week spreadsheet with visitors, activation %, daily finishes, share rate, returning %, and top 3 referrers.
2. **10 min:** Check the top content. Which post or video drove the most visits, and why?
3. **5 min:** Triage feedback and issues. Pick at most 2 product fixes for the week.
4. **5 min:** Choose next week's 4 posts from the 30-idea bank.
5. **5 min:** Burnout check: hours spent vs. planned (§10). Cut something if you're over.

---

## 9. 90-day roadmap & budget tiers

Assumes **8–10 hours a week** (evenings and one weekend block). Marketing and product share the same hours.

| Wk | Dates | Focus | Key tasks | Hrs |
|---|---|---|---|---|
| 1 | 5–11 Oct | Foundations | Buy the domain(s), set up DNS and GitHub Pages, set up analytics, start the data refresh, warm up Reddit/Bluesky accounts (comment daily) | 10 |
| 2 | 12–18 Oct | Launch-ready | Privacy, About/borders and feedback pages; De facto limitation label; record 3 videos and a GIF; draft all launch copy; smoke test | 10 |
| 3 | 19–25 Oct | **Launch week** | Day-by-day plan in §3.2 | 15 (spike) |
| 4 | 26 Oct–1 Nov | Follow-through | r/dataisbeautiful [OC], r/WebGames, newsletters, directories; fix the top bugs from feedback; `navigator.share` on the daily | 8 |
| 5 | 2–8 Nov | Loops | "Challenge a friend" links and local streaks; start the weekly content calendar | 9 |
| 6 | 9–15 Nov | Education prep | `/teachers` page plus 3 lesson resources; TpT listing; email 20 teachers; schedule PH | 9 |
| 7 | 16–22 Nov | **GAW + Product Hunt (Tue 17)** | PH launch; GIS Day post (18 Nov); teacher wave; leaderboards live | 12 |
| 8 | 23–29 Nov | SEO build | `build-pages.mjs`: 200 country pages, sitemap, Search Console | 9 |
| 9 | 30 Nov–6 Dec | SEO build | 150 compare pages plus OG images; internal links; submit sitemap | 9 |
| 10 | 7–13 Dec | Game hub v1 | "Bigger?" true-size guess game, combined daily share | 9 |
| 11 | 14–20 Dec | Content | Batch-record the solstice and NYE videos; creator outreach (10 emails) | 6 |
| 12 | 21–27 Dec | Light week | Solstice post; holiday rest (plan for it) | 3 |
| 13 | 28 Dec–3 Jan | Review | NYE day/night video; 90-day review; plan Q1 (flag game, teacher mode, Jan term outreach) | 5 |

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

**Likely flashpoints** (from `docs/border-views.md`):
- Taiwan, Kosovo, Crimea/eastern Ukraine, Kashmir, Western Sahara, Palestine, Northern Cyprus, Somaliland
- The **De facto view's pre-2022 Donetsk/Luhansk line**, a documented known limitation that critics will raise first

**Before launch:**
- [ ] Fix the eastern Ukraine line or **label it clearly in the UI**.
- [ ] Publish an "About the borders" page: three views, the sources (UN resolutions, Natural Earth), and "how to report an error".
- [ ] Make the default view a conscious choice, and say on the About page *why* it's the default.
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
- **Leaderboard names:** a typed name could be a child's real full name, which counts as personal information under COPPA.
  - Run a profanity and real-name filter.
  - Cap names at 12 characters.
  - In classroom mode, offer **generated nicknames only** ("Swift Okapi").
  - Store only nickname, score and day, with automatic deletion after N days.
  - Say all of this on the privacy page.
- **Don't** advertise directly to under-13s on social platforms. Market to teachers and parents.

### 10.3 Burnout (the biggest risk for a solo project)

| Signal | Mitigation |
|---|---|
| Working more than 12 h/week for 2+ weeks outside launch | Cut the content calendar to Tue (video) + Thu (lens) only |
| Doom-refreshing analytics or comments | Check twice a day in launch week, once a day after, and weekly reviews only from week 5 |
| Feature creep from feedback | Use one public "ideas" issue and pick at most 2 items per week |
| Negative or hostile comments | Use the canned responses in §10.1, and walk away after one reply |
| Content treadmill | Batch-record every other Sunday; reuse each recording in 3 formats; repost your best evergreen video every 6–8 weeks (assumption: recycling top content is common practice) |
| Holiday gap | Week 12 is planned as light, and scheduled posts cover it |

### 10.4 Other risks

| Risk | Mitigation |
|---|---|
| Stale data (2019 population/GDP) undermines credibility | Refresh before launch (roadmap) and show the data year in the lens legend |
| Phones or Chromebooks run slowly, causing poor first impressions | Already has a `low` tier and governor. Mention `?quality=low` in teacher materials. |
| ~1.1 MB data load on slow school networks | The loader shows progress. Minifying is on the roadmap. Keep the SEO pages lightweight. |
| Name or trademark conflict | Avoid "-dle" and close variants of competitor names (§2); search trademarks before buying |
| Reddit shadow-ban or removal | Use an aged account, the 90/10 rule, one sub per day, read rules, message mods |
| Copycats | Ship weekly, build community (daily habit, teachers), keep "all rights reserved" (LICENSE) |

---

*Sources are linked inline. Sections marked **(Assumption)** are judgement calls to verify. Re-check subreddit rules, platform timings and registrar prices at the moment you act on them.*
