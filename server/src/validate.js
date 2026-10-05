// Input validation for the API. Pure functions (no D1, no Request) so they can be tested with plain node.
import { cleanName, nameProblem, nameKey } from './profanity.js';

/**
 * Every game the API accepts. A future game only needs an entry here (and no schema change):
 *  rounds    — rounds per game; details.rounds must have exactly this many entries
 *  maxRound  — most points one round can give (js/quiz.js: 1000 for a correct click, 500 with a hint,
 *              round(1000·e^(−km/1500)) for a miss)
 *  once      — true: one score per player per period, later submissions are refused (Daily Challenge)
 *              false: the best score per player per period is kept (free play)
 *  minMsPerRound — anything faster is treated as scripted
 */
export const GAMES = {
  daily: { rounds: 5, maxRound: 1000, once: true, minMsPerRound: 1000 },
  classic: { rounds: 10, maxRound: 1000, once: false, minMsPerRound: 1000 },
};

export const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PERIOD = /^\d{4}-\d{2}-\d{2}$/;
const UNIT_KEY = /^[A-Z0-9_]{1,40}$/;   // ADM0_A3 codes or X_<SLUG> overlays
const DAY = 86400000;

export const isUuid = s => typeof s === 'string' && UUID.test(s);

/** 'YYYY-MM-DD' of a Date in UTC. */
export const utcDayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** A real calendar date in 'YYYY-MM-DD' form. */
export function isDayKey(s) {
  if (typeof s !== 'string' || !PERIOD.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && utcDayKey(d) === s;
}

/**
 * The quiz uses the player's local date. Local dates run from UTC−12 to UTC+14, so a fresh score's
 * period is always yesterday, today or tomorrow in UTC.
 */
export function isCurrentPeriod(period, now = new Date()) {
  if (!isDayKey(period)) return false;
  const diff = Math.round((Date.parse(period + 'T00:00:00Z') - Date.parse(utcDayKey(now) + 'T00:00:00Z')) / DAY);
  return Math.abs(diff) <= 1;
}

const fail = (error, message) => ({ ok: false, error, message });

/** Body of POST /api/name → { ok, value: { player, name, key } } or { ok: false, error, message }. */
export function validateNameBody(body) {
  if (!body || typeof body !== 'object') return fail('bad-request', 'Expected a JSON object.');
  if (!isUuid(body.player)) return fail('bad-player', 'Unknown player id.');
  const name = cleanName(body.name);
  const problem = nameProblem(name);
  if (problem) return fail(problem, 'Name not allowed.');
  return { ok: true, value: { player: body.player.toLowerCase(), name, key: nameKey(name) } };
}

/**
 * Body of POST /api/scores:
 *   { player, game, period, score, durationMs, details: { rounds: [{ k: 'FRA', pts: 870 }, …] } }
 * The score must equal the sum of the rounds, each round within the game's bounds, and the game
 * no faster than a person can play it.
 */
export function validateScoreBody(body, now = new Date()) {
  if (!body || typeof body !== 'object') return fail('bad-request', 'Expected a JSON object.');
  if (!isUuid(body.player)) return fail('bad-player', 'Unknown player id.');
  if (typeof body.game !== 'string' || !Object.hasOwn(GAMES, body.game)) return fail('bad-game', 'Unknown game.');
  const game = GAMES[body.game];
  if (!isCurrentPeriod(body.period, now)) return fail('bad-period', 'That game is not open any more.');

  const rounds = body.details?.rounds;
  if (!Array.isArray(rounds) || rounds.length !== game.rounds) return fail('bad-details', `Expected ${game.rounds} rounds.`);
  const keys = new Set();
  let sum = 0;
  for (const r of rounds) {
    if (!r || typeof r !== 'object' || !UNIT_KEY.test(r.k ?? '') || keys.has(r.k)) return fail('bad-details', 'Bad round.');
    if (!Number.isInteger(r.pts) || r.pts < 0 || r.pts > game.maxRound) return fail('bad-details', 'Bad round score.');
    keys.add(r.k); sum += r.pts;
  }
  const score = body.score;
  if (!Number.isInteger(score) || score < 0 || score > game.rounds * game.maxRound) return fail('bad-score', 'Score out of range.');
  if (score !== sum) return fail('bad-score', 'Score does not match the rounds.');

  const ms = body.durationMs;
  if (!Number.isInteger(ms) || ms < 0 || ms > MAX_DURATION_MS) return fail('bad-duration', 'Bad duration.');
  if (ms < game.rounds * game.minMsPerRound) return fail('too-fast', 'That was faster than humanly possible.');

  return {
    ok: true,
    value: {
      player: body.player.toLowerCase(), game: body.game, period: body.period, score, durationMs: ms,
      details: JSON.stringify({ rounds: rounds.map(r => ({ k: r.k, pts: r.pts })) }),   // only the fields we know
      once: game.once,
    },
  };
}

/** Query of GET /api/leaderboard. Any past period may be read; only current ones may be written. */
export function validateBoardQuery(params) {
  const game = params.get('game') || 'daily';
  if (!Object.hasOwn(GAMES, game)) return fail('bad-game', 'Unknown game.');
  const period = params.get('period');
  if (!isDayKey(period)) return fail('bad-period', 'period must be YYYY-MM-DD.');
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit') || '50', 10) || 50));
  const player = params.get('player');
  if (player && !isUuid(player)) return fail('bad-player', 'Unknown player id.');
  return { ok: true, value: { game, period, limit, player: player ? player.toLowerCase() : null } };
}

/** ALLOWED_ORIGINS is a comma-separated list. Returns the origin to echo back, or null. */
export function allowedOrigin(origin, list) {
  if (!origin) return null;
  const allowed = String(list || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}
