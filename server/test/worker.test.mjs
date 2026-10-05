// End-to-end: the Worker's fetch handler against schema.sql in an in-memory SQLite (see d1-shim.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { utcDayKey } from '../src/validate.js';

let hasSqlite = true;
try { await import('node:sqlite'); } catch { hasSqlite = false; }
const { createD1 } = await import('./d1-shim.mjs');

const ORIGIN = 'https://john-redman.github.io';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const TODAY = utcDayKey();
const KEYS = ['FRA', 'DEU', 'BRA', 'IND', 'AUS', 'CAN', 'USA', 'CHN', 'RUS', 'MEX'];
const result = (player, game, pts, durationMs = 60000) => {
  const n = game === 'daily' ? 5 : 10;
  const rounds = KEYS.slice(0, n).map(k => ({ k, pts }));
  return { player, game, period: TODAY, score: pts * n, durationMs, details: { rounds } };
};

async function setup(env = {}) {
  const DB = await createD1();
  const e = { DB, ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`, ...env };
  const call = async (method, path, body, headers = {}) => {
    const req = new Request('https://api.test' + path, {
      method, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const res = await worker.fetch(req, e, { waitUntil() {} });
    return { status: res.status, headers: res.headers, body: res.status === 204 ? null : await res.json() };
  };
  return { call, DB };
}

test('worker end to end', { skip: !hasSqlite && 'node:sqlite not available' }, async t => {
  const { call, DB } = await setup();

  await t.test('health + CORS', async () => {
    const r = await call('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true, db: true });
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    const pre = await call('OPTIONS', '/api/scores');
    assert.equal(pre.status, 204);
    const evil = await call('GET', '/api/health', undefined, { Origin: 'https://evil.example' });
    assert.equal(evil.status, 403);
    assert.equal(evil.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal((await call('GET', '/api/nope')).status, 404);
    assert.equal((await call('GET', '/api/scores')).status, 405);
  });

  await t.test('names: claim, rename, taken, profane', async () => {
    assert.deepEqual((await call('POST', '/api/name', { player: A, name: 'Alice' })).body, { ok: true, name: 'Alice' });
    assert.equal((await call('POST', '/api/name', { player: A, name: 'Alice W' })).status, 200, 'rename');
    const taken = await call('POST', '/api/name', { player: B, name: 'alice_w' });
    assert.equal(taken.status, 409);
    assert.equal(taken.body.error, 'taken');
    assert.equal((await call('POST', '/api/name', { player: B, name: 'f u c k' })).body.error, 'profane');
    assert.equal((await call('POST', '/api/name', { player: B, name: 'Bob' })).status, 200);
    assert.equal((await call('POST', '/api/name', { player: C, name: 'Cara' })).status, 200);
    assert.equal((await call('POST', '/api/name', '{nope')).body.error, 'bad-json');
    assert.equal((await call('POST', '/api/name', { player: A, name: 'x'.repeat(5000) })).status, 413);
  });

  await t.test('scores: daily once, classic keeps best', async () => {
    const unknown = await call('POST', '/api/scores', result('44444444-4444-4444-8444-444444444444', 'daily', 500));
    assert.equal(unknown.body.error, 'no-player');

    const a = await call('POST', '/api/scores', result(A, 'daily', 800));
    assert.equal(a.status, 200);
    assert.deepEqual(a.body.me, { name: 'Alice W', score: 4000, durationMs: 60000, rank: 1 });
    const again = await call('POST', '/api/scores', result(A, 'daily', 1000));
    assert.equal(again.body.duplicate, true);
    assert.equal(again.body.me.score, 4000, 'first daily score stands');

    await call('POST', '/api/scores', result(B, 'daily', 900));
    await call('POST', '/api/scores', result(C, 'daily', 800, 30000));   // same score as A, faster → ahead

    await call('POST', '/api/scores', result(A, 'classic', 500));
    const better = await call('POST', '/api/scores', result(A, 'classic', 700));
    assert.equal(better.body.me.score, 7000);
    const worse = await call('POST', '/api/scores', result(A, 'classic', 100));
    assert.equal(worse.body.stored, false);
    assert.equal(worse.body.me.score, 7000, 'best classic score kept');

    assert.equal((await call('POST', '/api/scores', result(B, 'daily', 900, 1000))).body.error, 'too-fast');
    assert.equal((await call('POST', '/api/scores', { ...result(B, 'classic', 900), score: 9999 })).body.error, 'bad-score');
  });

  await t.test('leaderboard order, own rank, bans', async () => {
    const r = await call('GET', `/api/leaderboard?game=daily&period=${TODAY}&limit=10&player=${A}`);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.top.map(x => [x.rank, x.name, x.score]), [[1, 'Bob', 4500], [2, 'Cara', 4000], [3, 'Alice W', 4000]]);
    assert.equal(r.body.me.rank, 3);
    assert.equal(JSON.stringify(r.body).includes(B), false, 'never leaks other player ids');

    // moderation procedure from docs/backend.md: ban + delete the player's scores
    DB.raw.prepare('UPDATE players SET banned = 1 WHERE id = ?').run(B);
    DB.raw.prepare('DELETE FROM scores WHERE player_id = ?').run(B);
    const after = await call('GET', `/api/leaderboard?game=daily&period=${TODAY}&player=${A}`);
    assert.deepEqual(after.body.top.map(x => x.name), ['Cara', 'Alice W']);
    assert.equal(after.body.me.rank, 2);
    assert.equal((await call('POST', '/api/name', { player: B, name: 'Bobby' })).status, 403);

    const empty = await call('GET', '/api/leaderboard?game=classic&period=2020-01-01');
    assert.deepEqual(empty.body.top, []);
    assert.equal(empty.body.me, null);
  });

  await t.test('deleting a player removes their scores', async () => {
    DB.raw.prepare('DELETE FROM players WHERE id = ?').run(C);
    const n = DB.raw.prepare('SELECT COUNT(*) AS n FROM scores WHERE player_id = ?').get(C).n;
    assert.equal(n, 0);
  });
});

test('rate limit binding returns 429', { skip: !hasSqlite && 'node:sqlite not available' }, async () => {
  let calls = 0;
  const { call } = await setup({ RL_READ: { limit: async () => ({ success: ++calls <= 2 }) } });
  assert.equal((await call('GET', '/api/health')).status, 200);
  assert.equal((await call('GET', '/api/health')).status, 200);
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('Retry-After'), '60');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN, 'browser can read the 429');
});
