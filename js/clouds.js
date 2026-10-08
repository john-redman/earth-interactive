// Very light clouds drifting slowly over the open ocean (desktop only). They follow the prevailing winds (westward in
// the trade-wind belts, eastward in the westerlies) and thin out well before the big landmasses; small islands
// don't count as land, so clouds drift over them instead of parting round every speck (G of data/ocean.png).
// One shell just above the sea, drawn after the country fills so it can veil a small island the way a real cloud does.
import * as THREE from 'three';
import { NOISE, OCEAN_MAP, LIGHT_DIR_VIEW } from './globe.js';
import { SKY } from './sun.js';

const R = 1.005;
const PERIOD = 300;            // s; the drift restarts each period, crossfaded so it never shears into streaks
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export class Clouds {
  constructor(globe) {
    this.globe = globe;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uMap: OCEAN_MAP, uSun: SKY.uSun, uNight: SKY.uNight, uLight: { value: LIGHT_DIR_VIEW } },
      vertexShader: /* glsl */`
        varying vec3 vPos; varying float vFace; varying vec3 vN;
        void main(){
          vPos = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vFace = dot(vN, normalize(-mv.xyz));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uOpacity; uniform sampler2D uMap; uniform vec3 uSun; uniform float uNight; uniform vec3 uLight;
        varying vec3 vPos; varying float vFace; varying vec3 vN;
        ${NOISE}
        float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * snoise(p); p = p * 2.07 + vec3(3.1, 7.7, 1.3); a *= 0.5; } return s; }
        vec3 turn(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
        float sky(vec3 P, float drift, float evolve){ vec3 q = turn(P, drift) * 3.4; return fbm(q + vec3(0.0, evolve, 0.0)); }
        void main(){
          if (vFace < 0.0) discard;
          vec3 P = normalize(vPos);
          float lat = asin(clamp(P.y, -1.0, 1.0)), lon = atan(P.x, P.z);
          float room = texture2D(uMap, vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5)).g;
          if (room < 0.004) discard;
          // prevailing winds: trades blow west in the tropics, westerlies east further out, calmer near the poles
          float a = abs(lat);
          float wind = mix(-0.7, 1.0, smoothstep(0.45, 0.6, a)) * (1.0 - 0.7 * smoothstep(1.05, 1.3, a));
          float ph1 = fract(uTime), ph2 = fract(uTime + 0.5);
          float w = abs(2.0 * ph1 - 1.0);                      // the layer that is about to restart weighs nothing
          float ev = uTime * 0.5;                               // and the clouds slowly change shape
          float c1 = sky(P, -wind * 0.32 * ph1, ev), c2 = sky(P + vec3(0.37, 0.11, 0.53), -wind * 0.32 * ph2, ev);
          float c = mix(c1, c2, w);
          float cover = smoothstep(0.08, 0.5, c);
          float wisp = smoothstep(-0.05, 0.35, c) * 0.35;      // a thin haze around the thicker parts
          float alpha = max(cover, wisp) * room * uOpacity * smoothstep(0.05, 0.35, vFace);
          float lit = 0.86 + 0.14 * max(dot(vN, uLight), 0.0);
          float day = smoothstep(-0.06, 0.12, dot(P, uSun));
          vec3 col = vec3(0.97, 0.98, 1.0) * lit * mix(1.0, mix(0.22, 1.0, day), uNight);
          gl_FragColor = vec4(col, alpha * mix(1.0, 0.45 + 0.55 * day, uNight));
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), this.mat);
    this.mesh.renderOrder = 2.9;       // after the fills (so a small island can sit under a cloud), under highlights
    globe.world.add(this.mesh);
  }

  /** Every frame: drift, and fade in and out with data lenses. */
  tick(now) {
    const hide = document.body.classList.contains('lens-on');
    const u = this.mat.uniforms;
    u.uOpacity.value += ((hide ? 0 : 0.34) - u.uOpacity.value) * 0.06;
    this.mesh.visible = u.uOpacity.value > 0.003;
    if (!reduced.matches) u.uTime.value = now / 1000 / PERIOD;
  }
}
