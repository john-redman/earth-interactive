// Major surface currents drawn on the sea: dark lines whose dashes run with the flow, a quiet label on each
// (name, direction, typical speed) and the ocean names in the same type, larger. Decorative: nothing is clickable.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { lineMaterial } from './countries.js';
import { lonLatToVec3 } from './geo.js';

/**
 * Waypoints are [lon, lat] in the direction of flow, kept off the coasts. Speeds are typical surface speeds in m/s
 * (textbook figures; the strong western boundary currents peak higher; the Somali Current runs in the summer
 * monsoon). `major` labels stay when zoomed out; `at` places the label along the line (0…1); `side` is the side of
 * the flow the label sits on ('left' by default; 'right' keeps it off the coast); labels sharing a `group` show
 * one at a time (the one facing the camera most); `label: false` draws the line only.
 */
export const CURRENTS = [
  { name: 'Gulf Stream', side: 'right', strength: 'strong', speed: 2, warm: true, major: true, at: 0.62,
    path: [[-80.5, 25.5], [-79.8, 28], [-79.3, 31], [-76.5, 34], [-73, 36.2], [-68, 38.5], [-60, 40.5], [-50, 42]] },
  { name: 'North Atlantic Drift', strength: 'moderate', speed: 0.3, warm: true, at: 0.45,
    path: [[-47, 44.5], [-40, 47.5], [-30, 51], [-20, 54.5], [-12, 57.5], [-5, 61], [3, 64.5]] },
  { name: 'Labrador Current', strength: 'moderate', speed: 0.3, at: 0.4,
    path: [[-60, 64], [-58, 60], [-55, 56], [-52, 52.5], [-50, 48.5], [-50.5, 45]] },
  { name: 'East Greenland Current', strength: 'moderate', speed: 0.3, at: 0.5,
    path: [[-12, 77], [-16, 73], [-19, 70], [-27, 66.5], [-35, 63.5], [-42, 59.5]] },
  { name: 'Canary Current', side: 'right', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[-14, 42], [-15, 36], [-17, 30], [-19, 25], [-21, 20], [-23, 15.5]] },
  { name: 'North Equatorial Current', strength: 'moderate', speed: 0.3, at: 0.5,
    path: [[-25, 14], [-35, 14], [-45, 14.5], [-57, 15]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.5, at: 0.45,
    path: [[5, -2], [-5, -2.5], [-15, -3.5], [-25, -4.5], [-32, -6]] },
  { name: 'Brazil Current', strength: 'weak', speed: 0.3, warm: true, at: 0.5,
    path: [[-34, -10], [-36.5, -15], [-38, -20], [-40.5, -24], [-45, -28], [-50, -33], [-53, -37]] },
  { name: 'Benguela Current', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[17, -35], [15.5, -30], [12.5, -25], [10.5, -20], [8, -15], [4, -11]] },
  { name: 'Agulhas Current', strength: 'strong', speed: 2, warm: true, major: true, at: 0.45,
    path: [[37.5, -25], [34.5, -29], [31.8, -32.3], [28.5, -34.6], [25, -36.6], [21, -37.6], [18, -38.5]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5,
    path: [[-62, -57.5], [-45, -53.5], [-25, -51.5], [-5, -51], [15, -50], [38, -49]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5,
    path: [[52, -48.5], [72, -50.5], [92, -50.5], [112, -50.5], [132, -52], [152, -54]] },
  { name: 'Antarctic Circumpolar Current', group: 'acc', strength: 'moderate', speed: 0.5, major: true, at: 0.5,
    path: [[168, -56], [-172, -57.5], [-150, -58.5], [-130, -59], [-110, -59], [-90, -58.5], [-74, -58.5]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.5, at: 0.5,
    path: [[110, -12], [100, -12.5], [90, -13], [80, -13.5], [70, -14], [62, -14.5], [55, -14.5]] },
  { name: 'Somali Current', side: 'right', strength: 'strong', speed: 2, warm: true, major: true, at: 0.5,
    path: [[43.5, -3], [47, 1.5], [50, 5.5], [52.5, 9.5], [55, 12.5]] },
  { name: 'Kuroshio', side: 'right', strength: 'strong', speed: 1.5, warm: true, major: true, at: 0.5,
    path: [[123, 22], [125, 25.5], [129, 29], [133, 31.8], [137, 33.6], [141.5, 35.3], [146, 36.5], [153, 37]] },
  { name: 'North Pacific Current', strength: 'weak', speed: 0.2, warm: true, at: 0.5,
    path: [[158, 40], [170, 42], [-175, 43], [-160, 43.5], [-145, 44], [-134, 45]] },
  { name: 'California Current', side: 'right', strength: 'weak', speed: 0.2, at: 0.45,
    path: [[-129, 47], [-127, 41], [-124.5, 36], [-121, 31], [-117, 26], [-114, 20.5]] },
  { name: 'North Equatorial Current', strength: 'moderate', speed: 0.4, at: 0.5,
    path: [[-110, 14], [-130, 13.5], [-150, 13.5], [-170, 14], [170, 14], [150, 14], [130, 13.5]] },
  { name: 'Equatorial Counter Current', strength: 'moderate', speed: 0.4, warm: true, at: 0.42,
    path: [[135, 6], [155, 6.5], [180, 7], [-160, 7], [-130, 7.5], [-100, 7.5]] },
  { name: 'South Equatorial Current', strength: 'moderate', speed: 0.6, at: 0.5,
    path: [[-87, -2], [-100, -3], [-120, -3.5], [-140, -4], [-160, -5], [-180, -6], [168, -7.5]] },
  { name: 'Humboldt Current', strength: 'weak', speed: 0.2, at: 0.5,
    path: [[-76, -42], [-76.5, -36], [-75, -30], [-74, -24], [-77, -17], [-80.5, -11], [-83, -6]] },
  { name: 'East Australian Current', strength: 'strong', speed: 1, warm: true, major: true, at: 0.45,
    path: [[156, -20], [155, -25], [154.4, -28.5], [153.6, -32], [152.2, -35.5], [151, -38]] },
];

/** Ocean names: [lon, lat]; they follow the parallel through that point. */
export const OCEANS = [
  { name: 'North Pacific Ocean', at: [-160, 30] },
  { name: 'South Pacific Ocean', at: [-125, -27] },
  { name: 'North Atlantic Ocean', at: [-44, 26] },
  { name: 'South Atlantic Ocean', at: [-14, -22] },
  { name: 'Indian Ocean', at: [78, -25] },
  { name: 'Southern Ocean', at: [0, -62], group: 'southern' },
  { name: 'Southern Ocean', at: [120, -62], group: 'southern' },
  { name: 'Southern Ocean', at: [-120, -66], group: 'southern' },
  { name: 'Arctic Ocean', at: [-20, 84] },
];

const R = 1.002;                      // just above the sea, under the country fills
const COLOR = '#0a1c44';              // dark navy, a shade below the sea
const STYLE = {                       // line widths (CSS px), dash flow speed (globe radii per second)
  strong: { under: 4, dash: 2.4, flow: 0.022 },
  moderate: { under: 3, dash: 1.8, flow: 0.013 },
  weak: { under: 2.2, dash: 1.3, flow: 0.008 },
};
const phone = matchMedia('(max-width: 720px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const fmtSpeed = s => `${s < 1 ? s.toFixed(1) : s} m/s`;

/** A smooth curve through the waypoints, lifted onto the sphere. */
function sample(path) {
  const pts = path.map(([lon, lat]) => lonLatToVec3(lon, lat));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  let ang = 0; for (let i = 1; i < pts.length; i++) ang += pts[i - 1].angleTo(pts[i]);
  return { curve, n: Math.max(16, Math.round(ang * 160)) };
}

export class Currents {
  constructor(globe, layer, stage) {
    this.globe = globe;
    this.group = new THREE.Group();
    this.dashMats = [];
    const segs = { strong: [], moderate: [], weak: [] };
    this.labels = [];
    const box = document.createElement('div');
    box.className = 'ocean-labels'; box.setAttribute('aria-hidden', 'true');
    stage.querySelector('canvas')?.after(box) ?? stage.prepend(box);
    this.box = box;

    for (const c of CURRENTS) {
      const { curve, n } = sample(c.path);
      const pts = curve.getSpacedPoints(n).map(p => p.normalize().multiplyScalar(R));
      const s = segs[c.strength];
      for (let i = 0; i < pts.length - 1; i++) s.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      if (c.label === false) continue;
      const el = document.createElement('div');
      el.className = 'ocean-label cur' + (c.major ? ' major' : '');
      const meta = `${c.strength} · ${fmtSpeed(c.speed)}`;
      el.innerHTML = '<span class="arr"></span><span class="nm"></span><span class="meta"></span><span class="arr"></span>';
      el.children[1].textContent = c.name; el.children[2].textContent = meta;
      box.append(el);
      const at = c.at ?? 0.5;
      this.labels.push({ el, kind: 'current', major: !!c.major, group: c.group, right: c.side === 'right', anchor: curve.getPointAt(at).normalize(),
        ahead: curve.getPointAt(Math.min(1, at + 0.03)).normalize(), behind: curve.getPointAt(Math.max(0, at - 0.03)).normalize(), flip: null, last: {} });
    }
    for (const o of OCEANS) {
      const el = document.createElement('div');
      el.className = 'ocean-label ocean'; el.textContent = o.name;
      box.append(el);
      const [lon, lat] = o.at;
      this.labels.push({ el, kind: 'ocean', major: true, group: o.group, anchor: lonLatToVec3(lon, lat), ahead: lonLatToVec3(lon + 4, lat), behind: lonLatToVec3(lon - 4, lat), flip: null, last: {} });
    }

    for (const [k, pos] of Object.entries(segs)) {
      if (!pos.length) continue;
      const st = STYLE[k];
      const under = lineMaterial(COLOR, { width: st.under, opacity: 0.3 });
      const dash = lineMaterial(COLOR, { width: st.dash, opacity: 0.8, dashed: true });
      dash.dashSize = 0.016; dash.gapSize = 0.011;
      dash.userData.flow = st.flow;
      for (const m of [under, dash]) {
        layer.registerLineMaterial(m);
        const line = new LineSegments2(new LineSegmentsGeometry().setPositions(pos), m);
        line.renderOrder = -5;        // over the ocean (−10), under every country fill (1.x)
        if (m.dashed) line.computeLineDistances();
        this.group.add(line);
      }
      this.dashMats.push(dash);
    }
    globe.world.add(this.group);
    this.visible = true;
  }

  /** Show or hide the lines (the labels follow). */
  setVisible(on) { this.visible = on; }

  /** Every frame: run the dashes with the flow, keep the labels on their lines. */
  tick(now) {
    const lens = document.body.classList.contains('lens-on');
    const show = this.visible && !lens;
    this.group.visible = show;
    if (!show) { if (!this.box.hidden) this.box.hidden = true; return; }
    if (this.box.hidden) this.box.hidden = false;
    if (!reduced.matches) for (const m of this.dashMats) m.dashOffset = -(now / 1000) * m.userData.flow;

    const g = this.globe, cam = g.camera, { x: W, y: H } = g.size;
    const m = g.world.matrixWorld, dist = cam.position.length(), fit = g.fitDistance;
    // zoomed out: ocean names and the major currents; closer in: every current (phones need to come closer)
    const allAt = phone.matches ? 0.55 : 0.8;
    const minor = smooth(allAt + 0.08, allAt - 0.04, dist / fit);
    const best = this.best || (this.best = new Map()); best.clear();
    for (const L of this.labels) {
      _n.copy(L.anchor).applyMatrix4(m);
      L.facing = _c.copy(cam.position).sub(_n).normalize().dot(_n); // 0 on the horizon, 1 straight on
      if (L.group && L.facing > (best.get(L.group)?.facing ?? -2)) best.set(L.group, L);
    }
    for (const L of this.labels) {
      let op = (L.group && best.get(L.group) !== L) ? 0 : smooth(0.22, 0.5, L.facing) * (L.major ? 1 : minor);
      let x = 0, y = 0, deg = 0, flip = false;
      if (op > 0.01) {
        _n.copy(L.anchor).applyMatrix4(m).project(cam);
        _a.copy(L.behind).applyMatrix4(m).project(cam); _b.copy(L.ahead).applyMatrix4(m).project(cam);
        x = (_n.x + 1) / 2 * W; y = (1 - _n.y) / 2 * H;
        deg = Math.atan2(-(_b.y - _a.y) * H, (_b.x - _a.x) * W) * 180 / Math.PI; // screen angle of the flow
        flip = deg > 90 || deg < -90;
        if (flip) deg += deg > 0 ? -180 : 180;      // keep the text upright
        if (L.kind === 'current' && flip !== L.flip) {
          L.flip = flip;
          L.el.children[0].textContent = flip ? '←' : '';
          L.el.children[3].textContent = flip ? '' : '→';
        }
        if (x < -200 || x > W + 200 || y < -60 || y > H + 60) op = 0;
      } else op = 0;
      const last = L.last;
      if (op === 0) { if (last.op !== 0) { L.el.style.opacity = '0'; last.op = 0; } continue; }
      if (Math.abs(op - (last.op ?? -1)) > 0.02) { L.el.style.opacity = op.toFixed(2); last.op = op; }
      // above the line is left of the flow, or right of it once the text is turned upright
      const dy = L.kind === 'ocean' ? '-50%' : (L.right !== flip) ? '5px' : 'calc(-100% - 5px)';
      if (Math.abs(x - (last.x ?? -1e9)) > 0.4 || Math.abs(y - (last.y ?? -1e9)) > 0.4 || Math.abs(deg - (last.deg ?? 1e9)) > 0.3 || dy !== last.dy) {
        L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${deg.toFixed(1)}deg) translate(-50%, ${dy})`;
        last.x = x; last.y = y; last.deg = deg; last.dy = dy;
      }
    }
  }
}
