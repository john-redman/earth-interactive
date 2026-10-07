/**
 * Bakes data/ocean.png: a small equirectangular map (W × H, lon −180…180 left to right, lat 90…−90 top to bottom)
 * that the ocean shader reads for its look. Generated from the coastlines in data/world.js; never hand-edit.
 *
 *   R  closeness to the coast (255 on the coast, 0 beyond ~400 km): light shallows along the shores, and the
 *      swell lines fade out as they near land
 *   G  unused (0)
 *   B  land mask
 *
 * It is a cosmetic map: nothing in it is shown as data.
 *
 *   node tools/build-ocean.mjs           (also run by `npm run build:data`)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 512, H = 256, DEG = Math.PI / 180;
const { default: data } = await import(path.join(root, 'data/world.js'));

// ---------- land mask: scanline-fill every polygon of every unit (even-odd per polygon, so holes stay sea) ----------
const land = new Uint8Array(W * H);
const lonOf = x => (x + 0.5) / W * 360 - 180, latOf = y => 90 - (y + 0.5) / H * 180;
const decode = (enc, p) => enc.map(poly => poly.map(ring => {
  const out = []; let x = 0, y = 0;
  for (let i = 0; i < ring.length; i += 2) { x += ring[i]; y += ring[i + 1]; out.push([x / p, y / p]); }
  return out;
}));
const seen = new Set();
for (const v of Object.values(data.views)) for (const u of v.units) {
  if (seen.has(u.g)) continue; seen.add(u.g);
  for (const poly of decode(data.geoms[u.g], data.precision)) {
    for (let y = 0; y < H; y++) {
      const lat = latOf(y), xs = [];
      for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [x1, y1] = ring[j], [x2, y2] = ring[i];
        if ((y1 > lat) !== (y2 > lat)) xs.push(x1 + (lat - y1) / (y2 - y1) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.ceil((xs[k] + 180) / 360 * W - 0.5), b = Math.floor((xs[k + 1] + 180) / 360 * W - 0.5);
        for (let x = Math.max(0, a); x <= Math.min(W - 1, b); x++) land[y * W + x] = 1;
      }
    }
  }
}

// ---------- closeness to the coast (great-circle distance to the nearest land pixel within ~600 km) ----------
const SHELF_KM = 400, REACH = 9; // pixels searched each way (0.7° per pixel)
const coast = new Float32Array(W * H);
const hav = (la1, lo1, la2, lo2) => {
  const a = Math.sin((la2 - la1) * DEG / 2) ** 2 + Math.cos(la1 * DEG) * Math.cos(la2 * DEG) * Math.sin((lo2 - lo1) * DEG / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (land[y * W + x]) { coast[y * W + x] = 1; continue; }
  let best = Infinity;
  const lat = latOf(y), lon = lonOf(x), rx = Math.min(W / 2, Math.ceil(REACH / Math.max(0.15, Math.cos(lat * DEG))));
  for (let dy = -REACH; dy <= REACH; dy++) {
    const yy = y + dy; if (yy < 0 || yy >= H) continue;
    for (let dx = -rx; dx <= rx; dx++) {
      const xx = (x + dx + W) % W;
      if (land[yy * W + xx]) best = Math.min(best, hav(lat, lon, latOf(yy), lonOf(xx)));
    }
  }
  const t = Math.min(1, best / SHELF_KM);
  coast[y * W + x] = 1 - t * t * (3 - 2 * t); // smooth falloff
}

// ---------- write the PNG ----------
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    const i = y * W + x, o = y * (W * 3 + 1) + 1 + x * 3;
    raw[o] = Math.round(coast[i] * 255); raw[o + 1] = 0; raw[o + 2] = land[i] * 255;
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, body) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
  const tb = Buffer.concat([Buffer.from(type), body]), c = Buffer.alloc(4); c.writeUInt32BE(crc(tb));
  return Buffer.concat([len, tb, c]);
};
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(path.join(root, 'data/ocean.png'), png);
console.log(`✓ data/ocean.png ${W}×${H}, ${(png.length / 1024).toFixed(0)} KB`);
