// Games: after a wrong answer, a line arcs from where you guessed to the right country, drawing itself
// in over a moment, with a small dot at your guess and the distance at the top of the arc.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { lineMaterial } from './countries.js';

const STEPS = 96;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const _v = new THREE.Vector3(), _c = new THREE.Vector3();

export class MissLine {
  constructor(globe, layer, stage) {
    this.globe = globe; this.layer = layer; this.obj = null;
    this.label = document.createElement('div');
    this.label.className = 'miss-km'; this.label.hidden = true;
    stage.append(this.label);
  }

  /** from, to: points on the unit sphere; km: distance shown on the label. */
  show(from, to, km) {
    this.hide();
    const a = from.clone().normalize(), b = to.clone().normalize();
    const ang = a.angleTo(b);
    const h = 0.012 + 0.16 * (ang / Math.PI);        // longer trips arc higher, like a flight path
    const q = new THREE.Quaternion().setFromUnitVectors(a, b), qi = new THREE.Quaternion(), pts = [], seg = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      _v.copy(a).applyQuaternion(qi.identity().slerp(q, t)).multiplyScalar(1.002 + h * Math.sin(Math.PI * t));
      pts.push(_v.toArray());
    }
    for (let i = 0; i < STEPS; i++) seg.push(...pts[i], ...pts[i + 1]); // one segment per step, so it can draw in
    const geom = new LineSegmentsGeometry().setPositions(seg);
    const lm = lineMaterial('#ffffff', { width: 2.6, opacity: 0.95 });
    this.layer.registerLineMaterial(lm);
    const line = new LineSegments2(geom, lm); line.renderOrder = 5;
    geom.instanceCount = 0;
    // a soft dot where you guessed
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.009, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }));
    dot.position.copy(a).multiplyScalar(1.003); dot.lookAt(_c.copy(a).multiplyScalar(2)); dot.renderOrder = 5;
    const group = new THREE.Group(); group.add(line, dot);
    this.globe.world.add(group);
    this.obj = { group, geom, lm, dot, t0: performance.now(), apex: a.clone().applyQuaternion(qi.identity().slerp(q, 0.5)).multiplyScalar(1 + h) };
    this.label.textContent = `${new Intl.NumberFormat('en-US').format(km)} km`;
  }

  hide() {
    const o = this.obj; if (!o) return;
    this.globe.world.remove(o.group);
    o.geom.dispose(); o.lm.dispose(); o.dot.geometry.dispose(); o.dot.material.dispose();
    this.layer.unregisterLineMaterial(o.lm);
    this.obj = null; this.label.hidden = true;
  }

  /** Every frame: draw the line in, keep the label on the arc's apex. */
  tick(now) {
    const o = this.obj; if (!o) return;
    const k = reduced.matches ? 1 : Math.min(1, (now - o.t0 - 350) / 900); // waits for the camera to start moving
    o.geom.instanceCount = Math.round(STEPS * (1 - Math.pow(1 - Math.max(0, k), 3)));
    const cam = this.globe.camera, { x: W, y: H } = this.globe.size;
    const visible = k >= 1 && _c.copy(o.apex).normalize().dot(_v.copy(cam.position).normalize()) > 0.15;
    this.label.hidden = !visible;
    if (visible) {
      _v.copy(o.apex).project(cam);
      this.label.style.transform = `translate(${Math.round((_v.x + 1) / 2 * W)}px, ${Math.round((1 - _v.y) / 2 * H)}px) translate(-50%, -140%)`;
    }
  }
}
