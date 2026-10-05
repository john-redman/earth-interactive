// 3D map pin that marks the selected country: a glossy head on a thin needle with a soft ring where it
// meets the ground. It drops in with a small bounce and keeps a constant on-screen size as you zoom.
import * as THREE from 'three';

const HEIGHT = 0.09; // needle + head, in globe radii at the reference camera distance
const Y = new THREE.Vector3(0, 1, 0);

/** Matcap gives the pin a lit, glossy look without adding lights to the scene. */
function matcap(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const base = new THREE.Color(hex);
  const grad = g.createRadialGradient(46, 40, 4, 64, 64, 64);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.18, '#' + base.clone().lerp(new THREE.Color('#ffffff'), 0.45).getHexString());
  grad.addColorStop(0.65, '#' + base.getHexString());
  grad.addColorStop(1, '#' + base.clone().multiplyScalar(0.35).getHexString());
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Pin {
  constructor(globe, { color = '#9d4dff' } = {}) {
    this.globe = globe;
    this.group = new THREE.Group(); this.group.visible = false; this.group.renderOrder = 6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), new THREE.MeshMatcapMaterial({ matcap: matcap(color), transparent: true }));
    head.position.y = 0.84;
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.006, 0.72, 10), new THREE.MeshMatcapMaterial({ matcap: matcap('#e8ecff'), transparent: true }));
    needle.position.y = 0.36;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.13, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004;
    // transparent (at full opacity) so the pin sorts after the country fills, which skip the depth test
    for (const m of [head, needle, ring]) m.renderOrder = 6;
    this.body = new THREE.Group(); this.body.add(needle, head);
    this.ring = ring;
    this.group.add(this.body, ring);
    globe.world.add(this.group);
    this.normal = new THREE.Vector3(); this.dir = new THREE.Vector3(); this.up = new THREE.Vector3(); this.headWorld = new THREE.Vector3();
    this.anim = null; this.scale = 1;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
  }

  /** Drop the pin at a unit vector on the globe. */
  show(dir) {
    this.normal.copy(dir).normalize();
    this.group.position.copy(this.normal);
    this.group.visible = true;
    this.t0 = performance.now();
    this.anim = !this.reduced.matches;
  }

  hide() { this.group.visible = false; this.anim = null; }
  get visible() { return this.group.visible; }

  tick(now) {
    if (!this.group.visible) return;
    // constant apparent size: scale with distance from the camera to the pin
    const d = this.globe.camera.position.distanceTo(this.normal);
    this.scale = HEIGHT * THREE.MathUtils.clamp(d / 2.2, 0.2, 1.6);
    this.group.scale.setScalar(this.scale);
    // lean towards screen-up so the pin reads as a pin, not a dot seen end-on
    this.up.setFromMatrixColumn(this.globe.camera.matrixWorld, 1);
    this.dir.copy(this.normal).multiplyScalar(0.55).addScaledVector(this.up, 0.85).normalize();
    if (this.dir.dot(this.normal) < 0.2) this.dir.copy(this.normal); // pin near the rim: stand straight up
    this.group.quaternion.setFromUnitVectors(Y, this.dir);
    if (this.anim) {
      const k = Math.min(1, (now - this.t0) / 520);
      const drop = 1 - k, bounce = Math.sin(k * Math.PI) * 0.12 * (1 - k);
      this.body.position.y = drop * drop * 1.6 + bounce;
      this.ring.scale.setScalar(0.4 + 0.6 * k);
      this.ring.material.opacity = 0.55 * k;
      if (k >= 1) { this.anim = false; this.body.position.y = 0; }
    }
  }

  /** World position of the pin head (for the DOM tag above it). */
  head(target = this.headWorld) {
    return target.copy(this.normal).addScaledVector(this.dir, this.scale * (this.body.position.y + 1.05));
  }
}
