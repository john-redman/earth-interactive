# EarthInteractive marketing kit: accounts setup guide

Everything you need to create and fill every account in the marketing plan
(`docs/business/marketing-plan.md`) in one sitting. Claude can't create accounts for you, because each one
needs your phone, email and a captcha. This kit gives you the handle ideas, bios, images and first posts,
so each account takes minutes.

- **Images and videos** are real screenshots of the app (headless Chromium + Playwright), composed into
  each platform's size. Numbers on them were read from the app or from `data/world.js`: World Bank 2025
  population, mostly 2024 GDP (the data refresh of 5 Oct 2026), and Natural Earth areas.
- **Captions** for every asset, plus the posting schedule, are in [`captions.md`](captions.md).
- **Review everything quickly** with [`contact-sheet.png`](contact-sheet.png).

> **Before you start:** handle availability was **not** checked. Check each handle on the platform itself
> or with a handle checker such as namecheckr or Namechk. Platform limits below were checked against public
> guides in October 2026 (sources at the end). Platforms change these often, so trust the form's own
> counter over this document.

---

## 0. One-time setup (25 min)

### 0.1 One identity, one inbox

1. **Make one dedicated mailbox for the project.** Don't use your personal address, so the accounts can
   be handed over or shared later.
   - Gmail (free): try `earthinteractive.app@gmail.com`, then `earthinteractive.hq@gmail.com`, then
     `playearthinteractive@gmail.com`.
   - Or Proton Mail (free; more private, but some platforms flag new Proton addresses for extra checks).
   - When the custom domain is live, add a forwarding address such as `hello@earthinteractive.app`
     (Cloudflare Email Routing is free) and switch the account emails to it.
2. **Use `+` tags to see who emails you:** `earthinteractive.app+tiktok@gmail.com`,
   `…+x@gmail.com`, and so on. Gmail and Proton both deliver these to the same inbox. A few sign-up forms
   reject `+`. If one does, use the plain address.
3. **Phone number:** use your own mobile for SMS checks, and turn on app-based 2FA as soon as you can
   (see below), so the number isn't your only way back in.

### 0.2 Password manager and 2FA

1. Install a password manager: **Bitwarden** (free tier is enough), or 1Password / Apple Passwords.
   Make a folder called `EarthInteractive`.
2. For every account below, let the manager **generate a unique 20+ character password**.
3. **Turn on 2FA with an authenticator app**, not SMS where you have the choice. Use 2FAS, Aegis
   (Android), Google Authenticator, or the manager's own TOTP.
4. **Save the backup and recovery codes** in the manager, next to each login. This is the step people
   skip and regret.
5. Add a secure note to the vault listing every handle you claimed, so it's all in one place.

### 0.3 Link in bio (free)

- **Use the site itself as your link.** It's free, it's the product, and it loads straight into the globe.
  Add a UTM per platform so you can see which bio sends visitors (format from the plan, §8.2):

  | Platform | Bio link |
  |---|---|
  | Instagram | `https://john-redman.github.io/earth-interactive/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
  | TikTok | `…/?utm_source=tiktok&utm_medium=social&utm_campaign=bio` |
  | YouTube | `…/?utm_source=youtube&utm_medium=video&utm_campaign=bio` |
  | X | `…/?utm_source=x&utm_medium=social&utm_campaign=bio` |
  | Bluesky / Mastodon / Threads / Pinterest / Facebook | same pattern with `utm_source=bluesky` and so on |
  | Reddit, Hacker News, Product Hunt | **no UTMs** (the plan advises against them there) |

- **When you need several links** (site, daily challenge, a compare page, a teacher page), you have two
  free options:
  - A `/links` page on your own domain, once it's live (best long term).
  - A free bio-link page such as Linktree (free plan) or bio.link. Instagram already allows up to 5 links in
    the bio, so it rarely needs one.
- **When the custom domain goes live**, update every bio link in one pass (checklist at the end).

### 0.4 The shared profile text

Reuse these everywhere. They're cut to each platform's limit in the per-platform sections.

- **Name:** EarthInteractive
- **One-liner:** *See how big countries really are.*
- **Short bio:** *A free, true-to-scale 3D globe. Pull countries out to compare their real size, recolour
  the world by data, and play a daily geography challenge. No sign-up.*
- **Tone:** curious, fun and educational. **No political takes on borders.** The border-view explainer
  waits until after launch (plan §10.1); use the canned replies in the plan for border comments.

---

## 1. Platform checklists

Times assume the mailbox and password manager from step 0 are ready. `☐` = tick as you go.

### Asset map (what to upload where)

| Platform | Profile picture | Header / banner |
|---|---|---|
| X | `profile/pfp-icon-400.png` (or `pfp-globe-400.png`) | `banners/x-header-1500x500.jpg` |
| Bluesky | `profile/pfp-icon-1080.png` | `banners/bluesky-banner-3000x1000.jpg` |
| Mastodon | `profile/pfp-icon-400.png` | `banners/mastodon-header-1500x500.jpg` |
| Instagram / Threads | `profile/pfp-globe-1080.png` | — |
| TikTok | `profile/pfp-globe-1080.png` | — |
| YouTube | `profile/pfp-icon-1080.png` (≥800×800) | `banners/youtube-channel-art-2560x1440.jpg` |
| Facebook Page | `profile/pfp-icon-1080.png` | `banners/facebook-cover-1702x630.jpg` |
| LinkedIn (personal) | your own photo | `banners/linkedin-banner-1584x396.jpg` |
| Reddit | `profile/pfp-globe-400.png` | `banners/reddit-banner-1920x384.jpg` |
| Pinterest | `profile/pfp-globe-1080.png` | `banners/pinterest-cover-1600x900.jpg` |
| Product Hunt | your own photo (maker) · product thumbnail `profile/producthunt-thumbnail-240.png` | gallery `banners/producthunt-gallery-0*.jpg` |
| Discord server (optional) | `profile/discord-server-icon-512.png` | `banners/discord-server-banner-1920x1080.jpg` (needs Boost Level 2) |

**Which profile picture?** `pfp-icon-*` is the app icon (the same mark as the favicon and home-screen
icon), so it reads at 32 px. `pfp-globe-*` is a real render of the globe, and stands out more in feeds and
grids. Both are centred and safe to crop to a circle. Suggestion: the icon where the avatar is tiny (X,
Mastodon, YouTube, Facebook, Discord), the globe on visual platforms (Instagram, TikTok, Pinterest, Reddit).

---

### 1.1 Reddit (10 min, then 15 min a day of real participation)

**Important:** Reddit is about the *person*, not the brand. The plan's launch posts (r/InternetIsBeautiful,
r/geography, r/SideProject, r/webdev Showoff Saturday) work best from **your personal account**, once it's
**14+ days old with 25+ karma** (r/webdev's stated bar, plan §3.1).

- ☐ If your personal account is older than 2 weeks, use it. Otherwise make one **today**:
  - Username ideas (max 20 characters; **can't be changed later**): `JohnBuildsGlobes`,
    `EarthInteractiveJohn`, `john_maps_things`.
- ☐ Optional brand account `u/EarthInteractive` (16 characters), to reserve the name only. Don't post from it.
- ☐ Avatar: `profile/pfp-globe-400.png`. Banner: `banners/reddit-banner-1920x384.jpg`. The sides crop on
  mobile, so the text sits in the middle.
- ☐ About (about 200 characters): *Solo dev behind EarthInteractive, a free true-to-scale 3D globe. Into maps,
  Mercator rants and WebGL.* (101 characters)
- ☐ Social link: the site, with **no UTM**.
- ☐ Safety: Settings → Account → turn on **2FA**. Settings → Privacy: **"Show up in search results" on**.
  Turn **NSFW content off** (an education-adjacent brand).
- ☐ Join and **read the rules of**: r/geography, r/MapPorn, r/InternetIsBeautiful, r/dataisbeautiful,
  r/SideProject, r/webdev, r/threejs, r/WebGames. Comment helpfully every day; the 90/10 rule applies.
- **First 3 posts:** from the plan's dates, see `captions.md` → "Reddit". In order: r/InternetIsBeautiful
  (L+2), r/geography or r/MapPorn (L+3), r/SideProject (L+4). L is launch day; see `captions.md` → A.

### 1.2 X / Twitter (10 min)

- ☐ Handle (**max 15 characters**, so `earthinteractive` at 16 doesn't fit):
  1. `@EarthInteract` (14)
  2. `@earth_interact` (15)
  3. `@EarthInteractHQ` (15)
  4. `@TrueSizeGlobe` (13)
- ☐ Display name: `EarthInteractive` (≤50 characters).
- ☐ Bio (≤160 characters):
  *A true-to-scale 3D globe in your browser. Pull countries out to compare their real size, recolour the
  world by data, play a daily geography challenge. Free.* (156 characters)
- ☐ Location: `Planet Earth` (or your city). Website: the X UTM link.
- ☐ Avatar `profile/pfp-icon-400.png`. Header `banners/x-header-1500x500.jpg`: the avatar overlaps the
  lower-left corner, so the text sits higher up.
- ☐ Category, if you switch to a professional account: *Education* or *Science & Technology*.
- ☐ Safety: Settings → Security → **2FA (authentication app)**. Turn on Password reset protect. Under
  Privacy and safety, set **Photo tagging off** and **Direct messages from everyone** (press and creators
  can reach you). Set **Quality filter on**.
- ☐ Pin the launch thread once it's posted.
- **First 3 posts:** `captions.md` → X, posts X-1 to X-3.

### 1.3 Bluesky (8 min)

- ☐ Handle: `earthinteractive.bsky.social` (fallbacks `earthinteractiveapp.bsky.social`,
  `earth-interactive.bsky.social`).
  - **When the domain is live**, switch to `@earthinteractive.app` under Settings → Account → Handle →
    "I have my own domain" (one DNS TXT record). It's free, and it doubles as verification.
- ☐ Display name: `EarthInteractive` (≤64 characters).
- ☐ Bio (≤256 characters): *A free, true-to-scale 3D globe that runs in your browser. Pull countries off the
  planet to compare their real size, recolour the world by population, density or wealth, and play a daily
  geography challenge. Made by John, solo dev.* (230 characters) Put the link on its own line at the end
  if it fits; otherwise put it in the pinned post.
- ☐ Avatar `profile/pfp-icon-1080.png`; banner `banners/bluesky-banner-3000x1000.jpg` (files must be
  ≤1 MB; both are).
- ☐ Safety: Settings → Account → **Two-factor (email code)**. Moderation → turn on **"Require alt text
  before posting"** (it suits the plan).
- ☐ Find the **maps / geography / dataviz starter packs** (plan §3.5) and ask politely to be added.
- **First 3 posts:** `captions.md` → Bluesky.

### 1.4 Mastodon (10 min)

- ☐ Instance (read each one's rules on project or brand accounts first):
  1. **mapstodon.space**: maps and GIS community, the best audience fit.
  2. **mastodon.social**: general, the easiest sign-up.
  3. *Not* fosstodon.org: it's for free/open-source work, and EarthInteractive is "all rights reserved".
- ☐ Username: `earthinteractive` → `@earthinteractive@mapstodon.space`.
- ☐ Display name `EarthInteractive`. Bio (500 characters on most instances):
  *A free, true-to-scale 3D globe in your browser. Pull countries out like puzzle pieces to compare their real
  size, recolour the planet by population, density or GDP per person, and play a daily geography challenge.
  No sign-up, no cookies. Built by John with Three.js and plain ES modules. I always add alt text.
  #Geography #Maps #DataViz #ThreeJS #EdTech*
- ☐ Profile fields (up to 4): `Website` → site URL · `Daily` → `…/?play=daily` · `Made with` → `Three.js` ·
  `By` → your name.
- ☐ **Verify the website link**: add `<a rel="me" href="https://mapstodon.space/@earthinteractive">` to the
  site's `<head>`. *That's an app change, so it's left for you to do.*
- ☐ Avatar `profile/pfp-icon-400.png`, header `banners/mastodon-header-1500x500.jpg`.
- ☐ Turn on **2FA** (Preferences → Account → Two-factor auth). Turn on **"Always add media descriptions"**
  reminders if your client has them.
- **First 3 posts:** `captions.md` → Mastodon (CamelCase hashtags, always alt text).

### 1.5 Instagram (12 min) and Threads (3 min)

- ☐ Username (≤30 characters): `earthinteractive` → `earth.interactive` → `earthinteractive.app` →
  `earthinteractiveapp`.
- ☐ Name field: `EarthInteractive | True-size globe` (the name field is searchable, so put a keyword in it).
- ☐ Switch to a **Professional → Creator** account (free; gives you insights). Category: **Education
  website**, or *Science, Technology & Engineering* if that's not offered.
- ☐ Bio (≤150 characters):
  *Your map has been lying to you.*
  *True-size country compares on a real 3D globe.*
  *Daily geography challenge. Free, no sign-up.* (123 characters)
- ☐ Links: site (IG UTM) + `…/?play=daily`.
- ☐ Profile photo `profile/pfp-globe-1080.png`.
- ☐ Safety: Accounts Center → Password and security → **Two-factor (authentication app)**. Under Hidden
  Words, turn **on** "Hide comments" and "Advanced filtering" (for border arguments).
- ☐ **Threads:** sign in with the Instagram account, which creates the same handle. Import the profile;
  the bio is ≤150 characters, so reuse the IG bio.
- **Grid note:** the profile grid now previews posts at **3:4**, so the 1080×1350 portrait posts in
  `posts/portrait/` keep their key text away from the edges.
- **First 3 posts:** `captions.md` → Instagram (first 3 = p01 carousel, s01 story, v01 reel).

### 1.6 TikTok (10 min)

- ☐ Username (≤24 characters): `earthinteractive` → `earth.interactive` → `earthinteractiveapp`.
  Display name (≤30): `EarthInteractive`.
- ☐ Bio (**80 characters**): *Your map has been lying to you. Real country sizes on a 3D globe.* (65)
- ☐ **Website link:** personal accounts need **1,000 followers**. A **Business account** gets a clickable
  link straight away, but only has the Commercial Music Library. The videos in this kit have no music, so
  Business is fine. Until then, write `link on profile` in captions and put the URL as text in the bio.
- ☐ Photo `profile/pfp-globe-1080.png`.
- ☐ Safety: Settings → Security → **2-step verification**. Privacy → comment filters on ("Filter
  spam and offensive comments"). Add keywords for border fights if needed.
- **First 3 posts:** `video/v01…` (L+2), `video/v02…`, `video/v03…` (see `captions.md` → TikTok).
  Record your own 20–35 s screen recordings later as well (plan §4.3); these kit clips are short starters.

### 1.7 YouTube (Shorts) (15 min)

- ☐ Create a **Brand Account** channel (YouTube → Settings → Add or manage channels → Create a channel),
  so it isn't tied to a personal Google profile name.
- ☐ Handle (3–30 characters): `@earthinteractive` → `@EarthInteractiveApp` → `@earthinteractive.globe`.
- ☐ Channel name: `EarthInteractive`.
- ☐ Description (≤1,000 characters):
  *EarthInteractive is a free, true-to-scale 3D globe that runs in your browser. Flat maps make Greenland
  look as big as Africa; on a globe you see the truth. Pull any two countries off the planet and lay them
  side by side, recolour the world by population, density or GDP per person, and play the Daily Challenge:
  the same five countries for everyone, every day.*
  *New "True Size Tuesday" shorts every week.*
  *No sign-up, no install. Works on phones and Chromebooks.*
  *Made by John, a solo developer.*
- ☐ Links (Customization → Basic info → Links): `Play free` → site (YouTube UTM), `Daily Challenge` →
  `…/?play=daily`. Shorts descriptions **don't make URLs clickable**, so these channel links are the
  reliable way to reach the site from YouTube.
- ☐ Picture `profile/pfp-icon-1080.png`. Banner `banners/youtube-channel-art-2560x1440.jpg`: the text is
  inside the 1546×423 safe area. Check the desktop, mobile and TV previews in the upload dialog.
- ☐ Verify the account with your phone (unlocks custom thumbnails and longer uploads). Turn on 2-Step
  Verification on the Google account. Under Settings → Community, set **"Hold potentially inappropriate
  comments for review"**.
- ☐ Audience: set **"No, it's not made for kids"** at channel level unless you deliberately target under-13s
  (see plan §10.2, COPPA). Mark each video individually if that changes.
- **First 3 posts:** the three videos in `video/` as Shorts (see `captions.md` → YouTube).

### 1.8 Facebook Page (optional, 12 min)

Teachers are on Facebook (plan §1), so a Page is useful for posting into teacher groups later.

- ☐ From your personal profile: Pages → Create. Name `EarthInteractive` (≤75 characters).
- ☐ Category: type **"Education website"**. If it's not offered, use *Website* + *Education*. Pick from
  the dropdown.
- ☐ Bio (the new Pages experience allows **101 characters**): *A free, true-to-scale 3D globe: compare
  real country sizes and play a daily geography game.* (91)
- ☐ Website: the site (UTM `facebook`).
- ☐ Profile `profile/pfp-icon-1080.png`. Cover `banners/facebook-cover-1702x630.jpg` (an 851×315 design at
  2×). The text sits in the centre, because mobile crops the sides.
- ☐ Safety: Page settings → Privacy → **Profanity filter: strong**. Moderation assist on. Turn on 2FA on
  your personal account (it controls the Page).
- **First 3 posts:** `captions.md` → Facebook.

### 1.9 LinkedIn (personal, 8 min)

No company page needed yet; the plan uses one **personal "what I built" post**.

- ☐ Background photo: `banners/linkedin-banner-1584x396.jpg`. Your photo covers the lower-left, so the
  text is centre-right.
- ☐ Headline (≤220 characters): *Solo developer building EarthInteractive, a free true-to-scale 3D globe for
  classrooms and map nerds | Three.js, WebGL, plain JavaScript* (136)
- ☐ Featured section: add the site link, and later the Show HN thread.
- ☐ Turn on Creator mode only if you plan to post weekly.
- **First 3 posts:** `captions.md` → LinkedIn (launch story on L day; a "Did you know" card Wed; a
  dev-lesson post the week after).

### 1.10 Product Hunt maker profile (10 min now, launch on a Tue–Thu between L+21 and L+42)

- ☐ Sign up with **your personal identity** (makers are people). Username: your name, e.g. `@johnredman`.
- ☐ Headline: *Solo dev · building EarthInteractive, a true-to-scale 3D globe*.
- ☐ Follow and upvote a few products you genuinely like over the next weeks. An active, older profile
  helps on launch day.
- ☐ Prepare the product (Post a product → Schedule):
  - Name `EarthInteractive`
  - Tagline (≤60 characters): *A true-to-scale globe: pull countries out, compare, play.* (57)
  - Description (≤260 characters): *A free 3D globe that shows the real size of every country. Pull two
    countries off the planet and compare them side by side, recolour the world by population or wealth, and
    play a daily geography challenge. No sign-up.* (about 230)
  - Thumbnail `profile/producthunt-thumbnail-240.png`
  - Gallery `banners/producthunt-gallery-01…06` (1270×760, each <3 MB; at least 2 are needed)
  - Topics: *Education, Maps, Games, Web App*
  - First maker comment: adapt the Show HN first comment (plan §3.3).
- **Rules:** never ask for upvotes, only "check it out" (plan §3.4).

### 1.11 Hacker News (3 min)

- ☐ Create an account at news.ycombinator.com with your own name-ish username (keep it short; HN usernames
  are around 2–15 characters, *unverified*). Brand accounts look odd on HN.
- ☐ Profile "about": *Solo dev. Building EarthInteractive (true-to-scale WebGL globe): <site>.* Add your
  email if you want people to reach you.
- ☐ Comment on a few threads before launch day, so the account isn't brand new on L+1 (Show HN day).
- **Post:** Show HN (title + first comment are in plan §3.3, repeated in `captions.md`). No UTMs, no images.

### 1.12 Discord (10 min)

- ☐ Personal account: username `johnmakesglobes` (lower case, 2–32 characters). Display name `John |
  EarthInteractive`. About Me: *Building EarthInteractive: a free 3D globe for real country sizes + a daily
  geography challenge.* (96)
- ☐ Turn on **2FA** (User Settings → My Account).
- ☐ Find 2–3 geography / GeoGuessr servers (Disboard or Discord's server discovery, search "geography").
  Read the rules, and post only in #self-promo or #resources, or ask a mod (plan §3.5).
- ☐ **Optional, later:** your own server "EarthInteractive Daily" with a `#daily-results` channel. Icon:
  `profile/discord-server-icon-512.png`. The banner (`banners/discord-server-banner-1920x1080.jpg`) only
  shows at **Boost Level 2**, so it can wait.

### 1.13 Pinterest (12 min)

Pinterest has a large teacher and classroom-resource audience: geography boards, infographics and map
posters are common there. Whether *these* pins will perform is unverified; treat it as a low-effort test.

- ☐ Create a **Business account** (free; gives analytics and lets you claim the site).
  - Username: `earthinteractive` → `earthinteractiveapp`.
  - Name `EarthInteractive`.
- ☐ About (≤500 characters, about 160 visible): *Free true-to-scale 3D globe for curious minds and
  classrooms. Compare the real size of any two countries, explore population and wealth maps, and play a
  daily geography challenge. No sign-up.* (191)
- ☐ Profile `profile/pfp-globe-1080.png`. Cover `banners/pinterest-cover-1600x900.jpg` (16:9).
- ☐ **Claim the website** once the custom domain is live. It needs a meta tag or DNS record, which is an
  app change, so it's left for you to do.
- ☐ Boards:
  - *True size: country comparisons* (p01–p08, p15)
  - *Maps & data* (p09–p11)
  - *Geography teaching ideas* (p12–p14, plus your lesson plan later)
- ☐ Pin the **portrait (1080×1350)** posts. Pinterest prefers 2:3, but 4:5 displays fine. Each pin links to
  the matching deep link (`?compare=GRL,COD` and so on, with UTM `pinterest`).
- ☐ Turn on 2FA (Settings → Security).

---

## 2. Time estimate

| Block | Time |
|---|---|
| 0. Mailbox, password manager, link plan | 25 min |
| Reddit | 10 min |
| X | 10 min |
| Bluesky | 8 min |
| Mastodon | 10 min |
| Instagram + Threads | 15 min |
| TikTok | 10 min |
| YouTube | 15 min |
| Facebook Page (optional) | 12 min |
| LinkedIn | 8 min |
| Product Hunt profile | 10 min |
| Hacker News | 3 min |
| Discord | 10 min |
| Pinterest | 12 min |
| Scheduling the first week of posts (Buffer free plan or the platforms' own schedulers) | 30 min |
| **Total** | **about 3 h 10 min** (about 2 h 45 min without Facebook and Pinterest) |

---

## 3. What's in this folder

```
marketing/
  README.md                this guide
  captions.md              captions per asset and platform, alt text, and the posting schedule
  contact-sheet.png        every asset on one page
  profile/                 profile pictures (icon + real-globe variants, 1080 and 400), Discord icon, PH thumbnail
  banners/                 X, Bluesky, Mastodon, YouTube, Facebook, LinkedIn, Reddit, Discord, Pinterest,
                           and Product Hunt gallery images
  posts/square/            1080×1080 feed posts (X, Bluesky, Mastodon, Facebook, LinkedIn, Reddit)
  posts/portrait/          1080×1350 feed posts (Instagram, Threads, Pinterest, Facebook)
  stories/                 1080×1920 stories / Shorts / TikTok covers (text kept out of the top 250 px and bottom 340 px)
  video/                   1080×1920 H.264 MP4 clips (silent) + cover frames
  screenshots/             plain app screenshots (desktop + phone) for press, directories and Product Hunt
```

## 4. Before you post anything with a number

- Every figure in the images comes from the current app data: World Bank population **2025**, GDP
  **2024** for most countries (a few older years, as the card shows), and Natural Earth areas. Compare
  ratios come from the app's compare bar. It measures the *main territory* of each country, so far-off
  parts stay home: the USA piece is the contiguous 48 states (7.95M km²), without Alaska and Hawaii.
- If the data is refreshed again, re-read the numbers in the app before reusing a caption.
- **Hold** the border-views carousel (`p16-*`) until the "About the borders" page is live and you have an
  audience (plan §10.1).

## 5. When the custom domain goes live

- ☐ Update every bio link and the UTM links (search this file for `john-redman.github.io`).
- ☐ Switch the Bluesky handle to the domain.
- ☐ Add the Mastodon `rel="me"` link and the Pinterest claim tag.
- ☐ Re-render the images with the new URL: the footer URL is set in one place in the generator. Or just
  crop it out; the brand mark stays.

## Sources for platform limits (checked October 2026)

- X header 1500×500, LinkedIn 1584×396, Facebook cover 820×312 / 851×315 with a central mobile safe zone:
  [Constant Contact](https://www.constantcontact.com/blog/social-media-image-sizes/),
  [socialsizes.io](https://socialsizes.io/facebook-cover-photo-size/),
  [postfa.st](https://postfa.st/sizes/facebook/cover)
- Bluesky banner 3000×1000, avatar 1000×1000, display name 64, bio 256:
  [allplatforms.io](https://allplatforms.io/bluesky/), [Agent Sky](https://useagentsky.com/blog/bluesky-banner-size)
- Bio limits (Instagram 150, TikTok 80, Threads 150, X 160, Bluesky 256, Mastodon 500):
  [socialync.io](https://www.socialync.io/blog/social-media-platform-limits-guide-2026),
  [ferryman.io](https://ferryman.io/character-limits)
- Usernames (X 15, Instagram 30, TikTok 24, YouTube 3–30):
  [handlegrab](https://www.handlegrab.com/blog/social-media-username-rules-limits)
- YouTube banner 2560×1440, safe area 1546×423, profile 800×800, description 1,000:
  [wyzowl](https://wyzowl.com/youtube-banner-size/), [postfa.st](https://postfa.st/sizes/youtube/profile)
- Shorts links not clickable: [YouTube Help](https://support.google.com/youtube/answer/13748639?hl=en),
  [link.boo](https://link.boo/guides/youtube-shorts-link-in-description)
- Mastodon header 1500×500, avatar 400×400: [socialk.it](https://socialk.it/en/sizes/mastodon-header-size)
- Reddit profile banner (sources disagree: 1920×384, 1600×480, 1200×400):
  [mediasizes](https://mediasizes.com/reddit-image-size/)
- Discord server banner 960×540 min / 1920×1080, Boost Level 2, icon 512:
  [pixotter](https://pixotter.com/blog/discord-image-size/)
- Pinterest cover 16:9 (800×450 min, 1600×900 recommended), bio 500:
  [socialrails](https://socialrails.com/blog/pinterest-banner-size-guide)
- Product Hunt gallery 1270×760, thumbnail 240×240, tagline 60, description 260, images <3 MB:
  [Product Hunt help](https://help.producthunt.com/en/articles/5473122-how-to-post-media),
  [getlaunchlist](https://getlaunchlist.com/checklists/producthunt)
- Facebook Page name 75, new-Pages bio 101; LinkedIn headline 220:
  [textcharactercounter](https://textcharactercounter.com/facebook-character-limit/),
  [jobscan](https://www.jobscan.co/blog/impactful-linkedin-headline-examples/)
- TikTok link in bio (1,000 followers, or a Business account):
  [socialrails](https://socialrails.com/blog/how-to-add-link-tiktok-bio-complete-guide)
- Instagram 4:5 feed, 3:4 grid preview, story safe zones:
  [socialbu](https://socialbu.com/blog/instagram-post-aspect-ratio),
  [outfy](https://www.outfy.com/blog/instagram-safe-zone/)

**Not verified:** the HN username length, the Reddit and Discord "About" lengths, the Facebook category
names (pick from the live dropdown), Mastodon instance rules for project accounts, and whether maps
perform well on Pinterest.
