# Backend: players, leaderboards and future games

**Short answer:** the website stays on GitHub Pages, unchanged. Scores and names go to a small API on **Cloudflare Workers**, which stores them in **Cloudflare D1**, a hosted SQLite database. There's no server to run or patch, it costs **$0** at the expected traffic, and you manage it with one command-line tool (`wrangler`). If the API is down or not set up, the site works exactly as it does today, just without leaderboards.

```
 Browser (GitHub Pages)                  Cloudflare (free plan)
 ┌──────────────────────────┐   HTTPS    ┌──────────────────────────────┐
 │ js/quiz.js  → finishes   │──────────▶ │ Worker  server/src/index.js  │
 │ js/leaderboard.js (UI)   │  JSON/CORS │  validate · rate-limit · SQL │
 │ js/net/api.js  (client)  │◀────────── │          │                   │
 │ js/net/profanity.js ◀────┼─ same file ┼─▶ server/src/profanity.js    │
 │ localStorage: player id  │            │ D1 database (SQLite)         │
 └──────────────────────────┘            │  players · scores            │
                                         └──────────────────────────────┘
```

## Why Cloudflare Workers + D1

| Need | How this stack covers it |
|---|---|
| Tiny budget | Free plan covers early traffic. The next step is a flat $5/month, not a per-seat price |
| Nothing to babysit | Serverless: no VM, no OS updates, no database server to keep alive. Free databases on some other hosts pause after a week of inactivity, which would break the daily leaderboard. D1 doesn't pause |
| Static site stays static | The Worker is a separate origin (`*.workers.dev`, later `api.<your-domain>`), and the site calls it with `fetch` |
| Fast everywhere | Workers run in Cloudflare's edge locations close to players |
| Can move later | Plain SQL (`server/schema.sql`) and a plain `fetch` handler. Moving to Supabase/Postgres means porting about 150 lines and re-running the schema with minor type changes; the browser side only needs a new `API_BASE` |

Alternatives considered: **Supabase** (Postgres, with auth built in) is a good *later* option for accounts, but the free project pauses after inactivity and you'd still want a server-side function for validation. **Firebase** pushes validation into security rules and locks you in more. A **VPS** means you run and secure a server yourself.

## What is stored

| Table | Columns | Notes |
|---|---|---|
| `players` | `id` (random UUID made by the browser), `name`, `name_key`, `banned`, `created_at`, `updated_at` | No email, no IP, no password, no device info |
| `scores` | `player_id`, `game`, `period`, `score`, `details` (JSON of `{ k, pts }` per round), `duration_ms`, `created_at` | One row per player per game per day |

- **Games are just strings.** `daily` and `classic` exist today. A flags or capitals game later needs one entry in `GAMES` in `server/src/validate.js` (rounds, max points per round, once-per-day or keep-best) and no database change.
- **Daily Challenge:** one score per player per day. The first submission counts; later ones are refused.
- **Find it (classic):** the best score per player per day is kept, so there's a "today's best" board.
- `period` is the player's **local** date, the same one the quiz uses for its seed. The API accepts only today ± 1 day in UTC, which covers every time zone, so nobody can post to an old or future day.
- **Names** are 3–20 characters: Latin letters (accents allowed), digits, space, `_` and `-`. One person per name, compared without case, accents or separators, so "John_R" and "john r" count as the same name. Names pass the profanity filter both in the browser (instant feedback) and in the Worker (the real check).

## API

| Route | Body / query | Returns |
|---|---|---|
| `GET /api/health` | | `{ ok, db }` |
| `POST /api/name` | `{ player, name }` | `{ ok, name }` or `409 taken`, `400 profane/short/long/chars/reserved`, `403 banned` |
| `POST /api/scores` | `{ player, game, period, score, durationMs, details: { rounds: [{ k, pts }] } }` | `{ ok, stored, duplicate, me: { rank, name, score, durationMs } }` or `404 no-player`, `400 bad-score/too-fast/bad-period/…` |
| `GET /api/leaderboard` | `?game=daily&period=YYYY-MM-DD&limit=50&player=<uuid>` | `{ ok, top: [{ rank, name, score, durationMs }], me }` (`me` = caller's rank, also outside the top N) |

Errors always look like `{ ok: false, error: '<code>', message }`. The API never returns another player's id.

**Checks on every score:** the game is known; there are exactly 5 (daily) or 10 (classic) rounds with distinct country keys; each round is an integer from 0 to 1000 (matching `js/quiz.js`: 1000 for exact, 500 with a hint, `round(1000·e^(−km/1500))` for a miss); `score` equals the sum of the rounds (so at most 5,000 or 10,000); the duration is at least 1 s per round and under 24 h.

**CORS:** only origins listed in `ALLOWED_ORIGINS` (`server/wrangler.toml`) get CORS headers. Browsers on other sites get a 403.

**Rate limits:** Cloudflare's Rate Limiting binding allows 10 writes and 120 reads per minute per IP. The counters live in each Cloudflare location and are approximate, which is enough to stop floods and naive scripts. The IP is used only for the counter and never stored.

## Cost: free plan limits

These are Cloudflare's published numbers as of October 2026. Their docs pages were not reachable from the build environment, so the figures were checked against secondary sources; confirm them at <https://developers.cloudflare.com/workers/platform/pricing/> and <https://developers.cloudflare.com/d1/platform/pricing/>.

| | Free | Workers Paid ($5/month minimum) |
|---|---|---|
| Worker requests | 100,000 / day | 10 M / month included, then $0.30 per million |
| Worker CPU | 10 ms per request (this API uses ~1 ms) | 30 M CPU-ms / month included |
| D1 rows read | 5 M / day | 25 billion / month included, then $0.001 per million |
| D1 rows written | 100,000 / day | 50 M / month included, then $1.00 per million |
| D1 storage | 5 GB total (single database capped at 500 MB on the free plan, to my knowledge) | 5 GB included, then $0.75 / GB-month |

Free limits reset at 00:00 UTC. Recent reports say D1 now hard-stops free accounts at the daily cap (queries fail until midnight UTC) rather than billing. If that happens, the site still works and only the leaderboard shows "unavailable".

**What that means for EarthInteractive.** One finished game costs about 5 Worker requests (name, score and leaderboard calls, plus CORS preflights) and about 3–6 rows written (the row plus its indexes). Reading the board costs ~10 rows for the top 10, plus "your rank", which counts the scores above you. That count grows with the number of players that day:

- **Writes:** 100k/day covers about **15,000+ games a day**.
- **Worker requests:** 100k/day covers about **20,000 games a day**.
- **Reads** run out first: about **1,500 daily players** on the free plan (the rank counts grow with players²). The $5 plan's 25 billion reads/month take it past **20,000 daily players**.
- **Storage:** a score row is ~300 bytes, so a million games is ~0.3 GB.

Ways to stretch the free plan when it matters: serve the top list from the edge cache (already coded; it works once the API is on a custom domain, since the cache is a no-op on `workers.dev`), show "top X%" instead of an exact rank past the first few hundred, or keep a per-day histogram table.

## Set up (one time, about 20 minutes)

You need Node 22+ and a free Cloudflare account.

1. **Create a Cloudflare account** at <https://dash.cloudflare.com/sign-up>. No card is needed for the free plan.
2. **Install the tools and log in**
   ```bash
   cd server
   npm install                 # installs wrangler (dev dependency of server/ only)
   npx wrangler login          # opens the browser to authorise
   ```
3. **Create the database** and paste the printed `database_id` into `server/wrangler.toml`, replacing the zeros:
   ```bash
   npm run db:create           # = npx wrangler d1 create earth-interactive
   ```
4. **Create the tables**
   ```bash
   npm run db:init:remote      # applies schema.sql to the real database (safe to re-run)
   ```
5. **Deploy the Worker**
   ```bash
   npm run deploy              # prints https://earth-interactive-api.<your-subdomain>.workers.dev
   curl https://earth-interactive-api.<your-subdomain>.workers.dev/api/health   # → {"ok":true,"db":true}
   ```
6. **Point the site at it.** In `js/net/api.js`, set
   `export const API_BASE = 'https://earth-interactive-api.<your-subdomain>.workers.dev';`
   then commit and push to `main`. GitHub Pages redeploys and the leaderboard appears.
7. **Later, with a custom domain** (for example `earthinteractive.app` on Cloudflare DNS):
   - Add the site's new origin to `ALLOWED_ORIGINS` in `server/wrangler.toml`.
   - Optionally serve the API from `api.earthinteractive.app`. Add to `wrangler.toml`:
     ```toml
     routes = [{ pattern = "api.earthinteractive.app", custom_domain = true }]
     ```
     Then run `npm run deploy` and update `API_BASE`. On a custom domain the 30-second edge cache of top lists also starts working.
   - If you ever serve the API from the **same** origin as the site (e.g. `/api/` on the same domain), make `sw.js` skip `/api/` requests. Otherwise the service worker would cache leaderboard responses.

**Local development** runs without a Cloudflare account:
```bash
cd server && npm install
npm run db:init:local       # local SQLite under server/.wrangler/ (git-ignored)
npm run dev                 # API on http://localhost:8787
# in another terminal, at the repo root:
npm run dev                 # site on http://localhost:5173
# in the browser console on the site, use the local API without editing api.js:
localStorage.setItem('ei-api-base', JSON.stringify('http://localhost:8787')); location.reload();
```
`npm test` in `server/` runs the profanity, validation and end-to-end tests. The end-to-end tests run the Worker against `schema.sql` in an in-memory SQLite and need no wrangler.

## Managing the data (moderation)

Every command below runs from `server/`. Use `--remote` for production or `--local` for your dev copy. Back up first with `npx wrangler d1 export earth-interactive --remote --output backup.sql`. D1 also has Time Travel, so you can restore to any minute in the last 7 days (free) or 30 days (paid): `npx wrangler d1 time-travel restore earth-interactive --timestamp=<unix or ISO time>`.

```bash
DB="npx wrangler d1 execute earth-interactive --remote --command"

# Today's daily top 20
$DB "SELECT p.name, s.score, s.duration_ms FROM scores s JOIN players p ON p.id = s.player_id
     WHERE s.game='daily' AND s.period='2026-10-05' ORDER BY s.score DESC, s.duration_ms LIMIT 20"

# Find a player by name
$DB "SELECT id, name, banned, datetime(created_at/1000,'unixepoch') FROM players WHERE name LIKE '%rude%'"

# Rename an offensive name (name_key must be unique: lower-case, no spaces/_/-, accents removed)
$DB "UPDATE players SET name='Player 4821', name_key='player4821' WHERE name_key='badname'"

# Ban a player: hidden everywhere, can't post or rename. ALSO delete their scores (rank counts don't check bans)
$DB "UPDATE players SET banned=1 WHERE name_key='cheater'; DELETE FROM scores WHERE player_id=(SELECT id FROM players WHERE name_key='cheater')"

# Delete a player completely (e.g. on request). Scores go with them
$DB "DELETE FROM scores WHERE player_id='<uuid>'; DELETE FROM players WHERE id='<uuid>'"

# Wipe one day's daily board (e.g. a broken challenge)
$DB "DELETE FROM scores WHERE game='daily' AND period='2026-10-05'"

# Remove obviously impossible results after the fact
$DB "DELETE FROM scores WHERE game='daily' AND score=5000 AND duration_ms < 15000"

# Housekeeping: drop free-play scores older than 90 days
$DB "DELETE FROM scores WHERE game='classic' AND period < date('now','-90 day')"
```

The D1 page in the Cloudflare dashboard also has a SQL console and a table browser, if you'd rather click than type.

To change the word list, edit `js/net/profanity.js`. It's the one file used by both the browser and the Worker. Run `npm test` in `server/`, then push and run `npm run deploy`.

## Privacy

- **No personal data:** no email, no account, no IP stored. A player is a random id in their own browser's `localStorage`, plus the name they chose.
- That id is the player's only "key", so the API never sends anyone else's id back. If someone clears their browser storage, they get a new id and need a new name (the old one stays taken). A "recovery code" (show the id once, let them paste it back) can be added later if people ask.
- The privacy policy should say something like: *"If you add your name to a leaderboard, we store that name, your game scores and a random identifier kept in your browser. We don't collect email addresses or other personal details. IP addresses are used only briefly to stop abuse and aren't stored. Ask us to delete your scores at <contact>."*
- Cloudflare processes requests, and its request logs (enabled via `[observability]`) include URLs, which contain the player id on leaderboard reads. Keep log retention short, or turn off observability if you don't need it.

## Anti-cheat: what this does and doesn't do

Honestly: **a determined cheater can post a fake score.** There's no login and the game runs in the browser, so anyone can read `js/quiz.js` and send a well-formed request. The server does stop:

- impossible scores (over 1,000 a round, a total that doesn't match the rounds, wrong number of rounds);
- impossibly fast games (under 1 s a round);
- posting to old or future days, and posting the daily twice;
- spam floods (per-IP rate limits) and offensive names (filter + moderation).

Cheap upgrades, in order of value when it matters:

1. **Check the daily countries.** The server can recompute the day's 5 countries with the same seed (`mulberry32(hash('ei-' + day))`) if it has the list of eligible country keys, then reject rounds naming other countries.
2. **Server-issued game tokens:** `POST /api/games/start` returns a signed token with the start time, and the duration is measured on the server.
3. **Plausibility per round:** require the clicked point and recompute the distance points on the server (needs country centroids in the Worker).
4. **Cloudflare Turnstile** (free, invisible CAPTCHA) on name claims.

For a casual geography game these are enough, and moderation commands can clean up anything odd.

## Growing later

Only when traffic justifies it:

1. **Accounts:** keep the anonymous id and let players *attach* an email via a magic link, so nothing is lost. Options: Supabase Auth (free tier, Postgres, easy if you move the data there too), Clerk (polished UI, free up to a generous MAU count), or Cloudflare Access/your own magic link via an email API (Resend, free tier). The `players` table gains `email`/`auth_id` columns, scores stay as they are.
2. **Permanent ranks and stats:** all-time or monthly tables built from `scores` (e.g. `SELECT player_id, SUM(score) … GROUP BY player_id` on a schedule with a Worker Cron Trigger, written to a `ranks` table), plus streaks from consecutive daily `period`s.
3. **Seasons:** a `period` like `2026-S1` or `2026-W41` in the same `scores` table, or a `seasons` table with start and end dates.
4. **New games** (flags, capitals, teacher mode): a new `game` string plus an entry in `GAMES`.
5. **Moving off Cloudflare:** export with `wrangler d1 export`, load into Postgres, and port `server/src/index.js` routes to a Supabase Edge Function or any Node host. The browser only needs `API_BASE` changed.

## How it fits the static site

| Path | Published by GitHub Pages? | Why |
|---|---|---|
| `js/net/api.js`, `js/net/profanity.js`, `js/leaderboard.js`, `css/leaderboard.css` | **Yes**, automatically: `.github/workflows/pages.yml` copies all of `css/` and `js/` | The browser needs them |
| `server/` | **No**: the workflow copies only `index.html manifest.webmanifest sw.js og-image.png css js data vendor icons` + `LICENSE THIRD_PARTY_NOTICES.md` | Worker source, deployed separately with `wrangler` |

Notes for the codebase:
- `npm run check` (repo root) syntax-checks top-level `js/*.js` only, so `js/leaderboard.js` is covered but `js/net/*.js` isn't. To include it, extend `tools/check.mjs` to walk sub-folders. `server/` has its own `npm test`.
- For offline caching, add `'js/leaderboard.js', 'js/net/api.js', 'js/net/profanity.js', 'css/leaderboard.css'` to `CORE` in `sw.js`. Without that they're cached on first use anyway (same-origin, stale-while-revalidate), and offline the board simply hides itself.
- Wrangler bundles the Worker with esbuild, which follows `server/src/profanity.js`'s re-export of `../../js/net/profanity.js`. That's how one file serves both sides (checked with `wrangler deploy --dry-run`, and `server/test/shared.test.mjs` guards it).
- The site's Content Security Policy, if one is added later, needs `connect-src` to include the API origin.

## Wiring it into the quiz (`js/quiz.js`)

`js/leaderboard.js` exports `createLeaderboard({ container, limit = 10 })` → `{ submit(result), render(game, period) }`. It loads its own stylesheet, renders nothing when `API_BASE` is empty, and never throws. The changes to `js/quiz.js`:

```js
// 1. top of the file
import { createLeaderboard } from './leaderboard.js';

// 2. start(): note when a new game begins (after the "daily already done" early return)
S = { mode, day, qs: pickQuestions(mode, rand), i: 0, results: [], hinted: false, answered: false, t0: performance.now() };

// 3. finish(): keep the play time and mark the result as new (before renderEnd())
S.ms = Math.round(performance.now() - S.t0);
S.fresh = true;

// 4. renderEnd(): add a container to the markup, e.g. between .qz-review and .qz-act
//      <div class="qz-board" hidden></div>
//    then, after the other handlers at the end of renderEnd():
const board = createLeaderboard({ container: el.querySelector('.qz-board') });
if (S.fresh) {
  S.fresh = false;   // re-renders (e.g. reopening today's daily) only show the board
  board.submit({ game: S.mode, period: S.day, score: total(), details: { rounds: S.results }, durationMs: S.ms });
} else {
  board.render(S.mode, S.day);
}
```

- `S.results` is already `[{ k, pts }]`, exactly what the API validates.
- Re-opening an already-played daily (the `done` branch of `start()`) goes through `renderEnd()` without `S.fresh`, so it only shows the board. A second submit would be refused as a duplicate anyway.
- Optional: put the player's rank in the share text (`board.submit` resolves to the leaderboard response, whose `me.rank` you can use).
- On phones the quiz panel sits at the bottom; `css/leaderboard.css` caps the list at 30 vh with its own scroll.

Sources for the pricing figures: [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers & Pages plans](https://www.cloudflare.com/plans/developer-platform/), [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [D1 free-tier cutoff report](https://omidsaffari.com/blog/cloudflare-d1-free-limits-queries-stop), [D1 free tier summary](https://freetier.co/articles/cloudflare-d1-free-tier-limits-pricing-and-alternatives).
