// True-size comparison: countries pop out as curved puzzle pieces, sit side by side and can be dragged.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { borderSegments, wallGeometry, frameAt, northUpRotation, raySphere, rayClosestOnSphere, vec3ToLonLat, lonLatToVec3, pointInMulti, triangulate, sphereCentroid } from './geo.js';
import { PALETTE, borderColorFor, fillMaterial, lineMaterial } from './countries.js';

const ease = k => 1 - Math.pow(1 - k, 3);
const easeIO = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class Compare {
  constructor(globe, layer) {
    this.globe = globe; this.layer = layer;
    this.active = false; this.pieces = []; this.drag = null; this.order = 0;
    this.onChange = null;
  }

  /**
   * The part of a country that gets popped out: its main landmass plus anything close by.
   * Far-flung overseas parts (e.g. French Guiana for France) stay home so the comparison reads clearly.
   */
  shapeFor(o) {
    if (o._shape) return o._shape;
    const triArea = t => { let a = 0; const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
      for (let i = 0; i < t.index.length; i += 3) { A.fromArray(t.positions, t.index[i] * 3); B.fromArray(t.positions, t.index[i + 1] * 3); C.fromArray(t.positions, t.index[i + 2] * 3); a += B.sub(A).cross(C.sub(A)).length() / 2; } return a; };
    const polys = o.g.multi.map(poly => { const t = triangulate([poly]); return { poly, t, area: triArea(t), c: sphereCentroid(t.positions, t.index) }; });
    const total = polys.reduce((s, p) => s + p.area, 0);
    const main = polys.reduce((a, b) => (b.area > a.area ? b : a));
    let radius = 0; const v = new THREE.Vector3();
    for (const ring of main.t.rings) for (const [x, y] of ring) radius = Math.max(radius, lonLatToVec3(x, y, 1, v).angleTo(main.c));
    const reach = Math.max(radius * 1.6, 0.2);
    const kept = polys.filter(p => p.c.angleTo(main.c) <= reach);
    const multi = kept.map(p => p.poly);
    const tri = kept.length === polys.length ? o.g.tri : triangulate(multi);
    const keptArea = kept.reduce((s, p) => s + p.area, 0);
    o._shape = { multi, tri, centroid: sphereCentroid(tri.positions, tri.index), area: o.unit.area * keptArea / total, trimmed: keptArea < total * 0.995 };
    return o._shape;
  }

  /** Angular east-west extent of a shape around its own centroid (radians). */
  extent(shape) {
    const c = shape.centroid, F = frameAt(c), e = new THREE.Vector3(), n = new THREE.Vector3(), u = new THREE.Vector3();
    F.extractBasis(e, n, u);
    let xmin = 0, xmax = 0, ymin = 0, ymax = 0; const v = new THREE.Vector3();
    for (const ring of shape.tri.rings) for (let i = 0; i < ring.length; i += 2) {
      lonLatToVec3(ring[i][0], ring[i][1], 1, v);
      const z = v.dot(u), x = Math.atan2(v.dot(e), z), y = Math.atan2(v.dot(n), z);
      xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
    }
    return { xmin, xmax, ymin, ymax };
  }

  makePiece(o, hex, lift) {
    const thick = lift * 0.55;
    const shape = this.shapeFor(o);
    const tri = shape.tri;
    const topGeom = new THREE.BufferGeometry();
    topGeom.setAttribute('position', new THREE.BufferAttribute(tri.positions, 3)); // unit sphere; group scale lifts it
    topGeom.setIndex(new THREE.BufferAttribute(tri.index, 1));
    const top = new THREE.Mesh(topGeom, fillMaterial(hex, { opacity: 0.74, pieceId: this.pieceSeq = ((this.pieceSeq || 0) + 1) % 100 }));
    top.material.uniforms.uNight = { value: 0 }; // moved pieces ignore day/night
    const walls = new THREE.Mesh(wallGeometry(tri.rings, 1 - thick, 1), new THREE.MeshBasicMaterial({ color: borderColorFor(hex), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    const lm = lineMaterial(borderColorFor(hex), { width: 2 });
    const rim = new LineSegments2(new LineSegmentsGeometry().setPositions(borderSegments(tri.rings, 1.0006)), lm);
    this.layer.registerLineMaterial(lm);
    const group = new THREE.Group(); group.add(walls, top, rim);
    const shadowGeom = topGeom.clone();
    const shadow = new THREE.Mesh(shadowGeom, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
    shadow.scale.setScalar(1.003);
    const shadowGroup = new THREE.Group(); shadowGroup.add(shadow);
    this.globe.world.add(shadowGroup, group);
    const p = { o, shape, hex, group, shadowGroup, shadow, top, walls, rim, lm, lift, liftNow: 0, center: shape.centroid.clone(), ext: this.extent(shape) };
    this.raise(p);
    return p;
  }

  raise(p) {
    p.z = ++this.order;
    const base = 10 + p.z * 4;
    p.shadow.renderOrder = base; p.walls.renderOrder = base + 1; p.top.renderOrder = base + 2; p.rim.renderOrder = base + 3;
  }

  place(p, center, liftNow) {
    p.center.copy(center); p.liftNow = liftNow;
    const q = northUpRotation(p.shape.centroid, center);
    p.group.quaternion.copy(q); p.shadowGroup.quaternion.copy(q);
    p.group.scale.setScalar(1 + liftNow);
    p.shadow.material.opacity = 0.32 * (liftNow / p.lift);
  }

  /** Where the two pieces should sit: side by side, same latitude, centred on what the camera looks at. */
  layout() {
    const [A, B] = this.pieces;
    let [lon, lat] = vec3ToLonLat(this.globe.camera.position);
    lat = THREE.MathUtils.clamp(lat, -28, 28);
    const M = lonLatToVec3(lon, lat, 1);
    const E = new THREE.Vector3(0, 1, 0).cross(M).normalize();
    const wA = A.ext.xmax - A.ext.xmin, wB = B.ext.xmax - B.ext.xmin;
    const gap = Math.max(0.015, (wA + wB) * 0.08);
    const at = th => M.clone().multiplyScalar(Math.cos(th)).addScaledVector(E, Math.sin(th)).normalize();
    // shift so the pair as a whole is centred on M
    const total = wA + gap + wB, left = -total / 2;
    const thA = left - A.ext.xmin, thB = left + wA + gap - B.ext.xmin;
    const half = Math.max(total / 2, (Math.max(A.ext.ymax - A.ext.ymin, B.ext.ymax - B.ext.ymin)) * 0.75);
    return { M, a: at(thA), b: at(thB), half };
  }

  /** Finish a sink-back animation now (before starting something new on top of it). */
  flushEnd() { if (this.pendingCleanup) { const c = this.pendingCleanup; this.pendingCleanup = null; this.anim = null; c(); } }

  /** Colour of the first piece (the second avoids it). */
  hexFor(a) { return a.unit.c === 0 ? PALETTE[1] : PALETTE[a.unit.c] || PALETTE[1]; }

  /**
   * The first country of a comparison lifts out as soon as Compare is pressed, and can be dragged around
   * while the second is chosen. start() then reuses this piece.
   */
  preview(a) {
    this.flushEnd();
    if (this.active || this.previewPiece) this.end(true);
    const ext = this.extent(this.shapeFor(a));
    const lift = THREE.MathUtils.clamp((ext.xmax - ext.xmin) * 2 * 0.022, 0.0025, 0.028);
    const p = this.makePiece(a, this.hexFor(a), lift);
    this.pieces = [p]; this.previewPiece = p;
    this.layer.setSelected(null); this.layer.setHover(null); this.layer.setSockets([a.key]);
    this.globe.lockAuto = true; this.globe.controls.autoRotate = false;
    const t0 = performance.now();
    this.anim = now => { const k = Math.min(1, (now - t0) / 420); this.place(p, p.center, p.lift * ease(k)); if (k >= 1) this.anim = null; };
  }

  start(a, b) {
    this.flushEnd();
    const kept = this.previewPiece?.o === a ? this.previewPiece : null;
    if (kept) { this.previewPiece = null; this.pieces = []; } else if (this.active || this.previewPiece) this.end(true);
    this.active = true;
    let hexA = kept ? kept.hex : this.hexFor(a), hexB = PALETTE[b.unit.c] || PALETTE[3];
    if (hexB === hexA || b.unit.c === 0) hexB = hexA === PALETTE[4] ? PALETTE[3] : PALETTE[4];
    this.layer.setSelected(null); this.layer.setHover(null);
    this.layer.setDim([]); this.layer.setSockets([a.key, b.key]);
    // lift scales with the pair's size so tiny countries don't get towering walls
    const tmp = [this.extent(this.shapeFor(a)), this.extent(this.shapeFor(b))];
    const span = Math.max(tmp[0].xmax - tmp[0].xmin + tmp[1].xmax - tmp[1].xmin, 0.02);
    const lift = THREE.MathUtils.clamp(span * 0.022, 0.0025, 0.028);
    this.pieces = [kept ? Object.assign(kept, { lift }) : this.makePiece(a, hexA, lift), this.makePiece(b, hexB, lift)];
    this.globe.lockAuto = true; this.globe.controls.autoRotate = false;
    this.animateTo(this.layout(), true);
    this.emit();
  }

  animateTo(L, fly) {
    const [A, B] = this.pieces; const t0 = performance.now(); const ms = 1300;
    const from = [A.center.clone(), B.center.clone()], to = [L.a, L.b];
    const l0 = [A.liftNow, B.liftNow];
    if (fly) {
      const dist = THREE.MathUtils.clamp(1 + L.half * 4.2, 1.12, this.globe.fitDistance * 1.15);
      this.globe.controls.minDistance = Math.min(1.25, dist * 0.9);
      this.globe.flyTo(L.M, dist, 1300);
    }
    this.anim = now => {
      const k = Math.min(1, (now - t0) / ms);
      const pop = ease(Math.min(1, k * 2.2));          // pop out first…
      const move = easeIO(THREE.MathUtils.clamp((k - 0.15) / 0.85, 0, 1)); // …then glide into place
      this.pieces.forEach((p, i) => {
        const q = new THREE.Quaternion().setFromUnitVectors(from[i], to[i]);
        const c = from[i].clone().applyQuaternion(new THREE.Quaternion().slerp(q, move));
        this.place(p, c, l0[i] + (p.lift - l0[i]) * pop);
      });
      if (k >= 1) this.anim = null;
    };
  }

  resetPositions() { if (this.active) this.animateTo(this.layout(), true); }

  end(immediate = false) {
    if (!this.active && !this.previewPiece) return;
    this.flushEnd();
    const pieces = this.pieces; this.pieces = []; this.active = false; this.drag = null; this.previewPiece = null;
    const cleanup = () => {
      for (const p of pieces) {
        this.globe.world.remove(p.group, p.shadowGroup);
        p.group.traverse(c => { c.geometry?.dispose?.(); c.material?.dispose?.(); });
        p.shadow.geometry.dispose(); p.shadow.material.dispose();
        this.layer.unregisterLineMaterial(p.lm);
      }
      this.layer.setSockets([]); this.layer.setDim(null);
      this.globe.controls.minDistance = 1.25; this.globe.lockAuto = false;
    };
    if (immediate) { this.anim = null; cleanup(); this.emit(); return; }
    this.pendingCleanup = cleanup;
    // fly home: pieces glide back into their sockets, then sink
    const t0 = performance.now(), from = pieces.map(p => p.center.clone()), l0 = pieces.map(p => p.liftNow);
    this.anim = now => {
      const k = Math.min(1, (now - t0) / 900);
      const move = easeIO(Math.min(1, k * 1.3)), sink = ease(THREE.MathUtils.clamp((k - 0.55) / 0.45, 0, 1));
      pieces.forEach((p, i) => {
        const q = new THREE.Quaternion().setFromUnitVectors(from[i], p.shape.centroid);
        this.place(p, from[i].clone().applyQuaternion(new THREE.Quaternion().slerp(q, move)), l0[i] * (1 - sink));
      });
      if (k >= 1) { this.anim = null; this.pendingCleanup = null; cleanup(); }
    };
    this.emit();
  }

  /** Top-most piece under the ray, or null. */
  hitPiece(ray) {
    const sorted = [...this.pieces].sort((a, b) => b.z - a.z);
    const qi = new THREE.Quaternion();
    for (const p of sorted) {
      const hit = raySphere(ray, 1 + p.liftNow); if (!hit) continue;
      const local = hit.clone().applyQuaternion(qi.copy(p.group.quaternion).invert());
      const [lon, lat] = vec3ToLonLat(local);
      if (pointInMulti(lon, lat, p.shape.multi)) return { piece: p, point: hit.normalize() };
    }
    return null;
  }

  beginDrag(hit) {
    const p = hit.piece; this.anim = null;
    this.raise(p);
    p.liftNow = p.lift * 1.35; this.place(p, p.center, p.liftNow);
    this.drag = { p, H0: hit.point.clone(), T0: p.center.clone() };
  }
  dragTo(ray) {
    const d = this.drag; if (!d) return;
    const H = rayClosestOnSphere(ray, 1 + d.p.liftNow).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(d.H0, H);
    this.place(d.p, d.T0.clone().applyQuaternion(q), d.p.liftNow);
  }
  endDrag() {
    const d = this.drag; if (!d) return; this.drag = null;
    const p = d.p, t0 = performance.now(), l0 = p.liftNow;
    this.anim = now => { const k = Math.min(1, (now - t0) / 250); this.place(p, p.center, l0 + (p.lift - l0) * ease(k)); if (k >= 1) this.anim = null; };
  }

  emit() {
    if (!this.onChange) return;
    if (!this.active) return this.onChange(null);
    const [A, B] = this.pieces;
    this.onChange({ a: { o: A.o, hex: A.hex, area: A.shape.area, trimmed: A.shape.trimmed }, b: { o: B.o, hex: B.hex, area: B.shape.area, trimmed: B.shape.trimmed } });
  }

  tick(now) { this.anim?.(now); }
}
