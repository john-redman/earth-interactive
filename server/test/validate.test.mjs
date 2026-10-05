import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, isUuid, isDayKey, isCurrentPeriod, utcDayKey, validateNameBody, validateScoreBody, validateBoardQuery, allowedOrigin } from '../src/validate.js';

const NOW = new Date('2026-10-05T12:00:00Z');
const PLAYER = '3f2b8c1e-9a4d-4c7e-8b1a-2d3e4f5a6b7c';
const KEYS = ['FRA', 'DEU', 'BRA', 'IND', 'X_JAMMU_AND_KASHMIR', 'AUS', 'CAN', 'USA', 'CHN', 'RUS'];
const rounds = (n, pts = 800) => KEYS.slice(0, n).map(k => ({ k, pts }));
const daily = (over = {}) => ({ player: PLAYER, game: 'daily', period: '2026-10-05', score: 4000, durationMs: 60000, details: { rounds: rounds(5) }, ...over });

test('score bounds match js/quiz.js (5 and 10 rounds, 1000 per round)', () => {
  assert.equal(GAMES.daily.rounds * GAMES.daily.maxRound, 5000);
  assert.equal(GAMES.classic.rounds * GAMES.classic.maxRound, 10000);
});

test('ids and dates', () => {
  assert.equal(isUuid(PLAYER), true);
  assert.equal(isUuid('not-a-uuid'), false);
  assert.equal(isUuid(PLAYER + 'x'), false);
  assert.equal(isDayKey('2026-10-05'), true);
  assert.equal(isDayKey('2026-02-30'), false);
  assert.equal(isDayKey('2026-1-5'), false);
  assert.equal(utcDayKey(NOW), '2026-10-05');
});

test('period must be today ±1 day UTC (time zones)', () => {
  assert.equal(isCurrentPeriod('2026-10-04', NOW), true);
  assert.equal(isCurrentPeriod('2026-10-05', NOW), true);
  assert.equal(isCurrentPeriod('2026-10-06', NOW), true);
  assert.equal(isCurrentPeriod('2026-10-03', NOW), false);
  assert.equal(isCurrentPeriod('2026-10-07', NOW), false);
  // across a month boundary
  assert.equal(isCurrentPeriod('2026-11-01', new Date('2026-10-31T23:30:00Z')), true);
});

test('valid daily and classic submissions pass', () => {
  const d = validateScoreBody(daily(), NOW);
  assert.equal(d.ok, true);
  assert.equal(d.value.once, true);
  assert.deepEqual(JSON.parse(d.value.details), { rounds: rounds(5) });
  const c = validateScoreBody({ ...daily(), game: 'classic', score: 10000, durationMs: 90000, details: { rounds: rounds(10, 1000) } }, NOW);
  assert.equal(c.ok, true);
  assert.equal(c.value.once, false);
});

test('bad submissions are refused', () => {
  const cases = {
    'bad-player': daily({ player: 'abc' }),
    'bad-game': daily({ game: 'constructor' }),
    'bad-period': daily({ period: '2026-10-01' }),
    'bad-details': daily({ details: { rounds: rounds(4) } }),
    'bad-score': daily({ score: 4001 }),
    'too-fast': daily({ durationMs: 3000 }),
    'bad-duration': daily({ durationMs: -5 }),
  };
  for (const [code, body] of Object.entries(cases)) assert.equal(validateScoreBody(body, NOW).error, code, code);
  assert.equal(validateScoreBody(daily({ details: { rounds: [...rounds(4), { k: 'FRA', pts: 800 }] } }), NOW).error, 'bad-details', 'duplicate key');
  assert.equal(validateScoreBody(daily({ score: 5200, details: { rounds: [...rounds(4), { k: 'MEX', pts: 2000 }] } }), NOW).error, 'bad-details', 'round > 1000');
  assert.equal(validateScoreBody(daily({ details: { rounds: [...rounds(4), { k: 'MEX', pts: 799.5 }] } }), NOW).error, 'bad-details', 'fractional');
  assert.equal(validateScoreBody(null, NOW).error, 'bad-request');
});

test('name body', () => {
  assert.deepEqual(validateNameBody({ player: PLAYER.toUpperCase(), name: '  John   R ' }).value, { player: PLAYER, name: 'John R', key: 'johnr' });
  assert.equal(validateNameBody({ player: PLAYER, name: 'sh1t' }).error, 'profane');
  assert.equal(validateNameBody({ player: 'x', name: 'John' }).error, 'bad-player');
});

test('leaderboard query', () => {
  const q = s => validateBoardQuery(new URLSearchParams(s));
  assert.deepEqual(q('game=daily&period=2026-10-05').value, { game: 'daily', period: '2026-10-05', limit: 50, player: null });
  assert.equal(q('game=daily&period=2026-10-05&limit=999').value.limit, 100);
  assert.equal(q('game=daily&period=2020-01-01').ok, true, 'history is readable');
  assert.equal(q('game=nope&period=2026-10-05').error, 'bad-game');
  assert.equal(q('game=daily').error, 'bad-period');
  assert.equal(q(`game=daily&period=2026-10-05&player=bad`).error, 'bad-player');
});

test('CORS allow-list', () => {
  const list = 'https://john-redman.github.io, http://localhost:5173/';
  assert.equal(allowedOrigin('https://john-redman.github.io', list), 'https://john-redman.github.io');
  assert.equal(allowedOrigin('http://localhost:5173', list), 'http://localhost:5173');
  assert.equal(allowedOrigin('https://evil.example', list), null);
  assert.equal(allowedOrigin('https://john-redman.github.io.evil.example', list), null);
  assert.equal(allowedOrigin(null, list), null);
});
