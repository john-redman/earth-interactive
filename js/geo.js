// Geometry helpers: decoding, lon/lat ⇄ sphere, triangulation on the sphere, picking.
import * as THREE from 'three';

const DEG = Math.PI / 180;

/** Decode delta-encoded multipolygon → [[ [ [lon,lat], … ] ring, … ] polygon, … ] */
export function decodeGeom(enc, precision) {
  return enc.map(poly => poly.map(ring => {
    const out = []; let x = 0, y = 0;
    for (let i = 0; i < ring.length; i += 2) { x += ring[i]; y += ring[i + 1]; out.push([x / precision, y / precision]); }
    return out;
  }));
}

/** lon/lat (degrees) → unit-sphere xyz. lon 0 / lat 0 faces +Z, north is +Y. */
export function lonLatToVec3(lon, lat, r = 1, target = new THREE.Vector3()) {
  const cl = Math.cos(lat * DEG);
  return target.set(r * cl * Math.sin(lon * DEG), r * Math.sin(lat * DEG), r * cl * Math.cos(lon * DEG));
}
export function vec3ToLonLat(v) {
  const n = v.clone().normalize();
  return [Math.atan2(n.x, n.z) / DEG, Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) / DEG];
}

/** Insert points so no ring segment is longer than `step` degrees (keeps lines hugging the sphere). */
function densify(ring, step) {
  const out = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out; // open ring (no repeated closing point)
}

/** Douglas–Peucker in lon/lat (degrees). Closed ring in, simplified closed ring out. */
export function simplifyRing(ring, tol) {
  if (tol <= 0 || ring.length < 5) return ring;
  const keep = new Uint8Array(ring.length); keep[0] = keep[ring.length - 1] = 1;
  const tol2 = tol * tol, stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = ring[a], [bx, by] = ring[b], dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let worst = -1, wd = tol2;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i];
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const ex = px - ax - t * dx, ey = py - ay - t * dy, d = ex * ex + ey * ey;
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst > 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring;
}

/** Border rings simplified by `tol` degrees, then densified so long edges still hug the sphere. */
export function borderRings(multi, tol, step = 1) {
  return multi.flatMap(poly => poly.map(r => densify(simplifyRing(r, tol), step)).filter(r => r.length >= 2));
}

const isSeam = (a, b) =>
  (Math.abs(a[1]) > 89.9 && Math.abs(b[1]) > 89.9) ||
  (Math.abs(a[0]) > 179.9 && Math.abs(b[0]) > 179.9 && Math.sign(a[0]) === Math.sign(b[0]));

/**
 * Triangulate a multipolygon on the sphere.
 * Returns { positions: Float32Array (unit vectors), index: Uint32Array, rings: [[lon,lat]…] (densified, open) }
 */
export function triangulate(multi, { maxEdge = 6, ringStep = 1 } = {}) {
  const pos = []; const idx = []; const rings = [];
  const max2 = maxEdge * maxEdge;
  for (const poly of multi) {
    const dens = poly.map(r => densify(r, ringStep)).filter(r => r.length >= 3);
    if (!dens.length) continue;
    rings.push(...dens);
    const contour = dens[0].map(([x, y]) => new THREE.Vector2(x, y));
    const holes = dens.slice(1).map(r => r.map(([x, y]) => new THREE.Vector2(x, y)));
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(contour, holes); } catch { continue; }
    const pts = [...dens[0], ...dens.slice(1).flat()].map(p => p.slice());
    // subdivide large triangles (midpoints shared via edge map → no cracks between neighbours)
    const mid = new Map();
    const midpoint = (a, b) => {
      const k = a < b ? a + '_' + b : b + '_' + a;
      let m = mid.get(k);
      if (m === undefined) { m = pts.length; pts.push([(pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2]); mid.set(k, m); }
      return m;
    };
    // edge length on the sphere, not in raw degrees: a degree of longitude shrinks towards the poles
    // (raw degrees split Antarctica into ~200k triangles, two thirds of the whole map).
    // cos of the endpoint nearer the equator keeps this an upper bound along the parallel.
    const d2 = (a, b) => {
      const dx = (pts[a][0] - pts[b][0]) * Math.max(Math.cos(pts[a][1] * DEG), Math.cos(pts[b][1] * DEG)), dy = pts[a][1] - pts[b][1];
      return dx * dx + dy * dy;
    };
    // longest-edge bisection: only splits along the long side, so thin earcut slivers stay cheap
    const outTris = [];
    const stack = tris.map(t => [t[0], t[1], t[2]]);
    let guard = 0;
    while (stack.length) {
      const [a, b, c] = stack.pop();
      const ab = d2(a, b), bc = d2(b, c), ca = d2(c, a);
      const m = Math.max(ab, bc, ca);
      if (m > max2 && guard++ < 400000) {
        if (m === ab) { const k = midpoint(a, b); stack.push([a, k, c], [k, b, c]); }
        else if (m === bc) { const k = midpoint(b, c); stack.push([a, b, k], [a, k, c]); }
        else { const k = midpoint(c, a); stack.push([a, b, k], [k, b, c]); }
      } else outTris.push(a, b, c);
    }
    const base = pos.length / 3;
    const v = new THREE.Vector3();
    for (const [x, y] of pts) { lonLatToVec3(x, y, 1, v); pos.push(v.x, v.y, v.z); }
    for (const i of outTris) idx.push(base + i);
  }
  return { positions: new Float32Array(pos), index: new Uint32Array(idx), rings };
}

/** Border segment positions (pairs of xyz) at radius r, skipping pole/antimeridian seams. */
export function borderSegments(rings, r = 1) {
  const out = []; const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length];
      if (isSeam(p, q)) continue;
      lonLatToVec3(p[0], p[1], r, a); lonLatToVec3(q[0], q[1], r, b);
      out.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  return new Float32Array(out);
}

/** Walls for the "popped-out" puzzle piece: quads between radius r0 and r1 along every ring. */
export function wallGeometry(rings, r0, r1) {
  const pos = []; const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length];
      if (isSeam(p, q)) continue;
      lonLatToVec3(p[0], p[1], 1, a); lonLatToVec3(q[0], q[1], 1, b);
      pos.push(a.x * r1, a.y * r1, a.z * r1, b.x * r1, b.y * r1, b.z * r1, b.x * r0, b.y * r0, b.z * r0,
               a.x * r1, a.y * r1, a.z * r1, b.x * r0, b.y * r0, b.z * r0, a.x * r0, a.y * r0, a.z * r0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Area-weighted centroid on the unit sphere. */
export function sphereCentroid(positions, index) {
  const c = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < index.length; i += 3) {
    a.fromArray(positions, index[i] * 3); b.fromArray(positions, index[i + 1] * 3); d.fromArray(positions, index[i + 2] * 3);
    const area = t.subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).length();
    c.addScaledVector(a.add(b).add(d), area / 3);
  }
  return c.lengthSq() > 0 ? c.normalize() : new THREE.Vector3(0, 0, 1);
}

/** Local tangent frame at p (east, north, up) as a Matrix4 basis. */
export function frameAt(p, m = new THREE.Matrix4()) {
  const up = p.clone().normalize();
  let east = new THREE.Vector3(0, 1, 0).cross(up);
  if (east.lengthSq() < 1e-8) east.set(1, 0, 0);
  east.normalize();
  const north = up.clone().cross(east).normalize();
  return m.makeBasis(east, north, up);
}

/** Rotation moving `from` to `to` on the sphere while keeping north pointing north (like a true-size map). */
export function northUpRotation(from, to, q = new THREE.Quaternion()) {
  const Ff = frameAt(from), Ft = frameAt(to);
  const m = Ft.multiply(Ff.transpose());
  return q.setFromRotationMatrix(m);
}

/** Point-in-polygon (lon/lat planar, even-odd across all rings). */
export function pointInMulti(lon, lat, multi) {
  for (const poly of multi) {
    let inside = false;
    for (const ring of poly) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

export function bboxOf(multi) {
  const b = [180, 90, -180, -90];
  for (const poly of multi) for (const [x, y] of poly[0]) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  return b;
}

/** Ray ⇄ sphere (centre origin). Returns nearest hit point or null. */
export function raySphere(ray, r, target = new THREE.Vector3()) {
  const o = ray.origin, d = ray.direction;
  const b = o.dot(d), c = o.lengthSq() - r * r, disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return null;
  return target.copy(d).multiplyScalar(t).add(o);
}
/** Closest point on a sphere to a ray (for dragging past the globe's edge). */
export function rayClosestOnSphere(ray, r, target = new THREE.Vector3()) {
  const hit = raySphere(ray, r, target);
  if (hit) return hit;
  const t = -ray.origin.dot(ray.direction);
  return target.copy(ray.direction).multiplyScalar(t).add(ray.origin).setLength(r);
}
