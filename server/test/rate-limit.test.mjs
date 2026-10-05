import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../node/rate-limit.js';

test('fixed-window limiter: per key, resets each period', async () => {
  let t = 1000;
  const rl = createRateLimiter({ limit: 2, periodMs: 60_000, now: () => t });
  const ok = async key => (await rl.limit({ key })).success;
  assert.equal(await ok('a'), true);
  assert.equal(await ok('a'), true);
  assert.equal(await ok('a'), false);
  assert.equal(await ok('b'), true, 'keys are independent');
  t += 60_000;
  assert.equal(await ok('a'), true, 'new window');
  assert.equal(rl.size, 1, 'old counters dropped');
});
