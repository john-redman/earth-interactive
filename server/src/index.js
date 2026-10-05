// EarthInteractive API — a Cloudflare Worker in front of a D1 (SQLite) database.
//
//   GET  /api/health                                         → { ok, db }
//   POST /api/name         { player, name }                  → { ok, name }            claim or change a display name
//   POST /api/scores       { player, game, period, score, durationMs, details }
//                                                            → { ok, duplicate?, me }  submit a finished game
//   GET  /api/leaderboard?game=daily&period=YYYY-MM-DD&limit=50[&player=<uuid>]
//                                                            → { ok, game, period, top: [{ rank, name, score, durationMs }], me }
//
// Errors are { ok: false, error: '<code>', message } with a 4xx/5xx status. See docs/backend.md.
import { validateNameBody, validateScoreBody, validateBoardQuery, allowedOrigin } from './validate.js';

const MAX_BODY = 4096;          // bytes; a 10-round score is ~400
const BOARD_TTL = 30;           // seconds the top list is cached per data centre (saves D1 rows read)

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const allow = allowedOrigin(origin, env.ALLOWED_ORIGINS);
    // Browsers on other sites get no CORS headers and a 403. Requests without an Origin (curl, health
    // checks) are served: CORS protects users' browsers, it is not an access control for the API.
    if (origin && !allow) return json({ ok: false, error: 'origin', message: 'Origin not allowed.' }, 403);
    const cors = corsHeaders(allow);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(request, env, ctx);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      console.error(err);
      return json({ ok: false, error: 'server', message: 'Something went wrong.' }, 500, cors);
    }
  },
};

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const key = `${request.method} ${url.pathname.replace(/\/+$/, '')}`;
  switch (key) {
    case 'GET /api/health': return health(request, env);
    case 'POST /api/name': return claimName(request, env);
    case 'POST /api/scores': return submitScore(request, env, ctx, url);
    case 'GET /api/leaderboard': return leaderboard(request, env, ctx, url);
    default:
      return ['/api/health', '/api/name', '/api/scores', '/api/leaderboard'].includes(url.pathname)
        ? json({ ok: false, error: 'method', message: 'Method not allowed.' }, 405)
        : json({ ok: false, error: 'not-found', message: 'Not found.' }, 404);
  }
}

// ---------- helpers ----------

function corsHeaders(origin) {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

const bad = (v, status = 400) => json({ ok: false, error: v.error, message: v.message }, status);

/**
 * Per-IP rate limit through Cloudflare's Rate Limiting binding (wrangler.toml [[ratelimits]]).
 * Counters are kept per Cloudflare location and are approximate — good against floods and scripts,
 * not an exact quota. No binding (e.g. a test) → no limit. The IP is never stored.
 */
async function limited(request, env, binding) {
  const rl = env[binding];
  if (!rl) return null;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const { success } = await rl.limit({ key: `${binding}:${ip}` });
  return success ? null : json({ ok: false, error: 'rate-limit', message: 'Too many requests. Try again in a minute.' }, 429, { 'Retry-After': '60' });
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: json({ ok: false, error: 'too-large', message: 'Request too large.' }, 413) };
  try { return { body: JSON.parse(text) }; }
  catch { return { error: json({ ok: false, error: 'bad-json', message: 'Body must be JSON.' }, 400) }; }
}

const changes = res => res?.meta?.changes ?? res?.changes ?? 0;

// Cache API key for a top list. caches.default is a no-op on *.workers.dev and works on a custom domain.
const boardCacheKey = (url, game, period, limit) => new Request(`${url.origin}/__cache/leaderboard/${game}/${period}/${limit}`);
const edgeCache = () => (typeof caches !== 'undefined' && caches.default) || null;

// Leaderboard order: score ↓, duration ↑, created ↑ (matches the scores_board index).
const TOP_SQL = `
  SELECT p.name AS name, s.score AS score, s.duration_ms AS durationMs
  FROM scores s JOIN players p ON p.id = s.player_id
  WHERE s.game = ?1 AND s.period = ?2 AND p.banned = 0
  ORDER BY s.score DESC, s.duration_ms ASC, s.created_at ASC
  LIMIT ?3`;

const RANK_SQL = `
  SELECT p.name AS name, s.score AS score, s.duration_ms AS durationMs,
    1 + (SELECT COUNT(*) FROM scores o
         WHERE o.game = s.game AND o.period = s.period
           AND (o.score > s.score
             OR (o.score = s.score AND (o.duration_ms < s.duration_ms
             OR (o.duration_ms = s.duration_ms AND o.created_at < s.created_at))))) AS rank
  FROM scores s JOIN players p ON p.id = s.player_id
  WHERE s.player_id = ?1 AND s.game = ?2 AND s.period = ?3 AND p.banned = 0`;

// The COUNT reads only the scores_board index (cheap in D1 rows read); it does not check bans, so
// banning a player also deletes their scores (docs/backend.md → Moderation).
const rankOf = (env, player, game, period) => env.DB.prepare(RANK_SQL).bind(player, game, period).first();

// ---------- routes ----------

async function health(request, env) {
  const stop = await limited(request, env, 'RL_READ'); if (stop) return stop;
  const row = await env.DB.prepare('SELECT 1 AS up').first();
  return json({ ok: true, db: row?.up === 1 });
}

async function claimName(request, env) {
  const stop = await limited(request, env, 'RL_WRITE'); if (stop) return stop;
  const { body, error } = await readJson(request); if (error) return error;
  const v = validateNameBody(body);
  if (!v.ok) return bad(v);
  const { player, name, key } = v.value;

  const { results: rows } = await env.DB.prepare('SELECT id, banned FROM players WHERE id = ?1 OR name_key = ?2').bind(player, key).all();
  if (rows.some(r => r.id === player && r.banned)) return json({ ok: false, error: 'banned', message: 'This player is blocked.' }, 403);
  if (rows.some(r => r.id !== player)) return json({ ok: false, error: 'taken', message: 'Name already taken.' }, 409);

  const now = Date.now();
  try {
    await env.DB.prepare(`
      INSERT INTO players (id, name, name_key, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)
      ON CONFLICT (id) DO UPDATE SET name = excluded.name, name_key = excluded.name_key, updated_at = excluded.updated_at`)
      .bind(player, name, key, now).run();
  } catch (err) {
    // someone claimed the same name between the SELECT and the INSERT
    if (/UNIQUE/i.test(String(err?.message))) return json({ ok: false, error: 'taken', message: 'Name already taken.' }, 409);
    throw err;
  }
  return json({ ok: true, name });
}

async function submitScore(request, env, ctx, url) {
  const stop = await limited(request, env, 'RL_WRITE'); if (stop) return stop;
  const { body, error } = await readJson(request); if (error) return error;
  const v = validateScoreBody(body);
  if (!v.ok) return bad(v);
  const s = v.value;

  const player = await env.DB.prepare('SELECT banned FROM players WHERE id = ?1').bind(s.player).first();
  if (!player) return json({ ok: false, error: 'no-player', message: 'Choose a name first.' }, 404);
  if (player.banned) return json({ ok: false, error: 'banned', message: 'This player is blocked.' }, 403);

  const insert = `INSERT INTO scores (player_id, game, period, score, details, duration_ms, created_at)
                  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT (player_id, game, period)`;
  const res = await env.DB.prepare(s.once
    ? `${insert} DO NOTHING`
    : `${insert} DO UPDATE SET score = excluded.score, details = excluded.details, duration_ms = excluded.duration_ms,
         created_at = excluded.created_at
       WHERE excluded.score > scores.score OR (excluded.score = scores.score AND excluded.duration_ms < scores.duration_ms)`)
    .bind(s.player, s.game, s.period, s.score, s.details, s.durationMs, Date.now()).run();
  const stored = changes(res) > 0;

  // let the submitter see themselves straight away (this data centre's cached top list)
  const cache = edgeCache();
  if (stored && cache) for (const limit of [10, 50]) ctx?.waitUntil?.(cache.delete(boardCacheKey(url, s.game, s.period, limit)));

  const me = await rankOf(env, s.player, s.game, s.period);
  // daily: a second submit is refused but harmless (e.g. another tab) — report the stored result
  return json({ ok: true, stored, duplicate: s.once && !stored, me: me ?? null });
}

async function leaderboard(request, env, ctx, url) {
  const stop = await limited(request, env, 'RL_READ'); if (stop) return stop;
  const v = validateBoardQuery(url.searchParams);
  if (!v.ok) return bad(v);
  const { game, period, limit, player } = v.value;

  const cache = edgeCache();
  const ck = boardCacheKey(url, game, period, limit);
  let top = null;
  const hit = cache && await cache.match(ck);
  if (hit) top = await hit.json();
  else {
    const { results } = await env.DB.prepare(TOP_SQL).bind(game, period, limit).all();
    top = results.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, durationMs: r.durationMs }));
    if (cache) ctx?.waitUntil?.(cache.put(ck, new Response(JSON.stringify(top), { headers: { 'Cache-Control': `max-age=${BOARD_TTL}` } })));
  }
  const me = player ? await rankOf(env, player, game, period) : null;
  return json({ ok: true, game, period, top, me: me ?? null });
}
