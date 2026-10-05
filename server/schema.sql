-- EarthInteractive API schema (Cloudflare D1 = SQLite).
-- Apply:  npm run db:init:local   (wrangler dev)    |   npm run db:init:remote   (production)
-- Safe to re-run: every statement is IF NOT EXISTS.
-- Plain SQLite with no D1-only features, so it moves to Postgres/Supabase with minor type changes.

-- Anonymous players. `id` is a random UUID made by the browser and kept in localStorage; it is the
-- only "credential", so the API never returns another player's id. No email, no IP, no other PII.
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,                 -- client-generated UUID (lower-case)
  name       TEXT NOT NULL,                    -- display name as typed (cleaned, NFC)
  name_key   TEXT NOT NULL UNIQUE,             -- lower-case, accents and separators removed: one claim per name
  banned     INTEGER NOT NULL DEFAULT 0,       -- 1 = hidden from leaderboards, can't submit or rename
  created_at INTEGER NOT NULL,                 -- unix ms
  updated_at INTEGER NOT NULL                  -- unix ms, last rename
);

-- One row per player per game per period. A new game is just a new `game` string (and an entry in
-- server/src/validate.js GAMES); no schema change needed.
--   game   'daily' | 'classic' | future games ('flags', 'capitals', …)
--   period 'YYYY-MM-DD' (the player's local date, as the quiz uses it). A weekly or seasonal game can
--          use another key ('2026-W41', 'S1') in the same column.
-- daily  : first score per period wins, re-submits are refused (UNIQUE + ON CONFLICT DO NOTHING)
-- classic: the best score per period is kept (UNIQUE + ON CONFLICT DO UPDATE … WHERE better)
CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game        TEXT NOT NULL,
  period      TEXT NOT NULL,
  score       INTEGER NOT NULL CHECK (score >= 0),
  details     TEXT NOT NULL DEFAULT '{}',      -- JSON: { rounds: [{ k: 'FRA', pts: 870 }, …] }
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  created_at  INTEGER NOT NULL,                -- unix ms
  UNIQUE (player_id, game, period)
);

-- Leaderboard order: higher score, then faster, then earlier. The index matches the ORDER BY, so a
-- top-50 query reads ~50 rows instead of the whole day (D1 bills by rows read).
CREATE INDEX IF NOT EXISTS scores_board ON scores (game, period, score DESC, duration_ms ASC, created_at ASC);

-- A player's history ("my last 30 dailies", streaks later) is served by the UNIQUE (player_id, game,
-- period) index above, so no extra index (each index adds to rows written).
