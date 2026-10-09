# EarthInteractive — Launch kit

*Written 9 October 2026 against the product as it is now (CHANGELOG `[Unreleased]`). The plan and the timing
(L−28 to L+62) are in [marketing-plan.md](marketing-plan.md) §3 and §9.*

Ready-to-paste copy for launch and the weeks after. Plain words, no hype.

**Before you paste**

- **`{SITE}`** is the site address. Today that is `https://john-redman.github.io/earth-interactive/`. Launch waits
  for the domain, so replace `{SITE}` with the domain in one pass once it's live (GitHub redirects the old links,
  see [docs/launch-checklist.md](../launch-checklist.md)). It ends with a slash, so `{SITE}?c=FRA` works.
- **`{X}`** is a number to read from the app on the day (Compare stats, the card, the lens legend). Never type a
  number from memory.
- **Figures in this kit** come from the product or its own pages (`about.html`, `why-maps-lie.html`,
  `docs/seo.md`). There are no user numbers, quotes or press mentions yet. Don't invent any.
- **Borders:** describe the three views only with the neutral wording used here. Never name a specific dispute in
  public copy (marketing plan §10.1).
- **No emoji**, except the Daily Challenge result grid (the app's own share format).
- **No UTMs on Reddit, Hacker News or Product Hunt** (marketing plan §8.2).
- **Check what's switched on at launch** and delete lines that don't apply: analytics (GoatCounter), the
  leaderboard, ads, the contact address.

## Contents

1. [Descriptions](#1-descriptions)
2. [Hacker News: Show HN](#2-hacker-news-show-hn)
3. [Reddit](#3-reddit)
4. [Product Hunt](#4-product-hunt)
5. [Bluesky / X thread](#5-bluesky--x-thread)
6. [Ten short videos](#6-ten-short-videos)
7. [Teachers](#7-teachers)
8. [Press and bloggers](#8-press-and-bloggers)
9. [FAQ](#9-faq)
10. [Product suggestions from a marketing view](#10-product-suggestions-from-a-marketing-view)

---

## 1. Descriptions

**One line**

> A free, true-to-scale 3D globe: lift any country off it, drag it anywhere, and see its real size.

**50 words**

> EarthInteractive is a free 3D globe that runs in your browser. Tap any country for facts. Lift two countries off
> the globe and drag them side by side to compare their true size. Colour the world by population or wealth. Play
> a daily geography challenge. No sign-up, nothing to install.

**150 words**

> EarthInteractive is a free, true-to-scale 3D globe for the browser. Flat world maps stretch everything far from
> the equator, so Greenland looks about as big as Africa. Africa is really about fourteen times larger. A globe has
> no such distortion.
>
> Tap a country for its capital, population, area, density, GDP, languages, currency and neighbours. Choose
> Compare, tap a second country, and both lift off as puzzle pieces at their true size. Drag them anywhere: over
> the equator, up to the Arctic, next to your own country. Colour the world by population, people per km², GDP
> per person or land area. Play the Daily Challenge, with the same five countries for everyone, or Find it.
>
> The globe shows the world three ways: UN membership, who administers each area on the ground, and a neutral
> view that marks disputed areas. It works on phones, tablets and computers. No sign-up, nothing to install.

---

## 2. Hacker News: Show HN

Rules that matter ([showhn.html](https://news.ycombinator.com/showhn.html)): people must be able to try it
without signing up, you must be there to answer, and you must never ask anyone to upvote or comment. Post on a
Tuesday to Thursday morning US Eastern (marketing plan §3.2), then stay for four hours.

**Title** (HN allows 80 characters; both fit)

- `Show HN: A true-to-scale 3D globe – lift countries out and compare their size`
- `Show HN: EarthInteractive – drag countries around a WebGL globe, no build step`

**Link:** `{SITE}` (the plain address, not a deep link).

**First comment** (post it straight away)

```
Hi HN, I'm John. EarthInteractive is a browser globe that started as "how big is
Greenland really?". Tap a country, choose Compare, tap another, and both lift off
as curved pieces at their true size that you can drag anywhere on the sphere:
{SITE}?compare=GRL,COD

It also has country facts, four data lenses (population, density, GDP per
person, area), three border views, a daily five-country challenge, real-time day
and night, and the main ocean currents with their names and typical speeds.

How it's built:
- Plain ES modules and an import map. No framework, no bundler, no build step for
  the app; three.js r170 is vendored. A Node script generates the ~1.1 MB data
  file from Natural Earth, mledoze/countries and World Bank figures.
- All countries in a view draw in 3 draw calls (one fill mesh, two line batches).
  Each country's colour, opacity, hatching and visibility live in a float texture
  that the shaders read. It used to be about 400 calls.
- Large flat triangles sag below the ocean sphere, so fills skip the depth test,
  discard far-side fragments and use a stencil so each pixel blends once. No
  seams on shared edges.
- Triangulation is earcut in lon/lat, then longest-edge bisection measured on the
  sphere. Measuring in raw degrees turned Antarctica alone into ~200k triangles.
- About 80 cargo ships on hand-drawn sea lanes are one InstancedMesh, so one draw
  call (their wakes are a second). They are decoration, not live ship positions.
- Phones get a lighter tier: no MSAA, a capped and adaptive pixel ratio, simpler
  borders (cut where the neighbour changes, so shared borders still match) and
  half-rate drawing while nothing moves.
- The 217 country pages and 150 comparison pages are plain HTML generated at
  deploy, so the facts work without WebGL.

Borders are political. The globe shows the world three ways: UN membership, who
administers each area on the ground, and a neutral view that marks disputed
areas. The rules are written down here: <link to docs/border-views.md on GitHub>.
Corrections with a source are welcome.

No sign-up, no cookies. The source is public on GitHub, but it isn't open source
(all rights reserved). Flick the globe hard with sound on if you like surprises.

Feedback is very welcome, especially from phones and older laptops.
```

If ads or a cookie-setting tool are live by launch day, delete "no cookies".

**Likely questions, short answers**

- *Why no framework?* The app is one canvas and a few panels. Plain modules load fast and need no build step.
- *Is it open source?* No. The code is public to read; the licence is all rights reserved.
- *Are the ships or clouds live?* No. Ships follow drawn sea lanes; clouds are decorative. Day and night and the
  Sun's position are real time.
- *How accurate are the sizes?* Areas come from the map shapes (Natural Earth, 1:50m) or the official figure for
  small places. Small islands are drawn roughly at this scale.

---

## 3. Reddit

**Rules change often. Before every post, open the subreddit, read the sidebar rules and the latest mod posts, and
follow them over anything written here.** Where this kit says "unverified", nobody has checked the rules.

General habits (marketing plan §3.2): one subreddit per day; an account with real history; say that you made it;
reply to every comment for the first two or three hours; no UTMs.

### r/InternetIsBeautiful

*Rules note:* secondary sources (marketing plan §3.2) say the sub removes web games, quizzes, puzzles and sites
that need sign-up. Present the globe and the true-size comparison. Don't mention the games in the title or the
comment. Check the sidebar first.

**Title:** `A 3D globe where you can lift any country off and drag it anywhere to see its true size`

**Link:** `{SITE}`

**Comment:**

> I made this. Tap a country, choose Compare, then tap a second one. Both lift off the globe at their true size,
> and you can drag them anywhere. Greenland next to DR Congo is a good first try. You can also colour the world
> by population or wealth, and zoom in on the oceans to see the main currents. It works on phones, and there's no
> sign-up. Borders and coastlines are from Natural Earth; population and GDP from the World Bank.

### r/geography

*Rules note:* unverified. Read the sidebar. If self-promotion is restricted or unclear, send the post text to the
mods first and wait for a yes. Lead with a question, not a link.

**Title:** `Which country-size comparison surprised you most when you saw it on a globe?`

**Body:**

> On flat maps Greenland looks about as big as Africa. On a globe, Greenland is smaller than DR Congo alone.
> Norway, Sweden and Finland together are also smaller than DR Congo.
>
> I've been building a free 3D globe where you can lift two countries off and set them side by side at their true
> size (disclosure: I made it). Greenland vs DR Congo: {SITE}?compare=GRL,COD
>
> Which pairs surprised you? I'm adding more to the comparison pages and would rather add the ones people actually
> wonder about.

### r/MapPorn

*Rules note:* unverified. The sub is for map images, so a bare link to an app will likely be removed
(assumption). Post a still image. Check whether the sub wants an [OC] tag, a source comment, or no self-made
tools at all.

**Title:** `Greenland and DR Congo side by side at true size, on a globe instead of a flat map [OC]`

**Image:** screenshot 1 in §8 (Compare stats open).

**First comment:**

> Made with a 3D globe I built (Three.js). Areas from the app's Compare stats: Greenland {X} km², DR Congo {X} km².
> Borders and coastlines: Natural Earth. Interactive version: {SITE}?compare=GRL,COD

### r/teachers

*Rules note:* education subs commonly ban self-promotion (source in marketing plan §3.2). Expect a plain link post
to be removed. Ask the mods first, or use a resource thread if the sub has one.

**Message to the mods:**

> Hi, I'm a solo developer. I made a free 3D globe for comparing the true size of countries. It has no accounts and
> no sign-up, and students never type a name. Would a post sharing it as a free classroom resource be allowed, or is
> there a thread I should use instead? Thanks.

**Post, only if the mods say yes**

**Title:** `Free resource: a 3D globe for the "flat maps distort size" lesson (no accounts)`

> Disclosure: I made this, and it's free. Students lift two countries off a 3D globe and put them side by side at
> their true size. Greenland next to DR Congo makes the Mercator point in a few seconds: {SITE}?compare=GRL,COD
>
> It also has country facts, a daily five-country challenge for warm-ups, and a page for every country that works
> without 3D. No accounts, no sign-up, nothing to install. I'd like to hear what works in a real classroom and
> what doesn't.

**Reply for "how do you teach map projections?" threads** (only where it answers the question):

> Disclosure: I made it, but a free 3D globe where students drag countries side by side at true size works well
> for this. Greenland vs DR Congo: {SITE}?compare=GRL,COD. No accounts.

---

## 4. Product Hunt

Timing and rules: marketing plan §3.4. Ask people to "check it out", never to upvote.

**Tagline** (60 characters at most): `A true-to-scale 3D globe. Lift countries out and compare.`

**Description** (keep under 260 characters; trust the form's counter):

> Spin a true-to-scale 3D globe in your browser. Lift two countries off and drag them side by side to see their
> real size. Tap any country for facts, colour the world by data and play a daily geography challenge. Free, no
> sign-up.

**Maker comment:**

> Hi, I'm John. I built EarthInteractive because flat maps make Greenland look about as big as Africa, when Africa
> is about fourteen times larger. On this globe you can lift any two countries off and lay them side by side at
> their true size, then share a square image of the pair.
>
> There's also a card for every country, four data lenses, a Daily Challenge with the same five countries for
> everyone, and an ocean with its main currents, cargo ships and real-time night. It runs in the browser on phones
> and computers, with no sign-up.
>
> I'm one person and I read every comment. What would you compare first?

**Gallery:** compare, country card, data lens, Daily Challenge, phone. `marketing/banners/producthunt-gallery-*.jpg`
were made on 5 October, before the calm ocean, ships, clouds and redrawn currents. Re-shoot them first. Leave the
border-view image out, or put it last.

---

## 5. Bluesky / X thread

Six posts, each under 280 characters (X's limit; Bluesky allows 300). Attach a video or image to posts 1–4 and
write alt text for every one.

**1/6** *(video: Greenland vs DR Congo)*
> Flat maps make Greenland look about as big as Africa. Africa is about fourteen times larger. So I built a 3D globe
> where you can lift countries off and compare them at their true size.

*Alt:* Greenland and DR Congo lift off a 3D globe and sit side by side; DR Congo is larger.

**2/6** *(GIF: a piece dragged from the Arctic to the equator)*
> Tap a country, choose Compare, tap another. Both lift off as puzzle pieces. Drag them anywhere: over the equator,
> up to the Arctic, next to home. They keep their true size wherever they go.

**3/6** *(image: country card)*
> Every country has a card: capital, population, area rank, density, GDP, languages, currency and neighbours. The
> Data button colours the whole planet by population, density, GDP per person or land area.

**4/6** *(image: Daily Challenge with a miss line)*
> There's a Daily Challenge: the same five countries for everyone, scored by distance. Miss, and a line shows how
> far off you were. {SITE}?play=daily

**5/6**
> The ocean is drawn like a real globe: 33 major currents with their names and typical speeds, cargo ships on the
> main sea lanes, and night where it is night right now.

**6/6**
> It's free, it runs in your browser, and there's no sign-up: {SITE}
> Flick the globe hard with your sound on.

---

## 6. Ten short videos

**Recording notes**

- Vertical 1080×1920 at 60 fps (OBS, or the phone's screen recorder for touch and sound). `?quality=high` on
  desktop.
- Deep links set up each shot: `?c=FRA`, `?compare=GRL,COD`, `?view=un|defacto|neutral`, `?play=daily`,
  `?play=classic`.
- Shift on its own zooms in smoothly and Ctrl zooms out (hold to glide), which suits slow zooms on camera.
- Day and night is the corner button. Turn it off for evenly lit compare shots; leave it on for night shots.
- Music starts with the first tap on a first visit. Mute it with the speaker button unless the clip needs sound.
- Burn in captions (many people watch muted) and end on a one-second card with `{SITE}`.
- `{X}`: read it from Compare stats on the day you record.

| # | Length | Hook (on screen, first 2 s) | What's on screen | Caption |
|---|---|---|---|---|
| 1 | 20 s | "Your map lied about Greenland." | `?compare=GRL,COD`. The pieces lift; drag Greenland onto DR Congo; open Compare stats; hold on the area row. | On most flat maps Greenland looks about as big as Africa. On a globe it's smaller than DR Congo alone. {SITE} |
| 2 | 20 s | "Watch Greenland stay the same size." | `?c=GRL`, choose Move, drag the piece slowly south to the equator. Text: "At 80° north, a Mercator map draws land 33× too big." | On a globe nothing stretches. Greenland is the same size in the Arctic and at the equator. {SITE} |
| 3 | 20 s | "The UK, dropped on the US." | `?compare=GBR,USA`. Drag the UK across a few states; open Compare stats. | The United States is {X}× the size of the United Kingdom. Where would you put it? {SITE}?compare=GBR,USA |
| 4 | 20 s | "Australia is not small." | `?compare=AUS,USA`. Slide Australia over the contiguous US. | Australia is almost as big as the contiguous United States. Flat maps hide it near the equator. {SITE} |
| 5 | 30 s | "Same five countries for everyone today." | `?play=daily`. Tap a guess, Confirm; a miss draws the line and the distance; the end screen; Copy result. Record your first real run, because each device plays a day's challenge once. | I got {score}. Your turn: {SITE}?play=daily |
| 6 | 15 s | "Flick the globe hard. Sound on." | Phone recording with sound. A gentle spin, then one hard flick: the screaming crowd. Grab the globe to stop it. | I may have added a rollercoaster. {SITE} |
| 7 | 25 s | "The Gulf Stream leaves the coast here." | Zoom in on Cape Hatteras. The current's name, arrow and typical speed fade in; streaks drift downstream. Pan along the North Atlantic Drift. | 33 major ocean currents, drawn along their mean paths with their names and typical speeds. {SITE} |
| 8 | 20 s | "Tiny cargo ships on the world's main sea lanes." | Zoom in on the Red Sea and the Suez Canal until the wakes show; pan to the Singapore Strait. | Container ships and tankers sail the main sea lanes, through Suez and Panama. Not live positions, just a nice touch. {SITE} |
| 9 | 15 s | "Right now, this is where it's night." | Day and night on. Slow spin along the line between day and night; zoom out until the world population strip shows. Put the date and time on screen. | The globe is lit from the Sun's real position, live. {SITE} |
| 10 | 20 s | "One tap. The whole planet by population density." | Data, then People per km². Spin to South Asia; tap a dense country and open its card. | {Country}: {X} people per km² (World Bank, 2025). See the rest: {SITE} |

---

## 7. Teachers

### 7.1 One-pager

Paste into a document and print on one page. Delete the analytics line if analytics is off.

> **EarthInteractive: a free 3D globe for geography lessons**
>
> **What it is.** A true-to-scale globe that runs in the browser: {SITE}. Students tap a country for facts, lift
> two countries off the globe to compare their real size, colour the world by data, and play short location games.
> Free, nothing to install, no accounts.
>
> **What you need.** A recent browser on a laptop, Chromebook, tablet or phone, or one computer and a projector.
> After the first visit the globe also works offline. On slow machines, add `?quality=low` to the address.
>
> **Activity 1: Map or globe? (10 minutes, ages 10+)**
> 1. Show a flat world map. Ask: is Greenland bigger or smaller than DR Congo? By how much? Students write a guess.
> 2. Open {SITE}?compare=GRL,COD. Both countries lift off the globe. Open Compare stats and read the areas.
> 3. Repeat with {SITE}?compare=GBR,USA and {SITE}?compare=AUS,USA.
> 4. Discuss: why do flat maps get this wrong? The page {SITE}why-maps-lie.html has a table of how much a flat
>    (Mercator) map stretches each latitude.
>
> **Activity 2: Country detective (10 minutes)**
> 1. Give each pair a country link, for example {SITE}?c=KAZ or {SITE}?c=PER.
> 2. They choose Info and note the capital, population, area rank and neighbours.
> 3. They tap one neighbour and compare: which has more people per km²?
> 4. Each pair reports one surprising fact in one sentence.
> Without 3D, the same facts are on each country's page: {SITE}countries/
>
> **Activity 3: Daily Challenge warm-up (10 minutes)**
> 1. Project {SITE}?play=daily. Five countries, the same for everyone that day.
> 2. The class agrees on where each country is. A student taps the globe, then Confirm.
> 3. After a miss, a line shows how far off the guess was, in kilometres. Ask what gave it away.
> 4. Each device plays a day's challenge once. For more rounds, use Find it: {SITE}?play=classic
>
> **Privacy, in plain words**
> - No accounts and no sign-up. Students never type a name or an email.
> - Settings and game results stay in the browser on that device.
> - Visits are counted with GoatCounter, which sets no cookies and collects no personal data.
> - There are no ads at the moment. If that changes, the privacy page will say so first: {SITE}privacy.html
>
> **Good to know**
> - Music starts with the first tap on a first visit. The speaker button mutes all sound.
> - The globe can show borders three ways: UN membership, who administers each area on the ground, and a neutral
>   view that marks disputed areas. The games always use the UN view.
> - Everything works with a mouse, a finger or the keyboard: {SITE}how-to-play.html
> - To put the globe in a slide deck or a class page, use {SITE}?embed=1 in an iframe; any link works, such as
>   {SITE}?embed=1&compare=GRL,COD. It shows just the globe, and music never starts by itself there.

### 7.2 Email to a geography teacher or department

```
Subject: Free 3D globe for your map-projection lesson (no accounts)

Hi {Name},

I saw {your post / your department's page} on {topic} and thought this might help.

I made EarthInteractive, a free, true-to-scale 3D globe that runs in any recent
browser, Chromebooks included. Students lift two countries off the globe and put
them side by side at their real size. Greenland next to DR Congo makes the
"flat maps distort size" point in a few seconds:
{SITE}?compare=GRL,COD

I've attached a one-page sheet with three 10-minute activities. There are no
accounts and no sign-up, and students never type a name.

If you try it with a class, one sentence on what worked or didn't would help a
lot. I'm a solo developer.

Thanks,
John
{SITE}
```

---

## 8. Press and bloggers

### 8.1 Fact sheet

| | |
|---|---|
| **Name** | EarthInteractive |
| **What it is** | A free, true-to-scale 3D globe in the browser: country facts, true-size comparison, data lenses and geography games |
| **Address** | {SITE} |
| **Price** | Free. No sign-up. No ads at the time of writing. |
| **Works on** | Phones, tablets and computers, in a modern browser with WebGL. Works offline after the first visit; can be added to the home screen. Text pages for every country work without 3D. |
| **Made by** | John Redman, an independent developer. No investors. |
| **Launched** | {L day} |
| **Compare** | Any two countries lift off as pieces at their true size and can be dragged anywhere; side-by-side stats; a square share image |
| **Border views** | Three: UN membership, who administers each area on the ground, and a neutral view that marks disputed areas |
| **Data lenses** | Four: population, people per km², GDP per person, land area |
| **Games** | Daily Challenge (five countries, the same for everyone each day), Find it (ten rounds), Country of the day |
| **On the globe** | 33 ocean currents with names and typical speeds, about 80 cargo ships on the main sea lanes, real-time day and night, a live world-population estimate, light clouds on desktop |
| **Text pages** | 217 country pages, 150 size comparisons, 27 region pages, 3 rankings |
| **Data** | Natural Earth (borders and coastlines, public domain); mledoze/countries (country facts, ODbL); World Bank World Development Indicators (population 2025, GDP mostly 2024, CC BY 4.0); UN World Population Prospects 2024 (live population estimate); flag-icons (MIT) |
| **Built with** | Three.js and plain JavaScript modules. No framework, no build step, static hosting. |
| **Source** | Public on GitHub (github.com/john-redman/earth-interactive); all rights reserved |
| **Contact** | Contact address goes here once the domain is live. |

### 8.2 Three screenshots

Shoot at 1280×800 (desktop) or 390×844 (phone), or larger at the same ratio. Replace the address with the domain
once it's live. The images in `marketing/screenshots/` date from 5 October, before the calm ocean, ships, clouds
and redrawn currents, so re-shoot them before sending.

1. **True size: Greenland and DR Congo** (desktop)
   `https://john-redman.github.io/earth-interactive/?compare=GRL,COD`
   Open Compare stats. *Alt:* Greenland and DR Congo lifted off a 3D globe side by side, with a table of their
   areas and populations.
2. **Country card: France** (desktop)
   `https://john-redman.github.io/earth-interactive/?c=FRA&view=un`
   Choose Info on the pin's tag to open the card. *Alt:* a 3D globe turned to France, with a card showing its
   capital, population, area, neighbours and flag.
3. **Daily Challenge** (phone)
   `https://john-redman.github.io/earth-interactive/?play=daily`
   Take it after a miss, when the line and the distance show. *Alt:* a phone showing the Daily Challenge, with a
   line from the player's guess to the right country and the distance in kilometres.

Other deep links: `?compare=FRA,BRA`, `?view=un`, `?view=defacto`, `?view=neutral`, `?play=classic`, and a data
lens with `?lens=pop`, `density`, `gdppc` or `area`. Add `?embed=1` to any of them to embed the globe in an article
(iframe snippet on `how-to-play.html`).

Usage: the contact page already says writers may link to any page and use screenshots.

### 8.3 Short pitch

```
Subject: A free globe that shows how big countries really are

Hi {Name},

Most world maps make Greenland look about as big as Africa, which is about
fourteen times larger. EarthInteractive is a free 3D globe where you can lift
two countries off the planet and lay them side by side at their true size.
It also has a daily geography challenge and a page for every country.

Why it might suit {publication}: {one line for their beat: classrooms / maps /
data / web graphics}.

Try: {SITE}?compare=GRL,COD
Fact sheet and screenshots: {link to the press page or attachment}

Happy to answer questions or set up a comparison for your piece.
John Redman
Contact address goes here once the domain is live.
```

---

## 9. FAQ

**Is it free?**
Yes. There's no sign-up and nothing to buy. There are no ads at the moment; if ads come, the privacy page will say
so before they go live. A tip link (Ko-fi) may appear on the pages.

**Is it accurate?**
Sizes on the globe are true: it is a sphere, so nothing is stretched, and compared pieces keep their real size
wherever you drag them. Borders and coastlines come from Natural Earth at 1:50m, so small islands are drawn
roughly; country pages use the official area for small places. Population is from the World Bank for 2025 and GDP
mostly for 2024; each card shows the year, and a few places the World Bank doesn't cover keep an older estimate.
The live world population is an estimate from the UN's 2024 projections. Ocean currents follow their charted mean
paths with typical speeds; the ships and clouds are decoration, not live data. Found a mistake? Report it on the
contact page.

**Why three border views?**
Because people disagree about some borders. The globe shows the world three ways: UN membership, who administers
each area on the ground, and a neutral view that marks disputed areas. The rules behind each view are written
down and public. Showing a border is not an endorsement of any claim.

**Where does the data come from?**
Natural Earth (borders and coastlines, public domain), mledoze/countries (capitals, languages, currencies, official
areas; ODbL), the World Bank's World Development Indicators (population and GDP; CC BY 4.0), the UN World
Population Prospects 2024 (the live estimate) and flag-icons (flags; MIT). The About page lists them all.

**What about privacy?**
No accounts and no sign-up. Settings and game results stay in your browser. Visits are counted with GoatCounter,
which sets no cookies and collects no personal data. The optional leaderboard, when it's switched on, stores only a
display name you choose and your score. Details are on the privacy page.

**Does it work on my phone?**
Yes. Phones get a lighter drawing mode, and the globe lowers its resolution if the phone struggles. On a slow
computer, add `?quality=low` to the address.

**Does it work offline?**
After the first visit, yes. You can also add it to your home screen from the browser menu.

**Is it open source?**
The source is public on GitHub, but it is not open source: all rights reserved.

**Can I use screenshots or link to it?**
Yes. Link to the globe, any country page or any comparison, and use screenshots.

---

## 10. Product suggestions from a marketing view

Ranked by likely effect on first impressions, sharing and return visits for the effort. Each keeps the UI as
clean as it is now. **Built on 9 October 2026:** 1, 2, 3, 4, 5, 6 and 10 (marked ✓); 8 (embed mode) too; 7 and 9 are still open.

1. ✓ **Hide the empty "Advertisement" boxes until an ad network is live** (`ADS.enabled` in `js/ads.js`): they're the first thing HN and Reddit will mention.
2. ✓ **Open the share sheet for the Daily result on phones** (`navigator.share`, clipboard as the fallback), in the same Copy result button.
3. ✓ **Show a local daily streak** on the end screen and in the share text ("Day 4 in a row"), stored on the device like the results.
4. ✓ **"Challenge a friend" for Find it**: a link with the round's seed and your score, so a friend plays the same ten countries.
5. ✓ **Add a `?lens=` deep link** (for example `?lens=density`) so data-lens posts open on the view they show.
6. ✓ **"Next challenge in 6 h" on the Daily end screen**, so finishers know when to come back.
7. **Per-pair link preview images for the 150 comparison pages**, reusing the compare share image; it needs a rasteriser at deploy (docs/seo.md explains the trade-off).
8. ✓ **An embed mode** (`?embed=1`: no ads, no dock, an "Open the full globe" link) for teachers and bloggers.
9. **Publish the border-view rules as a text page** linked from About and How to play, so border comments can be answered with one link.
10. ✓ **Show the data year in the lens legend** (the cards already show it), which heads off "this data is old" replies.
