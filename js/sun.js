// Real-time day & night: where the Sun is overhead right now.
import * as THREE from 'three';
import { lonLatToVec3 } from './geo.js';

/** Shared shader uniforms (the ocean and every country read these). */
export const SKY = {
  uSun: { value: new THREE.Vector3(0, 0, 1) },   // world-space direction to the Sun
  uNight: { value: 1 },                            // day & night strength (0 = off, 1 = on)
};

const rad = Math.PI / 180;
/** Sub-solar point [lon, lat] in degrees for a Date (accurate to ~0.1°, plenty for a globe). */
export function subsolarPoint(date = new Date()) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;          // days since J2000.0
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;   // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * rad;                             // obliquity
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad;   // right ascension (deg)
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / rad;                // declination (deg)
  const gmst = (18.697374558 + 24.06570982441908 * d) * 15;              // Greenwich sidereal time (deg)
  let lon = (ra - gmst) % 360; if (lon > 180) lon -= 360; if (lon < -180) lon += 360;
  return [lon, dec];
}

export function updateSun(date = new Date()) {
  const [lon, lat] = subsolarPoint(date);
  lonLatToVec3(lon, lat, 1, SKY.uSun.value);
  return [lon, lat];
}
