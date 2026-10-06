// The self-hosted server (node/server.mjs) on a random port against a temporary SQLite file, over real HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { utcDayKey } from '../src/validate.js';
import { readConfig } from '../node/config.js';

let hasSqlite = true;
try { await import('node:sqlite'); } catch { hasSqlite = false; }
const skip = !hasSqlite && 'node:sqlite not available';
const { start } = await import('../node/server.mjs');

const ORIGIN = 'https://john-redman.github.io';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TODAY = utcDayKey();
const daily = (player, pts) => ({
  player, game: 'daily', period: TODAY, score: pts * 5, durationMs: 42000,
  details: { rounds: ['FRA', 'DEU', 'BRA', 'IND', 'AUS'].map(k => ({ k, pts })) },
});

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ei-api-'));
const quiet = { error() {} };
const config = (dir, over = {}) => ({
  ...readConfig({}), port: 0, host: '127.0.0.1', dbPath: path.join(dir, 'earth.db'),
  allowedOrigins: `${ORIGIN},http://localhost:5173`, ...over,
});

function client(base) {
  return async (method, p, body, headers = {}) => {
    const res = await fetch(base + p, {
      method,
      headers: { Origin: ORIGIN, ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  };
}

test('node server end to end', { skip }, async t => {
  const dir = tempDir();
  let app = await start(config(dir), { log: quiet });
  let call = client(app.url);
  t.after(async () => { await app.close(); fs.rmSync(dir, { recursive: true, force: true }); });

  await t.test('health, HEAD, CORS, 404', async () => {
    const h = await call('GET', '/api/health');
    assert.equal(h.status, 200);
    assert.deepEqual(h.body, { ok: true, db: true });
    assert.equal(h.headers.get('access-control-allow-origin'), ORIGIN);
    const head = await fetch(app.url + '/api/health', { method: 'HEAD' });
    assert.equal(head.status, 200, 'uptime monitors may use HEAD');
    assert.equal((await call('OPTIONS', '/api/scores')).status, 204);
    assert.equal((await call('GET', '/api/health', undefined, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await call('GET', '/nope')).status, 404);
  });

  await t.test('database file uses WAL', () => {
    assert.equal(app.db.raw.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
    assert.ok(fs.existsSync(path.join(dir, 'earth.db')));
  });

  await t.test('name → score → leaderboard', async () => {
    assert.deepEqual((await call('POST', '/api/name', { player: A, name: 'Ada' })).body, { ok: true, name: 'Ada' });
    assert.equal((await call('POST', '/api/name', { player: B, name: 'ada' })).status, 409);
    assert.equal((await call('POST', '/api/name', { player: B, name: 'Ben' })).status, 200);
    const s = await call('POST', '/api/scores', daily(A, 700));
    assert.equal(s.status, 200);
    assert.deepEqual(s.body.me, { name: 'Ada', score: 3500, durationMs: 42000, rank: 1 });
    assert.equal((await call('POST', '/api/scores', daily(A, 900))).body.duplicate, true);
    await call('POST', '/api/scores', daily(B, 800));
    const board = await call('GET', `/api/leaderboard?game=daily&period=${TODAY}&limit=10&player=${A}`);
    assert.equal(board.status, 200);
    assert.deepEqual(board.body.top.map(r => [r.rank, r.name, r.score]), [[1, 'Ben', 4000], [2, 'Ada', 3500]]);
    assert.equal(board.body.me.rank, 2);
  });

  await t.test('oversized body is refused before parsing', async () => {
    const r = await call('POST', '/api/name', 'x'.repeat(200_000));
    assert.equal(r.status, 413);
  });

  await t.test('data survives a restart', async () => {
    await app.close();
    app = await start(config(dir), { log: quiet });
    call = client(app.url);
    const board = await call('GET', `/api/leaderboard?game=daily&period=${TODAY}`);
    assert.deepEqual(board.body.top.map(r => r.name), ['Ben', 'Ada']);
  });
});

test('rate limits per client IP (X-Forwarded-For only with TRUST_PROXY)', { skip }, async t => {
  const dir = tempDir();
  const proxied = await start(config(dir, { readPerMin: 2, trustProxy: true }), { log: quiet });
  const direct = await start(config(dir, { readPerMin: 2, trustProxy: false, dbPath: path.join(dir, 'b.db') }), { log: quiet });
  t.after(async () => { await proxied.close(); await direct.close(); fs.rmSync(dir, { recursive: true, force: true }); });

  const viaProxy = client(proxied.url);
  const ip = a => ({ 'X-Forwarded-For': `9.9.9.9, ${a}` });   // the last entry is the one our proxy added
  assert.equal((await viaProxy('GET', '/api/health', undefined, ip('1.1.1.1'))).status, 200);
  assert.equal((await viaProxy('GET', '/api/health', undefined, ip('1.1.1.1'))).status, 200);
  const r = await viaProxy('GET', '/api/health', undefined, ip('1.1.1.1'));
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('retry-after'), '60');
  assert.equal((await viaProxy('GET', '/api/health', undefined, ip('2.2.2.2'))).status, 200, 'other client unaffected');

  // Without TRUST_PROXY a forged header changes nothing: the socket address is used.
  const noTrust = client(direct.url);
  const forged = n => ({ 'X-Forwarded-For': `10.0.0.${n}`, 'CF-Connecting-IP': `10.0.1.${n}` });
  assert.equal((await noTrust('GET', '/api/health', undefined, forged(1))).status, 200);
  assert.equal((await noTrust('GET', '/api/health', undefined, forged(2))).status, 200);
  assert.equal((await noTrust('GET', '/api/health', undefined, forged(3))).status, 429);
});
