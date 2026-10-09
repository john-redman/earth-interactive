// Daily Challenge bookkeeping: the streak of days played in a row and the time to the next challenge.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.TZ = 'Europe/London'; // a zone with daylight saving, so the DST case below really crosses a change
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), clear: () => mem.clear() };
const { dailyStreak, untilTomorrow, todayKey } = await import('../../js/quiz.js');
const played = (...days) => { mem.clear(); for (const d of days) mem.set('ei-daily-' + d, JSON.stringify({ results: [], qs: [] })); };

test('streak: days in a row up to today, broken by a gap, across a month end', () => {
  played('2026-10-07', '2026-10-08', '2026-10-09');
  assert.equal(dailyStreak('2026-10-09'), 3);
  assert.equal(dailyStreak('2026-10-10'), 0, 'today not played yet');
  played('2026-10-05', '2026-10-07', '2026-10-08');
  assert.equal(dailyStreak('2026-10-08'), 2);
  played('2026-09-29', '2026-09-30', '2026-10-01');
  assert.equal(dailyStreak('2026-10-01'), 3);
  played('2026-12-31', '2027-01-01');
  assert.equal(dailyStreak('2027-01-01'), 2);
});

test('streak survives a daylight-saving change (UK clocks go back on 25 Oct 2026)', () => {
  played('2026-10-24', '2026-10-25', '2026-10-26');
  assert.equal(dailyStreak('2026-10-26'), 3);
});

test('time to the next challenge reads naturally', () => {
  assert.equal(untilTomorrow(new Date(2026, 9, 9, 18, 0)), 'in 6 h');
  assert.equal(untilTomorrow(new Date(2026, 9, 9, 23, 20)), 'in 40 min');
  assert.equal(untilTomorrow(new Date(2026, 9, 9, 23, 59, 50)), 'in 1 min');
  assert.equal(todayKey(new Date(2026, 0, 5)), '2026-01-05');
});
