// Content tables and data rules: currents, data lenses, the game's question pool, country of the day.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENTS, OCEANS } from '../../js/currents.js';
import { buildLens, LENSES, LENS_ORDER, RAMP } from '../../js/lens.js';
import { countryOfTheDay } from '../../js/daily-country.js';
import data from '../../data/world.js';

test('currents: valid waypoints, no jumps that would bend the spline, sane labels', () => {
  assert.ok(CURRENTS.length >= 30);
  const D = Math.PI / 180;
  for (const c of CURRENTS) {
    assert.ok(c.name && c.path.length >= 2, c.name);
    assert.ok(['strong', 'moderate', 'weak'].includes(c.strength), c.name);
    assert.ok(c.speed > 0 && c.speed < 4, c.name);
    if (c.at != null) assert.ok(c.at > 0 && c.at < 1, c.name);
    if (c.side != null) assert.ok(c.side === 'left' || c.side === 'right', c.name);
    if (c.free != null) assert.ok(c.free >= 0 && c.free < 1, c.name);
    for (let i = 0; i < c.path.length; i++) {
      const [lon, lat] = c.path[i];
      assert.ok(lon >= -180 && lon <= 180 && lat > -80 && lat < 85, `${c.name} point ${i}`);
      if (!i) continue;
      const [lo0, la0] = c.path[i - 1];
      const cos = Math.sin(la0 * D) * Math.sin(lat * D) + Math.cos(la0 * D) * Math.cos(lat * D) * Math.cos((lon - lo0) * D);
      assert.ok(Math.acos(Math.min(1, cos)) / D < 25, `${c.name}: waypoints ${i - 1}→${i} are over 25° apart`);
    }
  }
  for (const o of OCEANS) assert.ok(o.name && Math.abs(o.at[0]) <= 180 && Math.abs(o.at[1]) < 90);
});

test('data lenses: quantile breaks rise, the extremes get the end colours, no data stays grey', () => {
  const objects = data.views.defacto.units.map(u => ({ key: u.k, unit: u, info: data.info[u.k] || {} }));
  assert.equal(buildLens('none', objects), null);
  for (const k of LENS_ORDER.filter(k => k !== 'none')) {
    const L = buildLens(k, objects);
    assert.equal(L.label, LENSES[k].label);
    for (let i = 1; i < L.breaks.length; i++) assert.ok(L.breaks[i] >= L.breaks[i - 1], `${k} breaks rise`);
    const withData = objects.filter(o => L.value(o) != null);
    const lo = withData.reduce((a, b) => (L.value(b) < L.value(a) ? b : a)), hi = withData.reduce((a, b) => (L.value(b) > L.value(a) ? b : a));
    assert.equal(L.color(lo), RAMP[0]); assert.equal(L.color(hi), RAMP[RAMP.length - 1]);
    const none = objects.find(o => o.unit.t === 'disputed');
    if (none) assert.equal(L.color(none), null, `${k}: disputed areas have no data`);
    assert.ok(L.source, `${k} names its source`);
  }
  // the legend says which year most figures are for
  assert.equal(buildLens('pop', objects).year, 2025);
  assert.equal(buildLens('gdppc', objects).year, 2024);
  assert.equal(buildLens('area', objects).year, null);
});

test('games: a large question pool of countries that exist in all three views', () => {
  const views = Object.values(data.views).map(v => new Map(v.units.map(u => [u.k, u])));
  const pool = data.views.defacto.units.filter(u => u.t === 'country' && views.every(m => m.get(u.k)?.t === 'country'));
  assert.ok(pool.length >= 150, String(pool.length));
  for (const minArea of [400e3, 150e3, 80e3, 50e3, 15e3, 5e3, 2e3]) assert.ok(pool.filter(p => p.area >= minArea).length >= 10, `tier ${minArea}`);
});

test('country of the day: a valid country every day for a year, and not stuck on a few', () => {
  const views = Object.values(data.views).map(v => new Map(v.units.map(u => [u.k, u])));
  const seen = new Set();
  for (let d = 0; d < 365; d++) {
    const t = new Date(Date.UTC(2027, 0, 1 + d));
    const day = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
    const k = countryOfTheDay(data, day);
    assert.ok(views.every(m => m.get(k)?.t === 'country') && data.info[k]?.pop, `${day}: ${k}`);
    seen.add(k);
  }
  assert.ok(seen.size > 120, `${seen.size} different countries in a year`);
});
