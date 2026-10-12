// Tiny countries (Monaco, San Marino, Malta, Singapore, small islands): too small to see or hit even zoomed in.
// Each gets a small dot in its colour with a white ring, drawn while the country itself would be only a few pixels
// across (it fades out as the real outline gets big enough), and a tap or hover near a dot picks that country.
import * as THREE from 'three';

const TINY_KM2 = 25000;      // countries under this area get a marker
const SHOW_BELOW_PX = 7;     // marker shown while the country's radius on screen is under this (CSS px)…
const GONE_AT_PX = 12;       // …and gone once it reaches this
const DOT_PX = 11;           // marker diameter (CSS px)
const ZOOM_SHOW = 0.55, ZOOM_HIDE = 0.8; // camera distance / whole-globe distance: dots show below, gone above
const R = 6371;

export class TinyMarkers {
  constructor(globe, layer, compare) {
    this.globe = globe; this.layer = layer; this.compare = compare;
    this.view = null; this.items = []; this.points = null; this.off = false;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uFocal: { value: 1000 }, uCam: { value: new THREE.Vector3() }, uDpr: { value: 1 }, uFade: { value: 1 } },
      vertexShader: `
        attribute vec3 color; attribute float radius;
        uniform float uFocal, uDpr, uFade; uniform vec3 uCam;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec3 n = normalize(position);
          float facing = dot(n, normalize(uCam));
          float d = max(length(uCam - position), 1e-3);
          float px = radius * uFocal / d;                    // the country's own radius on screen (CSS px)
          vAlpha = uFade * (1.0 - smoothstep(${SHOW_BELOW_PX.toFixed(1)}, ${GONE_AT_PX.toFixed(1)}, px)) * smoothstep(0.15, 0.3, facing);
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position * 1.002, 1.0);
          if (vAlpha < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);  // off screen
          gl_PointSize = ${DOT_PX.toFixed(1)} * uDpr;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;     // 0 in the middle, 1 at the edge
          if (r > 1.0) discard;
          vec3 c = mix(vColor, vec3(1.0), smoothstep(0.62, 0.72, r));   // white ring
          gl_FragColor = vec4(c, vAlpha * (1.0 - smoothstep(0.86, 1.0, r)));
        }`,
    });
  }

  build() {
    const view = this.layer.view; this.view = view;
    if (this.points) { this.points.removeFromParent(); this.points.geometry.dispose(); }
    this.items = view.objects.filter(o => o.unit.area > 0 && o.unit.area < TINY_KM2).map(o => ({ o, at: this.compare.anchorFor(o).clone(), r: Math.sqrt(o.unit.area / Math.PI) / R }));
    const pos = new Float32Array(this.items.length * 3), col = new Float32Array(this.items.length * 3), rad = new Float32Array(this.items.length);
    const c = new THREE.Color();
    this.items.forEach((it, i) => { it.at.toArray(pos, i * 3); c.set(it.o.color).toArray(col, i * 3); rad[i] = it.r; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('radius', new THREE.BufferAttribute(rad, 1));
    this.points = new THREE.Points(g, this.mat);
    this.points.renderOrder = 2.7; this.points.frustumCulled = false;
    this.globe.world.add(this.points);
  }

  /** Hide the dots (data lens, compare: the pieces and colours say enough). */
  setHidden(off) { this.off = off; }

  focal() { const cam = this.globe.camera; return (this.globe.size.y / 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); }

  /** Every frame. */
  tick() {
    if (!this.layer.view) return;
    if (this.layer.view !== this.view) this.build();
    const u = this.mat.uniforms, cam = this.globe.camera;
    u.uFocal.value = this.focal(); u.uDpr.value = this.globe.renderer.getPixelRatio();
    this.globe.world.worldToLocal(u.uCam.value.copy(cam.position));
    const k = cam.position.length() / this.globe.fitDistance;   // zoomed out to the whole globe: no confetti
    const target = this.off ? 0 : 1 - THREE.MathUtils.smoothstep(k, ZOOM_SHOW, ZOOM_HIDE);
    u.uFade.value += (target - u.uFade.value) * 0.15;
    this.points.visible = u.uFade.value > 0.01;
  }

  /**
   * The tiny country whose dot is nearest to (x, y) on screen, within `slop` CSS px, if its dot is showing.
   * rect: the canvas's bounding rect.
   */
  near(x, y, rect, slop) {
    if (!this.points?.visible) return null;
    const cam = this.globe.camera, camL = this.globe.world.worldToLocal(cam.position.clone()), f = this.focal(), v = new THREE.Vector3();
    let best = null, bestD = slop;
    for (const it of this.items) {
      if (it.at.dot(camL.clone().normalize()) < 0.3) continue;
      const px = it.r * f / camL.distanceTo(it.at);
      if (px >= GONE_AT_PX) continue;                               // big enough now: the real outline takes taps
      v.copy(it.at).applyMatrix4(this.globe.world.matrixWorld).project(cam);
      const sx = rect.left + (v.x + 1) / 2 * rect.width, sy = rect.top + (1 - v.y) / 2 * rect.height;
      const d = Math.hypot(sx - x, sy - y);
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }
}
