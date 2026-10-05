# Captions, alt text and posting schedule

Ready to paste. Every number here was read from the app (the compare bar, cards and lens legends) or from
`data/world.js` on 5 Oct 2026: World Bank population **2025**, GDP **2024** for most countries, and
Natural Earth areas. **If the data changes, re-check the numbers in the app before posting.**

Conventions:
- `SITE` = `https://john-redman.github.io/earth-interactive/`. Replace it once the custom domain is live.
- Post links are **deep links** (they open the exact view), with **no UTMs**: UTMs belong in bios only
  (plan §8.2), and never on Reddit or HN.
- Hashtags: 3–5 per post, CamelCase on Mastodon (it helps screen readers).
- **Always paste the alt text.** Mastodon and Bluesky users won't boost posts without it.
- Character limits: X 280 (a URL counts as 23), Bluesky 300, Threads 500, Mastodon 500 (most instances),
  Instagram caption 2,200 (about 125 visible before "more").

---

## A. Posting schedule

Times are US Eastern (ET), following the plan. Launch week is Mon 19 to Sun 25 Oct 2026 (§3.2), then
the weekly rhythm (§4.1): Mon daily share, Tue True Size Tuesday, Wed "Did you know?", Thu lens, Fri poll.

### Pre-launch warm-up (accounts made by Sun 11 Oct; the plan says 2+ weeks before launch)

| Date | Platform | Asset | Notes |
|---|---|---|---|
| Daily from 6 Oct | Reddit (personal) | none | 15 min of helpful comments in the target subs. No links. |
| Wed 14 Oct, 12:00 | Instagram, Bluesky, Mastodon | `p12-card-kazakhstan` | A quiet first post so the profiles aren't empty. |
| Fri 16 Oct, 12:00 | X, Bluesky, IG story | `p15a-poll-iran-or-mongolia` + `s05` | Poll, warm-up. |
| Sat 17 Oct | X, Bluesky, IG story | `p15b-poll-answer` + `s06` | Reveal. |

### Launch week

| Day | Time (ET) | Platform | Asset | Caption |
|---|---|---|---|---|
| **Mon 19** | 12:00–14:00 | X (thread), Bluesky, Mastodon, Threads | `v01` + `p01` + `p10` + `p14` | §B "Launch thread" |
| Mon 19 | 12:00 | LinkedIn (personal) | `p01` square | §B "LinkedIn launch story" |
| Mon 19 | 12:00 | Instagram carousel + story | `p01`, `p03`, `p05` (portrait) + `s07` with link sticker | p01 caption |
| Mon 19 | evening | Facebook Page | `p01` | p01 caption |
| **Tue 20** | 09:00–10:00 | **Show HN** | none (link only) | §B "Show HN" |
| Tue 20 | 12:00 | X, Bluesky | `p04` | p04 |
| **Wed 21** | 07:00–10:00 | **r/InternetIsBeautiful** | link post | §C Reddit |
| Wed 21 | 14:00–18:00 | TikTok, Reels, Shorts | `v01` | v01 |
| Wed 21 | 14:00 | IG story | `s01` | — |
| **Thu 22** | 08:00–10:00 | **r/geography *or* r/MapPorn** (one only) | `p01` square image | §C Reddit |
| Thu 22 | afternoon | r/threejs | `v01` (as video) | §C Reddit |
| Thu 22 | 14:00 | Bluesky, Mastodon | `p10` | p10 |
| **Fri 23** | 07:00–09:00 | **r/SideProject** | `p01` or link | §C Reddit |
| Fri 23 | 12:00 | X poll, IG story poll | text poll "Brazil or Australia?" + `s02` | p07 (reveal Sat) |
| **Sat 24** | morning | **r/webdev Showoff Saturday** | `screenshots/` phone shots or `v01` | §C Reddit |
| Sat 24 | 12:00 | X, Bluesky | `p07` (poll reveal) | p07 |
| Sat 24 | — | Bluesky / Mastodon thread | none | "5 things I learned building a WebGL globe" (write it yourself, plan §3.2) |
| **Sun 25** | — | rest | — | Review referrers. |

### Weeks 2–5 (the weekly rhythm)

| Week | Mon (08:00) daily | Tue (15:00) True Size Tuesday | Wed (12:00) Did you know | Thu (14:00) lens | Fri (12:00) poll | Pinterest (any day) |
|---|---|---|---|---|---|---|
| 26 Oct–1 Nov | `p14` (post **your own** grid) | `v02` TikTok/Reels/Shorts + `p04` X/Bsky | `p12` IG carousel, LinkedIn, Bluesky | **r/dataisbeautiful [OC]**: `p10` static image (§C) + `p10` Bsky/Masto | "Japan or Germany?" + `s03` IG story | pin `p01`, `p03`, `p10` |
| 2–8 Nov | `p14` | `p02` + `s01` repost | `p13` | `v03` everywhere | "UK or Madagascar?" (reveal `p05` Sat) | pin `p02`, `p04`, `p12` |
| 9–15 Nov | `p14` | `p06` | `p12`/`p13` on Facebook (teacher angle) | `p09` | "Iran or Mongolia?" on X if not done (`p15a`/`p15b`) | pin `p06`, `p09`, `p13` |
| 16–22 Nov (Geography Awareness Week) | `p14` | **Tue 17: Product Hunt** (gallery `banners/producthunt-gallery-*`) + `p08` | teacher post: `p01` on LinkedIn/Facebook | **Wed 18 GIS Day:** `p11` + `p10` | poll | pin `p08`, `p11`, `p14` |
| 23–29 Nov | `p14` | `v01` re-cut or your own recording | `p03` | `p11` on Mastodon | poll | pin `p05`, `p07` |
| Later (only after the "About the borders" page is live) | | | | | | `p16` border-views carousel (§D) |

---

## B. Launch-day texts

### Launch thread (X; split for Bluesky / Mastodon / Threads)

1/ (attach `video/v01-greenland-vs-drcongo-1080x1920.mp4`)
> Your map has been lying to you.
> I built a free 3D globe where you can pull countries off the planet and compare their real size. 🧵

*(The emoji is optional. It's fine in social posts; the "no emoji" rule is for app UI.)*

2/ (attach `posts/square/p01-greenland-vs-drcongo.jpg`)
> Greenland looks enormous on flat maps. On a globe, Democratic Republic of the Congo is 8% larger.
> Pick any two countries: they lift out as puzzle pieces and sit side by side at the same latitude.

3/ (attach `posts/square/p10-lens-density.jpg`)
> One tap recolours the planet by population, people per km², GDP per person or area.

4/ (attach `posts/square/p14-daily-challenge.jpg`)
> And a Daily Challenge: the same 5 countries for everyone, scored by distance. Share your squares.

5/
> Free, runs in your browser, no sign-up. Feedback, especially from phones, is very welcome:
> SITE

### LinkedIn launch story (Mon 19; attach `p01` square)

> I spent the last few months building something small and nerdy: EarthInteractive, a free,
> true-to-scale 3D globe that runs in the browser.
>
> It started with one question: how big is Greenland really? Flat Mercator maps make it look as big as
> Africa. On a globe, the Democratic Republic of the Congo alone is 8% larger.
>
> What it does:
> • Pull any two countries off the globe and compare them side by side
> • Recolour the world by population, density or GDP per person (World Bank data)
> • Play a daily geography challenge (same 5 countries for everyone)
>
> Built with Three.js and plain JavaScript, no framework and no build step. The hardest parts were
> making country shapes sit perfectly on a sphere and keeping it smooth on phones.
>
> If you teach geography, I'd love to hear whether it would work in your classroom.
> SITE
>
> #Geography #EdTech #WebDevelopment #ThreeJS

### Show HN (Tue 20, 09:00–10:00 ET)

- **Title:** `Show HN: A true-to-scale 3D globe where countries pop out to compare real sizes`
- **URL:** `SITE`
- **First comment:** use plan §3.3 verbatim. Before posting, update its "Data:" line to:
  *Data: Natural Earth (borders, areas), World Bank WDI (2025 population, 2024 GDP), mledoze/countries (ODbL).*
- No images on HN. Don't ask for upvotes.

---

## C. Reddit titles (read each sidebar first; rules change)

| Sub | Day | Type | Title | First comment |
|---|---|---|---|---|
| r/InternetIsBeautiful | Wed 21 | Link | `A free 3D globe that shows the true size of countries. Pull two off the planet and compare them side by side` | Frame it as the **explorer/compare tool, not a game** (the sub bans games). Say who made it. |
| r/geography | Thu 22 | Image (`p01` square) | `Greenland vs DR Congo at true scale on a globe. DR Congo is 8% larger. Which pairing surprised you most?` | "I made the tool (free, no sign-up): SITE?compare=GRL,COD. Areas: Natural Earth." |
| *or* r/MapPorn | Thu 22 | Image (`p01` square, or `cmp` raw without text if text overlays aren't allowed) | `Greenland and the DR Congo side by side at true scale [OC]` | Source + tool, as above. |
| r/threejs | Thu 22 | Video (`v01`) | `I made a WebGL globe where countries lift out as curved puzzle pieces (stencil + spherical triangulation write-up inside)` | The technical notes from the plan §3.3 list. |
| r/SideProject | Fri 23 | Text + image | `I built a free true-to-scale 3D globe: compare country sizes, data lenses and a daily geography game` | Story: why, how long, what's next, what feedback you want. |
| r/webdev | **Sat 24 only** (Showoff Saturday) | Text + images (`screenshots/`) | `[Showoff Saturday] A no-build Three.js globe: plain ES modules, ~1 MB of data, seamless country fills with a stencil trick` | Stack, challenges, live demo link. |
| r/dataisbeautiful | Thu 29 Oct | Image (`p10` square) | `[OC] People per km² by country, on a 3D globe` | **Required:** "Source: World Bank WDI (2025 population), Natural Earth areas. Tool: EarthInteractive (Three.js), made by me." |
| r/WebGames | week 2 | Link | `Daily geography challenge: find the same 5 countries as everyone else, scored by distance` | Lead with the game (this is where the game angle belongs). |

---

## D. Captions per asset

Platform keys:
- **X/Threads:** ≤280 characters.
- **Bsky:** Bluesky, ≤300.
- **Masto:** Mastodon.
- **IG/FB:** Instagram and Facebook (IG: put "link in bio" instead of a URL).
- **Pin:** Pinterest title + description. The pin links to the deep link.
- **Alt:** alt text for every platform.

### p01 Greenland vs DR Congo (`posts/*/p01-greenland-vs-drcongo.jpg`)
- **Alt:** Two country shapes lifted off a 3D globe and placed side by side: Greenland in yellow
  (2.15 million km²) and the Democratic Republic of the Congo in pink (2.33 million km²). Caption: DR Congo
  is 8% larger than Greenland.
- **X/Threads:** Your map has been lying to you. Greenland vs DR Congo at true scale: DR Congo is 8% larger.
  Try any pair: SITE?compare=GRL,COD #Geography #Maps #Mercator
- **Bsky:** Greenland looks huge on flat maps. Pull it off a globe next to DR Congo and the truth shows:
  DR Congo is 8% larger. Compare any two countries, free: SITE?compare=GRL,COD
- **Masto:** Your map has been lying to you: on a globe, DR Congo is 8% larger than Greenland. Pull any two
  countries off the planet and compare them: SITE?compare=GRL,COD #Geography #Maps #Mercator #TrueSize
- **IG/FB:** Your map has been lying to you. 🌍 On flat Mercator maps Greenland looks enormous. Put it next
  to the Democratic Republic of the Congo on a real globe and DR Congo comes out 8% larger. Try any pair
  yourself: free, no sign-up, link in bio. #geography #maps #mercator #truesize #mapfacts
- **Pin:** *Greenland vs DR Congo: true size on a globe.* "Flat maps make Greenland look huge. On a
  true-to-scale globe, DR Congo is 8% larger. Compare any two countries free."

### p02 Greenland vs Australia
- **Alt:** Greenland (yellow, 2.15 million km²) and Australia (green, 7.71 million km²) side by side on a
  3D globe. Caption: Australia is 3.6 times the size of Greenland.
- **X/Threads:** Greenland looks huge on flat maps. Next to Australia on a globe? Australia is 3.6× the
  size. SITE?compare=GRL,AUS #Geography #Maps
- **Bsky:** Mercator makes Greenland look like a continent. Side by side with Australia on a real globe,
  Australia is 3.6× bigger. SITE?compare=GRL,AUS
- **Masto:** Greenland vs Australia at true scale: Australia is 3.6× the size of Greenland.
  SITE?compare=GRL,AUS #Geography #Maps #Mercator #Australia
- **IG/FB:** Greenland vs Australia, at true scale. Australia is 3.6× the size of Greenland. Flat maps
  stretch everything near the poles. Which pair should we try next? #geography #australia #greenland #maps
- **Pin:** *Greenland vs Australia: real size.* "On a globe, Australia is 3.6× the size of Greenland."

### p03 Russia vs Canada
- **Alt:** Russia (white, 16.9 million km²) and Canada (green, 9.87 million km²) side by side on a 3D globe.
  Caption: Russia is 1.7 times the size of Canada.
- **X/Threads:** The two biggest countries on Earth, side by side at the same latitude: Russia is 1.7× the
  size of Canada. SITE?compare=RUS,CAN #Geography #Maps
- **Bsky:** Russia vs Canada, the two biggest countries, side by side on a real globe. Russia is 1.7× the
  size of Canada. SITE?compare=RUS,CAN
- **Masto:** Russia vs Canada at true scale: 1.7×. SITE?compare=RUS,CAN #Geography #Maps #TrueSize
- **IG/FB:** The two biggest countries in the world, side by side: Russia is 1.7× the size of Canada.
  Compare any two countries, link in bio. #geography #russia #canada #maps #truesize
- **Pin:** *Russia vs Canada size comparison.* "Russia is 1.7× the size of Canada, shown side by side on a
  true-to-scale globe."

### p04 USA vs Australia
- **Alt:** The contiguous United States (blue, 7.95 million km², main territory) and Australia (green,
  7.71 million km²) side by side on a 3D globe. Caption: United States is 3% larger than Australia.
- **X/Threads:** Closer than you think: the contiguous US is only 3% larger than Australia.
  SITE?compare=USA,AUS #Geography #Australia #USA
- **Bsky:** USA vs Australia at true scale. The lower 48 are only 3% larger than Australia. (Alaska and
  Hawaii stay home in this compare.) SITE?compare=USA,AUS
- **Masto:** The contiguous USA vs Australia: only 3% apart. SITE?compare=USA,AUS #Geography #Maps
  #Australia #USA
- **IG/FB:** How big is Australia, really? Almost exactly the size of the contiguous United States: the US
  (without Alaska and Hawaii) is just 3% larger. #australia #usa #geography #maps #travel
- **Pin:** *USA vs Australia: true size.* "Australia is almost the size of the contiguous United States (the
  US is only 3% larger)."

### p05 UK vs Madagascar
- **Alt:** The United Kingdom (orange) and Madagascar (green) side by side on a 3D globe. Caption:
  Madagascar is 2.5 times the size of the United Kingdom.
- **X/Threads:** Every Brit has wondered this. Madagascar is 2.5× the size of the UK.
  SITE?compare=GBR,MDG #UK #Geography #Maps
- **Bsky:** Madagascar vs the United Kingdom, true scale: Madagascar is 2.5× the size of the UK.
  SITE?compare=GBR,MDG
- **Masto:** Madagascar is 2.5× the size of the UK. SITE?compare=GBR,MDG #Geography #Maps #UK #Madagascar
- **IG/FB:** Islands, compared. Madagascar is 2.5× the size of the United Kingdom. Surprised? Try your own
  pair, link in bio. #uk #madagascar #geography #maps #truesize
- **Pin:** *UK vs Madagascar size.* "Madagascar is 2.5× the size of the United Kingdom."

### p06 India vs Russia
- **Alt:** India (green) and Russia (white) side by side on a 3D globe. Caption: Russia is 5.4 times the
  size of India.
- **X/Threads:** Flat maps flatter the north. Side by side on a globe: Russia is 5.4× the size of India.
  SITE?compare=IND,RUS #Mercator #Maps
- **Bsky / Masto:** India vs Russia at true scale: Russia is 5.4× the size of India.
  SITE?compare=IND,RUS #Geography #Maps #Mercator
- **IG/FB:** India vs Russia, true scale: Russia is 5.4× the size of India. Still huge, but less huge than
  your classroom map made it look. #india #russia #geography #maps #mercator
- **Pin:** *India vs Russia: real size.* "Russia is 5.4× the size of India on a true-to-scale globe."

### p07 Brazil vs Australia (also the Fri 23 poll reveal)
- **Poll (Fri):** Which is bigger: Brazil or Australia? (Options: Brazil / Australia / About the same)
- **Alt:** Brazil (purple) and Australia (green) side by side on a 3D globe. Caption: Brazil is 10% larger
  than Australia.
- **X/Threads:** Yesterday's poll: Brazil is 10% larger than Australia. Two giants of the south, side by
  side. SITE?compare=BRA,AUS #Geography #Brazil #Australia
- **Bsky / Masto:** Brazil vs Australia at true scale: Brazil is 10% larger. SITE?compare=BRA,AUS
  #Geography #Maps
- **IG/FB:** Brazil vs Australia: Brazil is 10% larger. Did you guess right? #brazil #australia #geography
  #maps
- **Pin:** *Brazil vs Australia size.* "Brazil is 10% larger than Australia."

### p08 Japan vs Germany
- **Alt:** Japan (purple) and Germany (pink) side by side on a 3D globe. Caption: Japan is 3% larger than
  Germany.
- **X/Threads:** Japan is not small. It's 3% larger than Germany. SITE?compare=JPN,DEU #Japan #Germany
  #Geography
- **Bsky / Masto:** Japan vs Germany at true scale: Japan is 3% larger. SITE?compare=JPN,DEU #Geography
  #Maps #Japan
- **IG/FB:** Japan is not small. Laid next to Germany, Japan comes out 3% larger. #japan #germany #geography
  #travel #maps
- **Pin:** *Japan vs Germany size.* "Japan is 3% larger than Germany."

### p09 Population lens
- **Alt:** A 3D globe centred on Asia, countries coloured from dark brown (fewer people) to pale gold (more
  people). Legend: Population, from 30 to 1.5 billion. Text: India 1.46 billion, China 1.41 billion (2025).
- **X/Threads:** The world by population, on a real globe. India 1.46 B · China 1.41 B (2025, World Bank).
  One tap in the app: SITE #DataViz #Maps
- **Bsky / Masto:** Population by country on a 3D globe (World Bank 2025). India 1.46 B, China 1.41 B.
  SITE #DataViz #DataIsBeautiful #Maps #Geography
- **IG/FB:** One tap recolours the planet. Here's population: India (1.46 billion) and China (1.41 billion)
  lead in the 2025 World Bank figures. #dataviz #maps #population #geography
- **Pin:** *World population map on a 3D globe.* "Population by country (World Bank 2025)."

### p10 Density lens
- **Alt:** A 3D globe centred on South Asia, countries coloured by people per km², from dark (empty) to pale
  gold (crowded); Bangladesh and India are among the brightest. Legend from 0 to 12,574 people per km².
  Text: Bangladesh, 176 million people (2025) in about 148,000 km².
- **X/Threads:** Where the world is crowded. Bangladesh: 176 million people in about 148,000 km² (2025).
  SITE #DataViz #Maps
- **Bsky / Masto:** People per km², on a real globe. Bangladesh fits 176 million people (2025) into about
  148,000 km². SITE #DataViz #DataIsBeautiful #Geography
- **IG/FB:** Where the world is crowded: people per km², on a 3D globe. Bangladesh packs 176 million people
  into about 148,000 km². #dataviz #population #maps #geography
- **Reddit r/dataisbeautiful:** see §C (title with [OC]; the first comment must state sources and the tool).
- **Pin:** *Population density world map (3D).* "People per km² by country, World Bank 2025."

### p11 GDP per person lens
- **Alt:** A 3D globe showing Europe, Africa and the Middle East coloured by GDP per person, darker for
  lower, pale gold for higher. Legend from $214 to $143,041 per person. Mostly 2024 data.
- **X/Threads:** Wealth, on a real globe. GDP per person runs from $214 (Burundi) to $143,041 (Bermuda),
  mostly 2024 World Bank data. SITE #DataViz #Economics
- **Bsky / Masto:** GDP per person on a 3D globe, mostly 2024 World Bank data. From $214 (Burundi) to
  $143,041 (Bermuda). SITE #DataViz #Economics #Maps
- **IG/FB:** GDP per person, one tap. The range in the 2024 data is huge: $214 (Burundi) to $143,041
  (Bermuda). #economics #dataviz #maps #geography
- **Pin:** *GDP per person world map (3D globe).* "Mostly 2024 World Bank data."

### p12 Did you know? Kazakhstan
- **Alt:** A 3D globe zoomed on Central Asia with a purple pin in Kazakhstan and its country card: capital
  Astana, population 20.8 million (2025), area 2.72 million km² (number 9 of 212), landlocked; neighbours
  China, Kyrgyzstan, Russia, Turkmenistan, Uzbekistan.
- **X/Threads:** Did you know? Kazakhstan is the largest landlocked country in the world: 2.72 million km²,
  #9 by area. SITE?c=KAZ #DidYouKnow #Geography
- **Bsky / Masto:** Did you know? Kazakhstan is the world's largest landlocked country (2.72 million km²).
  Tap any country for its facts: SITE?c=KAZ #Geography #DidYouKnow
- **IG/FB / LinkedIn:** Did you know? Kazakhstan is the largest landlocked country on Earth, 9th largest
  overall, with five land neighbours. Tap any country on the globe for its capital, population, rank and
  neighbours. #didyouknow #geography #kazakhstan #trivia
- **Pin:** *Largest landlocked country: Kazakhstan.* "Geography fact card from a free 3D globe."

### p13 Did you know? Mongolia
- **Alt:** A 3D globe with a pin in Mongolia and its country card: capital Ulan Bator (as spelled in the app), population
  3.57 million (2025), area 1.56 million km², about 2 people per km², landlocked; neighbours China and Russia.
- **X/Threads:** Did you know? Mongolia is the most sparsely populated UN member: about 2 people per km²
  (2025 population). SITE?c=MNG #DidYouKnow #Geography
- **Bsky / Masto:** Mongolia: about 2 people per km², the lowest density of any UN member (World Bank 2025
  population). SITE?c=MNG #Geography #DidYouKnow
- **IG/FB:** Did you know? Mongolia has about 2 people per km², the most sparsely populated UN member
  state. #mongolia #geography #didyouknow #trivia
- **Pin:** *Most sparsely populated country: Mongolia.* "About 2 people per km²."

### p14 Daily Challenge
- **Alt:** The Daily Challenge result card over a 3D globe: 4,589 of 5,000 points, "Cartographer level. 3 of
  5 found exactly", and five coloured squares (green, green, yellow, green, yellow).
- **Note:** this is an example card made with a scripted run. **For the Monday posts, play yourself and
  post your own grid** (copy it with "Copy result").
- **X/Threads:** Same 5 countries for everyone today. How close can you get? Post your squares 👇
  SITE?play=daily #DailyChallenge #GeographyGame
- **Bsky / Masto:** Today's Daily Challenge: 5 countries, the same for everyone, scored by distance. Reply
  with your squares. SITE?play=daily #Geography #DailyPuzzle
- **IG/FB:** Same 5 countries for everyone, every day. Find them on the globe, then share your squares.
  Link in bio. #dailychallenge #geographygame #quiz #geography
- **Pin:** *Daily geography challenge (free).* "Five countries a day, same for everyone."

### p15a / p15b Poll: Iran or Mongolia
- **p15a alt:** A 3D globe showing Asia with the question "Which is bigger: Iran or Mongolia?"
- **p15b alt:** Iran (pink) and Mongolia (purple) side by side on a 3D globe. Caption: Iran is 4% larger
  than Mongolia.
- **X poll:** Bigger: Iran or Mongolia? (Iran / Mongolia / Same) → reveal: Iran is 4% larger than Mongolia.
  SITE?compare=IRN,MNG
- **IG:** use the carousel (slide 1 question, slide 2 answer), or stories `s05` (poll sticker) and `s06`
  (answer).
- **Bsky / Masto:** Quick one: which is bigger, Iran or Mongolia? Answer in the replies; reveal tomorrow.
  #Geography #Quiz

### p16 Border views carousel (HOLD; see plan §10.1)
Post only after the "About the borders" page is live and linked. Keep comments moderated. Use the
neutral texts below and don't name any dispute.
- **Alt (each slide):** The same region of the globe in the "{view}" border view, with the view switch at
  the top. Text: "{view description}".
- **Caption (all platforms):** One globe, three border views. Maps depend on who draws them, so
  EarthInteractive lets you switch between UN Standard, De Facto Control and Recognition Neutral. The rules
  for each view are written down here: {About-the-borders link}. #Geography #Maps
- **Don't** post to Reddit political or map subs with this one.

### Stories (`stories/`, 1080×1920)
Add the platform's own **link sticker** (Instagram, Facebook) to `SITE` or the deep link. The text sits
inside the safe zone (250 px top, 340 px bottom are clear).

| File | Sticker / link | Alt |
|---|---|---|
| `s01-greenland-vs-drcongo` | `?compare=GRL,COD` | Greenland and DR Congo pieces side by side; DR Congo is 8% larger. |
| `s02-usa-vs-australia` | `?compare=USA,AUS` | Contiguous US and Australia side by side; US is 3% larger. |
| `s03-russia-vs-canada` | `?compare=RUS,CAN` | Russia and Canada side by side; Russia is 1.7× Canada. |
| `s04-density-lens` | `SITE` | Globe coloured by people per km². |
| `s05-poll-iran-or-mongolia` | add a **poll sticker** in the dashed box: Iran / Mongolia | Question: which is bigger? |
| `s06-poll-answer` | `?compare=IRN,MNG` | Iran is 4% larger than Mongolia. |
| `s07-spin-the-world` | `SITE` | A 3D globe; "Spin a true-to-scale globe". |
| `s08-daily-challenge` | `?play=daily` | Daily Challenge result card example. |

### Videos (`video/`, 1080×1920, silent)
TikTok and Reels allow adding trending audio inside the app. Keep it calm, or use none.
TikTok: put the link in the bio. YouTube Shorts: URLs in descriptions aren't clickable, so point people to
the channel links.

- **v01 Greenland vs DR Congo** (11 s)
  - **TikTok / Reels:** Your map has been lying to you 🌍 Greenland vs DR Congo at true scale: DR Congo is
    8% larger. Try any pair: link in bio. #geography #maps #mercator #truesize #mapfacts
  - **Shorts title:** `Greenland vs DR Congo: the true size #shorts #geography`
  - **Shorts description:** Pulled both off a 3D globe. DR Congo is 8% larger than Greenland. Free tool
    (no sign-up): link on the channel page.
  - **Cover:** `video/v01-greenland-vs-drcongo-cover.jpg`
  - **Alt / description for X and Bluesky:** Animation: a slowly turning globe; Greenland and DR Congo lift
    off as pieces and settle side by side; text says DR Congo is 8% larger.
- **v02 USA vs Australia** (11 s)
  - **TikTok / Reels:** How big is Australia, really? Next to the contiguous US it's only 3% smaller.
    #australia #usa #geography #maps #truesize
  - **Shorts title:** `USA vs Australia: almost the same size? #shorts`
- **v03 Data lenses** (12 s)
  - **TikTok / Reels:** One tap recolours the planet: population, people per km², GDP per person (World Bank
    2025/2024). #dataviz #maps #geography #population
  - **Shorts title:** `The world by population, density and wealth #shorts #dataviz`

### Product Hunt gallery (`banners/producthunt-gallery-01…06`)
Order: 01 hero, 02 compare, 03 data lens, 04 daily, 05 phone, 06 border views. 06 is optional; drop it if
you'd rather not raise borders on PH.
- **Alt texts:** (01) a globe and the headline "See how big countries really are"; (02) Greenland and DR Congo
  pieces side by side; (03) a globe coloured by people per km² with its legend; (04) the Daily Challenge
  result card; (05) three phone screenshots: the globe, a comparison, a country card; (06) the same region
  in three border views.
