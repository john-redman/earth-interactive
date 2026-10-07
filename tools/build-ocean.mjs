/**
 * Bakes data/ocean.png: a small equirectangular map (W × H, lon −180…180 left to right, lat 90…−90 top to bottom)
 * that the ocean shader reads for its look. Generated from the coastlines in data/world.js; never hand-edit.
 *
 *   R  closeness to the coast (255 on the coast, 0 beyond ~400 km): light shallows along the shores
 *   G  crest density (0…255): a light baseline over open water, more where the sea is rough on average
 *   B  land mask
 *
 * Storminess starts from a wave model: the significant wave height for the climatological surface wind of each
 * latitude belt (westerlies, trades, doldrums), limited by the fetch (open water upwind before the coast; JONSWAP)
 * and capped at a fully developed sea (Pierson–Moskowitz), so enclosed seas and lee shores stay calm. The storm
 * tracks and notorious spots of published wave climatology (TRACKS, HOTSPOTS) then shape it along the belts.
 * It is a cosmetic map: nothing in it is shown as data.
 *
 *   node tools/build-ocean.mjs           (also run by `npm run build:data`)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 512, H = 256, DEG = Math.PI / 180, KM_PER_DEG = 111.2;
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

// ---------- storminess ----------
// annual-mean surface wind over the open ocean by latitude (m/s), and where it blows from
const WIND = [[-90, 6], [-68, 8], [-62, 10.3], [-55, 11], [-50, 10.8], [-45, 10], [-40, 9], [-35, 7.6], [-28, 6.6], [-15, 7.2], [-5, 5],
  [0, 4.5], [8, 6], [15, 7.2], [25, 6.2], [32, 6.4], [40, 7.4], [45, 8.4], [50, 9.1], [55, 9.4], [60, 8.8], [66, 7.6], [75, 6], [90, 5]];
const windAt = lat => {
  for (let i = 1; i < WIND.length; i++) if (lat <= WIND[i][0]) {
    const [a, ua] = WIND[i - 1], [b, ub] = WIND[i], k = (lat - a) / (b - a);
    return ua + (ub - ua) * k;
  }
  return 5;
};
const fromWest = lat => Math.abs(lat) > 32 && Math.abs(lat) < 66; // westerlies; trades and polar easterlies blow from the east
const g = 9.81, MAX_FETCH_KM = 4000;
const hs = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  const lat = latOf(y), U = windAt(lat), step = fromWest(lat) ? -1 : 1; // walk upwind
  const kmPerPx = 360 / W * KM_PER_DEG * Math.max(0.05, Math.cos(lat * DEG));
  for (let x = 0; x < W; x++) {
    if (land[y * W + x]) continue;
    let F = 0;
    for (let s = 1; F < MAX_FETCH_KM && s < W; s++) { if (land[y * W + (x + step * s + W * 4) % W]) break; F += kmPerPx; }
    const fetchLimited = 0.0016 * U * Math.sqrt(Math.max(F, kmPerPx) * 1000 / g); // JONSWAP
    const developed = 0.21 * U * U / g;                                          // Pierson–Moskowitz
    let h = Math.min(fetchLimited, developed);
    // sea ice: the Arctic basin and the Antarctic pack stay calm
    if (lat > 72) h *= Math.max(0, 1 - (lat - 72) / 4);
    if (lat < -62) h *= Math.max(0, 1 - (-62 - lat) / 6);
    hs[y * W + x] = h;
  }
}
// swell spreads storms out: a light blur, wider along the latitude than across it
const blur = (src, rx, ry) => {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let dy = -ry; dy <= ry; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -rx; dx <= rx; dx++) { const i = yy * W + (x + dx + W) % W; if (!land[i]) { s += src[i]; n++; } } }
    out[y * W + x] = n ? s / n : 0;
  }
  return out;
};
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// The belts alone are zonal. Real wave climatology peaks along the storm tracks and at a few notorious spots, so
// those are layered on from published climatology (centre lat/lon, spread in degrees across/along, strength).
const TRACKS = [ // multiply the belt
  [54, -30, 8, 32, 1.0],    // North Atlantic storm track, west of Ireland
  [48, -168, 8, 38, 0.95],  // North Pacific storm track, south of the Aleutians
  [-50, 60, 9, 55, 1.0],    // Southern Ocean, Indian sector (Kerguelen)
  [-52, -20, 9, 35, 0.85],  // Southern Ocean, Atlantic sector
  [-56, -125, 9, 45, 0.75], // Southern Ocean, Pacific sector
  [-58, -65, 4, 12, 1.0],   // Drake Passage / Cape Horn
  [-46, 140, 6, 25, 0.8],   // south of Australia
];
const HOTSPOTS = [ // added on top: famous rough water and the tropical cyclone belts (lighter)
  [-37, 25, 4, 9, 0.7],     // Agulhas current, Cape of Good Hope
  [-57, -66, 3, 8, 0.6],    // Drake Passage
  [46, -6, 3, 6, 0.5],      // Bay of Biscay
  [57, 3, 3, 6, 0.45],      // North Sea
  [58, -178, 4, 10, 0.55],  // Bering Sea
  [-40, 147, 2, 4, 0.4],    // Bass Strait
  [20, 132, 6, 16, 0.38],   // typhoon alley
  [21, -62, 6, 16, 0.32],   // Atlantic hurricane belt
  [15, 88, 4, 6, 0.25],     // Bay of Bengal cyclones
  [-17, 60, 5, 12, 0.28],   // south-west Indian Ocean cyclones
];
const blob = (lat, lon, [la, lo, sa, so, w]) => {
  const dlon = ((lon - lo + 540) % 360) - 180, dlat = lat - la;
  return w * Math.exp(-0.5 * ((dlat / sa) ** 2 + (dlon / so) ** 2));
};
const stormRaw = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x; if (land[i]) continue;
  const lat = latOf(y), lon = lonOf(x);
  const track = Math.min(1, TRACKS.reduce((s, t) => s + blob(lat, lon, t), 0));
  const spots = HOTSPOTS.reduce((s, t) => s + blob(lat, lon, t), 0);
  const ice = lat > 72 ? Math.max(0, 1 - (lat - 72) / 4) : lat < -62 ? Math.max(0, 1 - (-62 - lat) / 6) : 1;
  stormRaw[i] = Math.min(1, smooth(0.9, 2.1, hs[i]) * (0.35 + 0.65 * track) + spots * ice);
}
const stormSmooth = blur(stormRaw, 5, 2);

// ---------- write the PNG ----------
const raw = Buffer.alloc((W * 3 + 1) * H);
let rough = 0;
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    const i = y * W + x, o = y * (W * 3 + 1) + 1 + x * 3;
    // crest density: a light baseline over all open water, more along the storm tracks; the Southern Ocean belt is
    // toned down so the poles don't hog the crests, and the shallows stay calm
    const lat = latOf(y), south = 1 - 0.35 * smooth(-36, -50, lat);
    const storm = land[i] ? 0 : Math.min(1, (0.22 + 0.78 * stormSmooth[i] * south) * (1 - 0.8 * coast[i]) * (1 - 0.7 * Math.max(smooth(70, 78, lat), smooth(-62, -70, lat))));
    if (storm > 0.3) rough++;
    raw[o] = Math.round(coast[i] * 255); raw[o + 1] = Math.round(storm * 255); raw[o + 2] = land[i] * 255;
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
const sea = land.reduce((s, v) => s + (v ? 0 : 1), 0);
console.log(`✓ data/ocean.png ${W}×${H}, ${(png.length / 1024).toFixed(0)} KB, rough seas on ${(rough / sea * 100).toFixed(0)}% of ocean pixels`);
