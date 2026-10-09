// The Sun's position (day & night) and the live world population.
import test from 'node:test';
import assert from 'node:assert/strict';
import { subsolarPoint } from '../../js/sun.js';
import { worldPopulation } from '../../js/popclock.js';

test('the Sun is over the equator at the equinox and the tropics at the solstices', () => {
  assert.ok(Math.abs(subsolarPoint(new Date(Date.UTC(2026, 2, 20, 14, 46)))[1]) < 0.3);
  assert.ok(Math.abs(subsolarPoint(new Date(Date.UTC(2026, 5, 21, 8, 24)))[1] - 23.44) < 0.1);
  assert.ok(Math.abs(subsolarPoint(new Date(Date.UTC(2026, 11, 21, 20, 50)))[1] + 23.44) < 0.1);
});

test('at noon UTC the Sun stands over Greenwich, give or take the equation of time', () => {
  for (let m = 0; m < 12; m++) {
    const [lon] = subsolarPoint(new Date(Date.UTC(2026, m, 15, 12)));
    assert.ok(Math.abs(lon) < 4.5, `month ${m + 1}: ${lon.toFixed(2)}°`);
  }
});

test('world population: the UN base on 1 July 2025, rising about 70 million a year', () => {
  const epoch = Date.UTC(2025, 6, 1), year = 365.2425 * 864e5;
  assert.equal(worldPopulation(epoch).now, 8_231_613_070);
  const growth = worldPopulation(epoch + year).now - worldPopulation(epoch).now;
  assert.ok(growth > 68e6 && growth < 71e6, String(growth));
  const p = worldPopulation(Date.UTC(2026, 9, 9, 15));
  assert.ok(p.born >= 0 && p.died >= 0 && p.born > p.died && p.born < 400_000);
});
