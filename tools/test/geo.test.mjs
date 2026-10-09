// Sphere maths and the map data: conversions, decoding, point-in-polygon and triangulated areas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lonLatToVec3, vec3ToLonLat, decodeGeom, pointInMulti, triangulate } from '../../js/geo.js';
import data from '../../data/world.js';

const unit = (view, k) => data.views[view].units.find(u => u.k === k);
const multiOf = k => decodeGeom(data.geoms[unit('un', k).g], data.precision);

test('lon/lat ⇄ unit vector round-trips, including the poles and the date line', () => {
  for (const [lon, lat] of [[0, 0], [179.9, 10], [-179.9, -10], [12.5, 41.9], [-70, -33], [140, 89.5], [-60, -89.5]]) {
    const v = lonLatToVec3(lon, lat);
    assert.ok(Math.abs(v.length() - 1) < 1e-12);
    const [lo, la] = vec3ToLonLat(v);
    assert.ok(Math.abs(la - lat) < 1e-9, `lat ${lat}`);
    assert.ok(Math.abs(lo - lon) < 1e-9, `lon ${lon}`);
  }
});

test('every geometry decodes to closed rings inside the lon/lat range', () => {
  for (const enc of data.geoms) {
    for (const poly of decodeGeom(enc, data.precision)) for (const ring of poly) {
      assert.ok(ring.length >= 4);
      for (const [x, y] of ring) assert.ok(x >= -180.0001 && x <= 180.0001 && y >= -90.0001 && y <= 90.0001);
      const a = ring[0], b = ring[ring.length - 1];
      assert.ok(Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9, 'ring is closed');
    }
  }
});

test('capitals fall inside their own country and not in a neighbour', () => {
  const cases = [['FRA', 2.35, 48.86, 'DEU'], ['AUS', 149.13, -35.28, 'NZL'], ['BRA', -47.88, -15.79, 'ARG'], ['MNG', 106.92, 47.92, 'CHN'],
    ['CAN', -75.7, 45.42, 'USA'], ['KEN', 36.82, -1.29, 'TZA'], ['JPN', 139.69, 35.69, 'KOR'], ['RUS', 37.62, 55.76, 'UKR']];
  for (const [k, lon, lat, other] of cases) {
    assert.ok(pointInMulti(lon, lat, multiOf(k)), `${k} contains its capital`);
    assert.ok(!pointInMulti(lon, lat, multiOf(other)), `${other} does not contain ${k}'s capital`);
  }
  assert.ok(!data.views.un.units.some(u => pointInMulti(-30, 0, decodeGeom(data.geoms[u.g], data.precision))), 'mid-Atlantic is sea');
});

test('triangulated areas match each unit’s mapped area', () => {
  const R = 6371.0088;
  for (const k of ['FRA', 'RUS', 'BRA', 'IDN', 'CHL', 'NOR', 'FJI', 'GRL']) {
    const t = triangulate(multiOf(k));
    let a = 0;
    for (let i = 0; i < t.index.length; i += 3) {
      const p = j => [t.positions[t.index[i + j] * 3], t.positions[t.index[i + j] * 3 + 1], t.positions[t.index[i + j] * 3 + 2]];
      const [A, B, C] = [p(0), p(1), p(2)];
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      a += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
    }
    const km2 = a * R * R, want = unit('un', k).area;
    assert.ok(Math.abs(km2 / want - 1) < 0.03, `${k}: ${Math.round(km2)} km² vs ${want}`);
  }
});
