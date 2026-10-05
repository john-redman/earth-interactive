# Backend: players, leaderboards and future games

**Short answer:** the website stays on GitHub Pages, unchanged. Scores and names go to a small API with a **SQLite** database. The same code runs in two places, and you pick one:

- **Option A, self-hosted (chosen):** a plain Node 22 server (`server/node/server.mjs`) with a SQLite file, behind Caddy for HTTPS, on an **Oracle Cloud Always Free** VM. It costs **$0** and uses no npm packages. In exchange, you run the server: updates, backups and fixing it if it goes down.
- **Option B, Cloudflare:** the same code as a Cloudflare Worker with Cloudflare D1. Also **$0** at launch traffic, and there's no server to look after.

Either way, if the API is down or not set up, the site works exactly as it does today, just without leaderboards.

```
 Browser (GitHub Pages)                 Option A: your VM (Oracle Always Free)
 ┌──────────────────────────┐  HTTPS   ┌──────────────────────────────────────────────┐
 │ js/quiz.js  → finishes   │────────▶ │ Caddy :443 (auto HTTPS) → Node :8787         │
 │ js/leaderboard.js (UI)   │ JSON/CORS│   node/server.mjs → src/index.js (fetch)     │
 │ js/net/api.js  (client)  │◀──────── │   validate · rate-limit · SQL                │
 │ js/net/profanity.js ◀────┼─ same ───┼─▶ src/d1-sqlite.js → /data/earth.db (WAL)    │
 │ localStorage: player id  │   file   │   nightly backup → Google Drive (rclone)     │
 └──────────────────────────┘          └──────────────────────────────────────────────┘
                                        Option B: Cloudflare Worker src/index.js + D1
```

**One codebase, two adapters.** `server/src/index.js` is a standard `fetch(request, env, ctx)` handler. It talks to the database only through the D1 API (`env.DB.prepare(sql).bind(…).first()/all()/run()`) and to the rate limiter through `env.RL_READ/RL_WRITE.limit({ key })`.

| | Cloudflare (Option B) | Node (Option A) |
|---|---|---|
| Runs `src/index.js` with | the Workers runtime | `node/server.mjs`: `node:http` → WHATWG `Request` → `fetch()` → streamed back |
| `env.DB` | D1 binding | `src/d1-sqlite.js`: the D1 API over the built-in `node:sqlite`, WAL mode, 5 s busy timeout, `schema.sql` applied at every start (idempotent) |
| `env.RL_*` | Rate Limiting binding | `node/rate-limit.js`: an in-memory counter per IP, reset each minute |
| Client IP | `CF-Connecting-IP` | `ctx.clientIp`: the socket address, or the last `X-Forwarded-For` entry when `TRUST_PROXY=1` |
| Top-list edge cache | `caches.default` (custom domain only) | none: reads from the local SQLite file take well under a millisecond |
| Settings | `wrangler.toml` `[vars]` | environment variables or a `.env` file |

## Self-host or Cloudflare?

Both cost $0 at launch. What you pay with differs:

| | **A: Self-hosted on Oracle Always Free** | **B: Cloudflare Workers + D1 free plan** |
|---|---|---|
| Money | $0. A card is needed for identity checks, and Pay As You Go is recommended (see step 1) but not charged while you stay inside Always Free | $0, with no card needed |
| Hard caps | None from the software. The VM (1–2 Arm cores, 6–12 GB) handles thousands of requests a second. The 10 TB/month traffic allowance is far beyond a JSON API's needs | 100k requests/day and 5 M D1 rows read/day. Rank counts run out of reads at about **1,500 daily players**, then it's $5/month |
| Your time | About 1–2 hours to set up. Then about 15 minutes a month for OS updates (mostly automatic), checking backups and reading the uptime alerts | About 20 minutes to set up, then close to none |
| Failure modes | **Single point of failure:** one VM in one data centre. If it dies, the leaderboard is down until you restore a backup onto a new VM (about 30 minutes). Oracle can reclaim "idle" free VMs (avoidable, see below) | Cloudflare's global network, with no server to fail. At the daily cap, queries stop until midnight UTC |
| Data | A file you own (`earth.db`), with backups you control | In Cloudflare, exportable with `wrangler d1 export`, plus Time Travel restore for 7 days |
| Latency | One region: about 100–250 ms for players on other continents. Fine for a leaderboard | Edge locations near players |
| Lock-in | None. The same container runs on any VPS or a spare PC | Low (plain SQL, standard `fetch` handler) |

**Recommendation:** go with **Option A** as decided. It removes the 1,500-daily-player ceiling and the $5 step, and the data stays yours. The real cost is that you're now the operator: keep the nightly off-site backup and the uptime monitor running. They're both in the steps below and both free. If running a server ever becomes a chore, switching to Option B takes about 20 minutes: load a backup into D1 and change `API_BASE`. Nothing in the browser code changes.

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

**CORS:** only origins listed in `ALLOWED_ORIGINS` get CORS headers: the `.env` file (Option A) or `server/wrangler.toml` (Option B). Browsers on other sites get a 403. Requests without an `Origin` (curl, uptime monitors) are served.

**Rate limits:** 10 writes and 120 reads per minute per IP. The IP is used only for the counter and never stored.
- Self-hosted: an in-memory counter in the Node process (`RATE_WRITE_PER_MIN`, `RATE_READ_PER_MIN`; `0` turns a limit off). It resets on restart. Behind Caddy, `TRUST_PROXY=1` makes the server read the client IP from `X-Forwarded-For`. Caddy overwrites whatever the client sends there, so the header can't be forged. Never set `TRUST_PROXY=1` when port 8787 is reachable from the internet.
- Cloudflare: the Rate Limiting binding. Its counters live in each Cloudflare location and are approximate, which is enough to stop floods and naive scripts.

`HEAD` requests are answered like `GET`, so uptime monitors that use `HEAD` work too.

## Option A: self-host on Oracle Cloud Always Free (recommended, $0)

What's in `server/` for this:

| File | Job |
|---|---|
| `node/server.mjs` | The HTTP server (`npm start`). Graceful shutdown on SIGTERM/SIGINT: it finishes in-flight requests and checkpoints the database |
| `src/d1-sqlite.js` | The D1-compatible database over `node:sqlite` (also used by the tests) |
| `node/rate-limit.js`, `node/http-adapter.js`, `node/config.js` | The per-IP limiter, the Node ↔ `Request`/`Response` bridge, and settings from env or `.env` |
| `node/backup.mjs` | `npm run backup`: an online `VACUUM INTO` snapshot, an integrity check, gzip, keep 14 |
| `node/sql.mjs` | `npm run sql -- "<SQL>"`: moderation queries against the live database |
| `deploy/Dockerfile`, `deploy/docker-compose.yml`, `deploy/Caddyfile`, `deploy/.env.example` | The container (node:22-alpine, non-root, `/data` volume) plus Caddy with automatic HTTPS |
| `deploy/nightly-backup.sh` | The cron job: backup, then copy off-site with rclone |
| `deploy/earth-api.service`, `deploy/earth-api-backup.{service,timer}` | systemd units, for running without Docker |

### Step 1: Oracle account: what's free, and the catches

As of October 2026 (checked against secondary sources, because Oracle's docs weren't reachable from the build environment; confirm at <https://www.oracle.com/cloud/free/>):

- **Arm (Ampere A1) VMs: 2 OCPUs and 12 GB RAM in total**, split across up to a few VMs. Oracle **halved this from 4 OCPUs / 24 GB** in mid-2026 and has enforced the new limit since **18 August 2026**. Instances above the allowance get terminated, so stay inside it.
- **2 AMD micro VMs** (VM.Standard.E2.1.Micro: 1/8 OCPU, 1 GB). That's enough for this API too, as a fallback.
- **200 GB block storage** in total (each VM's boot volume, 47–50 GB by default, counts toward it), and **10 TB outbound traffic a month**.
- **A credit or debit card is required** at sign-up for identity verification. You may see a small temporary authorization. Always Free resources are not charged.
- **Home region:** you pick it once and can't change it, and Always Free VMs live only there. Pick one near most players (e.g. Frankfurt or London for Europe, Ashburn for the US). Popular regions often answer "Out of host capacity" for Arm VMs. Retry later, try another availability domain, or use the AMD micro shape.
- **Idle reclamation, the big catch.** Oracle may stop an Always Free VM if, over 7 days, its 95th-percentile CPU use is under 20%, network use is under 20%, and (for Arm) memory use is under 20%. A small leaderboard API **will** look idle. The fix: **upgrade the account to Pay As You Go** (console → Billing → Upgrade and manage payment). Always Free resources stay free on PAYG, and PAYG accounts aren't subject to idle reclamation. Then immediately create a **budget alert** (Billing → Budgets → Create, e.g. $1/month, email alert at 1%) so any accidental paid resource shows up within a day. Don't use "fake load" scripts to look busy: they waste resources and break the spirit of the terms.

### Step 2: Create the VM (about 10 minutes)

1. Sign up at <https://signup.cloud.oracle.com/> and choose your home region. Then upgrade to Pay As You Go and set the $1 budget alert (step 1).
2. **Compute → Instances → Create instance**
   - Name: `earth-api`.
   - Image: **Canonical Ubuntu 24.04** (the aarch64 build is picked automatically for Arm).
   - Shape: **Ampere → VM.Standard.A1.Flex, 1 OCPU, 6 GB RAM**. That's plenty and leaves half the allowance free. Fallback: VM.Standard.E2.1.Micro.
   - Networking: "Create new virtual cloud network" + "Create new public subnet", and **Assign a public IPv4 address**.
   - SSH keys: upload your public key (`~/.ssh/id_ed25519.pub`; make one with `ssh-keygen -t ed25519` if needed).
   - Boot volume: leave the default size.
3. When it's running, copy the **Public IP address** and log in: `ssh ubuntu@<public-ip>`.
   The public IP normally stays the same across stops and restarts, but not if you terminate the VM. To make it permanent, convert it to a reserved IP (Networking → IP management → Reserved public IPs).

### Step 3: Open ports 80 and 443 in both places

You need **both** steps below. Missing either one is the usual reason Caddy can't get a certificate.

1. **VCN security list** (Oracle's cloud firewall): Networking → Virtual cloud networks → your VCN → Subnets → the public subnet → **Default Security List** → **Add Ingress Rules**. Add three rules, each with source CIDR `0.0.0.0/0`:
   - IP protocol TCP, destination port `80` (needed for Let's Encrypt and the HTTP → HTTPS redirect)
   - IP protocol TCP, destination port `443`
   - IP protocol UDP, destination port `443` (HTTP/3, optional)
2. **The OS firewall.** Oracle's Ubuntu images ship with **iptables rules that reject everything except SSH**, and `ufw` doesn't show them. That's the well-known gotcha. Insert the rules *before* the final `REJECT` line and save them:
   ```bash
   sudo iptables -L INPUT -n --line-numbers          # note the line number of the REJECT rule (often 5 or 6)
   sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80  -j ACCEPT
   sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo iptables -I INPUT 5 -m state --state NEW -p udp --dport 443 -j ACCEPT
   sudo netfilter-persistent save                    # keep them after a reboot
   sudo iptables -L INPUT -n --line-numbers          # check: the three ACCEPTs come before REJECT
   ```
   Use the REJECT line's number in place of `5` if it differs. Docker adds its own forwarding rules when it starts, but the INPUT rules above are still needed for Caddy and for the systemd setup. Don't run `ufw enable` on top of this. One firewall tool is enough.

### Step 4: DNS name for the API

At your domain registrar, add an **A record**: name `api`, value `<public-ip>`, TTL 300. This gives `api.<domain>`. Check it from your PC with `nslookup api.<domain>` before the next step, since Caddy needs the name to resolve to get a certificate.

**No domain yet?** The GitHub Pages site is HTTPS, so browsers block a plain-HTTP API, which means you need *some* name with a certificate. A free stopgap is a [DuckDNS](https://www.duckdns.org/) subdomain (e.g. `earth-api.duckdns.org`) pointed at the VM's IP. Caddy gets a normal certificate for it. Switch to `api.<domain>` when you buy the domain by changing `API_DOMAIN` and `API_BASE`.

### Step 5: Install Docker and start the API

```bash
# on the VM
sudo apt-get update && sudo apt-get -y upgrade
curl -fsSL https://get.docker.com | sudo sh          # Docker Engine + compose plugin (official script)
sudo usermod -aG docker ubuntu && exit               # log out, then ssh back in so the group applies

git clone https://github.com/john-redman/earth-interactive.git
#   private repo? Run `sudo apt-get install -y gh && gh auth login` first, or clone with a read-only
#   fine-grained personal access token: https://<token>@github.com/john-redman/earth-interactive.git
cd earth-interactive/server/deploy
cp .env.example .env
nano .env                    # API_DOMAIN=api.<domain>   ALLOWED_ORIGINS=https://john-redman.github.io,<custom site origin>
mkdir -p data && sudo chown 1000:1000 data           # the container runs as uid 1000 (`node`)
docker compose up -d --build                         # builds the image, starts api + caddy
docker compose ps                                    # api should turn "healthy" within ~30 s
docker compose logs caddy | grep -i certificate      # "certificate obtained successfully"
curl https://api.<domain>/api/health                 # → {"ok":true,"db":true}
```

Both containers restart automatically after a crash or a reboot (`restart: unless-stopped`; Docker starts on boot). The database is `server/deploy/data/earth.db`, and the schema is created on first start. Ubuntu installs security updates by itself (`unattended-upgrades`). Reboot now and then when `ssh` login says "System restart required".

**Update to a new version:** `cd ~/earth-interactive && git pull && cd server/deploy && docker compose up -d --build`. The data survives because it's on the `./data` volume.

### Step 6: Point the site at it

In `js/net/api.js`, set `export const API_BASE = 'https://api.<domain>';`, then commit and push to `main`. GitHub Pages redeploys and the leaderboard appears. When the site later moves to a custom domain, add that origin to `ALLOWED_ORIGINS` in `.env` and run `docker compose up -d`.

### Step 7: Nightly backups, off the server, for free

`node/backup.mjs` uses SQLite's `VACUUM INTO`. It makes a consistent copy while the API keeps running, checks it (`PRAGMA quick_check`), gzips it (a few hundred KB at launch) into `data/backups/earth-<UTC stamp>.db.gz` and keeps the newest 14. A backup that stays on the same VM doesn't protect against losing the VM, so also copy it somewhere else.

**Simplest free off-site copy: your Google Drive with rclone** (15 GB free; the backups use a tiny fraction). A private GitHub repo also works, but committing a binary database every night makes the repo grow forever, and git isn't built for that.

```bash
# on the VM
curl https://rclone.org/install.sh | sudo bash       # Ubuntu's apt package is often too old for Drive
rclone config
#   n (new remote) → name: gdrive → storage: drive → client_id/secret: leave empty
#   → scope: drive.file (rclone sees only files it created) → service account: empty → advanced: n
#   → "Use web browser to authenticate?": n (the VM has no browser). rclone prints a command like
#     rclone authorize "drive" "eyJ…"   → run it on your own PC (install rclone there first);
#     sign in with the Google account, then paste the token it prints back into the VM → shared drive: n → y
rclone mkdir gdrive:earth-interactive-backups
~/earth-interactive/server/deploy/nightly-backup.sh   # test run: "backup copied to gdrive:…"
crontab -e                                            # add this line (03:17 UTC every night):
17 3 * * * /home/ubuntu/earth-interactive/server/deploy/nightly-backup.sh >> /home/ubuntu/earth-backup.log 2>&1
```

The script never deletes Drive copies when local ones rotate out (it uses `copy`, not `sync`). It prunes Drive copies older than 60 days. Optional: create a free check at <https://healthchecks.io> (daily, 1-hour grace) and add `BACKUP_PING_URL=https://hc-ping.com/<uuid>` before the command in the cron line. If a night's backup fails, you get an email.

**Restore** (to the same or a brand-new VM, after steps 2–5):
```bash
cd ~/earth-interactive/server/deploy
rclone copy gdrive:earth-interactive-backups/earth-<stamp>.db.gz data/backups/   # if the local copy is gone
docker compose stop api
gunzip -c data/backups/earth-<stamp>.db.gz > data/earth.db.new
rm -f data/earth.db-wal data/earth.db-shm && mv data/earth.db.new data/earth.db && sudo chown 1000:1000 data/earth.db
docker compose start api && curl https://api.<domain>/api/health
```
Try a restore once on your PC (`gunzip`, then `DB_PATH=./earth.db npm start` in `server/`). A backup you've never restored is a hope, not a backup.

### Step 8: Monitoring

Add a free **HTTP(s) monitor** at <https://uptimerobot.com> for `https://api.<domain>/api/health` (every 5 minutes, email alert). For extra safety, add a keyword check for `"db":true`. UptimeRobot has revised its free-plan terms before, so read the current terms. Better Stack's free tier is an alternative. A health check every 5 minutes is far below the rate limit. Also check `df -h` now and then; the disk will hold years of scores.

### Step 9: Without Docker (systemd)

The same server runs as a plain systemd service. You still need steps 1–4 and 6–8.
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs   # Node 22
sudo git clone https://github.com/john-redman/earth-interactive.git /opt/earth-interactive
sudo useradd --system --home /var/lib/earth-api --shell /usr/sbin/nologin earth
sudo cp /opt/earth-interactive/server/deploy/.env.example /etc/earth-api.env && sudo nano /etc/earth-api.env   # ALLOWED_ORIGINS
sudo cp /opt/earth-interactive/server/deploy/earth-api*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now earth-api earth-api-backup.timer
curl http://127.0.0.1:8787/api/health
# Caddy from its official apt repo: https://caddyserver.com/docs/install#debian-ubuntu-raspbian
sudo sed 's/{\$API_DOMAIN}/api.<domain>/' /opt/earth-interactive/server/deploy/Caddyfile | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
The service listens on `127.0.0.1:8787` only, with `TRUST_PROXY=1`, and can write nothing but `/var/lib/earth-api`. Backups go to `/var/lib/earth-api/backups` nightly between 03:17 and 03:27 server time (UTC on Oracle images), via the timer. For the off-site copy, use a cron line with `rclone copy /var/lib/earth-api/backups gdrive:earth-interactive-backups`. Update with `cd /opt/earth-interactive && sudo git pull && sudo systemctl restart earth-api`. Logs: `journalctl -u earth-api`.

### Step 10: Cheap fallbacks, honestly

- **A small paid VPS** (e.g. Hetzner Cloud). After Hetzner's 2026 price rises, its smallest plans list at about **€5.50–6 a month** (CX23 / CAX11), and they're sometimes sold out. Setup is identical (step 3 without the Oracle security list, then steps 4–8). You get no reclamation risk and a provider that wants your business. You still run the server.
- **A spare PC or Raspberry Pi at home.** $0 plus electricity, and the same Docker steps. Trade-offs: you need router port-forwarding for 80/443 and a dynamic-DNS name (DuckDNS's free updater) because home IPs change. Many ISPs use CGNAT, where inbound connections can't reach you at all. Uptime depends on your power and internet. You're also opening a port into your home network. Fine for testing, the weakest choice for production.
- **Option B (Cloudflare)** is the "no server" fallback. It's free up to about 1,500 daily players.

### Run it locally (any OS with Node 22+)

```bash
cd server
npm start                    # API on http://127.0.0.1:8787, database in server/data/earth.db (git-ignored)
# site at the repo root: npm run dev  → http://localhost:5173, then in the browser console:
localStorage.setItem('ei-api-base', JSON.stringify('http://localhost:8787')); location.reload();
```
No `npm install` is needed: the server uses only Node built-ins. (`npm install` in `server/` fetches wrangler, which only Option B needs.) Settings come from environment variables or `server/.env` (see `deploy/.env.example`). Real environment variables win over the file. Node 22 prints an "SQLite is experimental" warning, which the npm scripts and the Docker image silence. The built-in `node:sqlite` module is stable enough for this use, and the tests cover it.

## Option B: Cloudflare Workers + D1

Everything in `src/index.js` runs unchanged on Cloudflare. Use this if you'd rather not run a server. To move data from Option A, run `sqlite3 earth.db .dump > dump.sql` on a restored backup, then `npx wrangler d1 execute earth-interactive --remote --file=dump.sql` (drop the `CREATE TABLE` lines if you already ran the schema).

### Cloudflare free plan limits

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

### Set up on Cloudflare (one time, about 20 minutes)

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

**Local development with wrangler** (optional; `npm start` is simpler, see Option A → Run it locally):
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

**Self-hosted (Option A).** Run SQL against the live database with `node/sql.mjs`. It's safe while the API runs, and several `;`-separated statements run in one transaction. From `server/deploy` on the VM:
```bash
SQL="docker compose exec -T api node node/sql.mjs"      # systemd setup: cd /opt/earth-interactive/server && sudo -u earth env DB_PATH=/var/lib/earth-api/earth.db node node/sql.mjs
$SQL "SELECT p.name, s.score, s.duration_ms FROM scores s JOIN players p ON p.id = s.player_id
      WHERE s.game='daily' AND s.period='2026-10-05' ORDER BY s.score DESC, s.duration_ms LIMIT 20"
```
Take a backup first (`docker compose exec -T api node node/backup.mjs`). The queries below work the same way: replace `$DB` with `$SQL`.

**Cloudflare (Option B).** Every command below runs from `server/`. Use `--remote` for production or `--local` for your dev copy. Back up first with `npx wrangler d1 export earth-interactive --remote --output backup.sql`. D1 also has Time Travel, so you can restore to any minute in the last 7 days (free) or 30 days (paid): `npx wrangler d1 time-travel restore earth-interactive --timestamp=<unix or ISO time>`.

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

On Cloudflare, the D1 page in the dashboard also has a SQL console and a table browser, if you'd rather click than type. Self-hosted, you can open a restored backup in any SQLite GUI (e.g. DB Browser for SQLite) to browse it.

To change the word list, edit `js/net/profanity.js`. It's the one file used by both the browser and the Worker. Run `npm test` in `server/` and push. Then update the API: `git pull && docker compose up -d --build` on the VM (Option A), or `npm run deploy` (Option B).

## Privacy

- **No personal data:** no email, no account, no IP stored. A player is a random id in their own browser's `localStorage`, plus the name they chose.
- That id is the player's only "key", so the API never sends anyone else's id back. If someone clears their browser storage, they get a new id and need a new name (the old one stays taken). A "recovery code" (show the id once, let them paste it back) can be added later if people ask.
- The privacy policy should say something like: *"If you add your name to a leaderboard, we store that name, your game scores and a random identifier kept in your browser. We don't collect email addresses or other personal details. IP addresses are used only briefly to stop abuse and aren't stored. Ask us to delete your scores at <contact>."*
- Self-hosted: the Node server logs only errors, and the Caddyfile has no access log, because leaderboard URLs contain the player id. Docker keeps at most 30 MB of container logs. The backups contain the same data as the database: keep the Google Drive folder private.
- Cloudflare (Option B) processes requests, and its request logs (enabled via `[observability]`) include URLs, which contain the player id on leaderboard reads. Keep log retention short, or turn off observability if you don't need it.

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
2. **Permanent ranks and stats:** all-time or monthly tables built from `scores` (e.g. `SELECT player_id, SUM(score) … GROUP BY player_id` on a schedule (cron + `node/sql.mjs` self-hosted, or a Worker Cron Trigger), written to a `ranks` table), plus streaks from consecutive daily `period`s.
3. **Seasons:** a `period` like `2026-S1` or `2026-W41` in the same `scores` table, or a `seasons` table with start and end dates.
4. **New games** (flags, capitals, teacher mode): a new `game` string plus an entry in `GAMES`.
5. **Outgrowing one SQLite file** (unlikely before tens of thousands of daily players): first a bigger VM, then Postgres. The SQL is plain and `src/index.js` sees the database only through the small D1-style API, so it needs a new adapter like `src/d1-sqlite.js`. The browser only needs `API_BASE` changed.

## How it fits the static site

| Path | Published by GitHub Pages? | Why |
|---|---|---|
| `js/net/api.js`, `js/net/profanity.js`, `js/leaderboard.js`, `css/leaderboard.css` | **Yes**, automatically: `.github/workflows/pages.yml` copies all of `css/` and `js/` | The browser needs them |
| `server/` | **No**: the workflow copies only `index.html manifest.webmanifest sw.js og-image.png css js data vendor icons` + `LICENSE THIRD_PARTY_NOTICES.md` | API source: deployed separately, either built into the Docker image on your VM (Option A) or with `wrangler` (Option B) |

Notes for the codebase:
- `npm run check` (repo root) syntax-checks top-level `js/*.js` only, so `js/leaderboard.js` is covered but `js/net/*.js` isn't. To include it, extend `tools/check.mjs` to walk sub-folders. `server/` has its own `npm test`.
- For offline caching, add `'js/leaderboard.js', 'js/net/api.js', 'js/net/profanity.js', 'css/leaderboard.css'` to `CORE` in `sw.js`. Without that they're cached on first use anyway (same-origin, stale-while-revalidate), and offline the board simply hides itself.
- The Docker image copies `js/net/profanity.js` next to `server/` (the build context is the repo root), and wrangler bundles the Worker with esbuild, which follows `server/src/profanity.js`'s re-export of `../../js/net/profanity.js`. That's how one file serves the browser and both server options (checked with `wrangler deploy --dry-run`, and `server/test/shared.test.mjs` guards it).
- **Tests:** `cd server && npm test` runs everything with no installs: the Worker against an in-memory SQLite, the real Node server on a random port against a temporary database file (name → score → leaderboard → health, rate limits, restart), the rate limiter and the backup/rotation.
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

Sources for the Cloudflare figures: [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers & Pages plans](https://www.cloudflare.com/plans/developer-platform/), [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [D1 free-tier cutoff report](https://omidsaffari.com/blog/cloudflare-d1-free-limits-queries-stop), [D1 free tier summary](https://freetier.co/articles/cloudflare-d1-free-tier-limits-pricing-and-alternatives).

Sources for Option A (Oracle's own docs weren't reachable from the build environment, so these figures come from Oracle's FAQ as indexed by search and from secondary reports; check them before relying on them): [Oracle Cloud Free Tier FAQ](https://www.oracle.com/cloud/free/faq/), [Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm), [InfoQ: Oracle halves Always Free A1 limits (July 2026)](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/), [Hacker News: enforced 18 August](https://news.ycombinator.com/item?id=49183750), [linuxiac on the A1 cut](https://linuxiac.com/oracle-quietly-cuts-free-tier-ampere-a1-resources-in-half/), [idle reclamation and PAYG](https://blog.51sec.org/2023/02/oracle-cloud-cleaning-up-idle-compute.html), [OCI free tier breakdown (200 GB, 10 TB)](https://fullmetalbrackets.com/blog/oci-free-tier-breakdown), [Hetzner 2026 price increases](https://northflank.com/blog/hetzner-cloud-server-price-increases), [Hetzner pricing Oct 2026](https://costgoat.com/pricing/hetzner).
