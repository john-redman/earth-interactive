// Compare → "Share image": a square post (1080 × 1080) with both countries drawn at true relative size,
// the size ratio, a few stats and the link. Drawn on a 2D canvas, so it never depends on the WebGL view.
import { vec3ToLonLat } from './geo.js';

const S = 1080;
const FONT = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
const R_KM = 6371.0088, DEG = Math.PI / 180;
const fmtInt = new Intl.NumberFormat('en-US');
const fmtCompact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const fmtArea = km2 => (km2 >= 1e6 ? (km2 / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : fmtInt.format(Math.round(km2))) + ' km²';

/** Lambert azimuthal equal-area around the shape's centre, in km: areas stay true, so sizes compare fairly. */
function project(multi, centroid) {
  const [l0, p0] = vec3ToLonLat(centroid).map(d => d * DEG), s0 = Math.sin(p0), c0 = Math.cos(p0);
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  const polys = multi.map(poly => poly.map(ring => ring.map(([lon, lat]) => {
    const l = lon * DEG - l0, p = lat * DEG, sp = Math.sin(p), cp = Math.cos(p);
    const k = Math.sqrt(2 / Math.max(1e-9, 1 + s0 * sp + c0 * cp * Math.cos(l)));
    const x = R_KM * k * cp * Math.sin(l), y = R_KM * k * (c0 * sp - s0 * cp * Math.cos(l));
    xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
    return [x, y];
  })));
  return { polys, w: xmax - xmin, h: ymax - ymin, cx: (xmin + xmax) / 2, cy: (ymin + ymax) / 2 };
}

/** A flag as an Image (the SVGs carry no size, which some browsers need for drawImage), or null. */
async function flagImage(iso2) {
  if (!iso2) return null;
  try {
    const svg = await (await fetch(new URL(`../vendor/flags/${iso2.toLowerCase()}.svg`, import.meta.url))).text();
    const sized = svg.replace('<svg', '<svg width="640" height="480"');
    const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
    const img = new Image(); img.src = url; await img.decode(); URL.revokeObjectURL(url);
    return img;
  } catch { return null; }
}

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * k));
  return `rgb(${c.join(',')})`;
}

/**
 * pair: { a: { o, hex, area, shape }, b: { … } } (shape: compare.shapeFor(o)); url: link printed at the bottom.
 * Returns a PNG Blob.
 */
export async function renderCompareImage(pair, url) {
  await Promise.all(['800', '700', '500'].map(w => document.fonts?.load(`${w} 40px "Plus Jakarta Sans"`).catch(() => {})));
  const [fa, fb] = await Promise.all([flagImage(pair.a.o.info.iso2), flagImage(pair.b.o.info.iso2)]);
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');

  // space backdrop with a light scatter of stars (seeded, so the same pair always looks the same)
  const bg = ctx.createRadialGradient(S / 2, S * 0.42, 40, S / 2, S / 2, S * 0.78);
  bg.addColorStop(0, '#141a4a'); bg.addColorStop(0.55, '#080b26'); bg.addColorStop(1, '#03040b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
  let seed = [...(pair.a.o.key + pair.b.o.key)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 140; i++) {
    const r = rnd() ** 5 * 1.8 + 0.5;
    ctx.globalAlpha = 0.2 + rnd() * 0.6; ctx.fillStyle = '#dfe6ff';
    ctx.beginPath(); ctx.arc(rnd() * S, rnd() * S, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // header
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const orb = ctx.createRadialGradient(76, 82, 2, 82, 90, 16);
  orb.addColorStop(0, '#c8e6ff'); orb.addColorStop(0.45, '#4f8dff'); orb.addColorStop(1, '#6a2bd8');
  ctx.fillStyle = orb; ctx.beginPath(); ctx.arc(82, 90, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2f3ff'; ctx.font = `800 30px ${FONT}`; ctx.fillText('EarthInteractive', 110, 101);
  ctx.textAlign = 'right'; ctx.fillStyle = '#b98aff'; ctx.font = `700 20px ${FONT}`;
  ctx.fillText('TRUE SIZE COMPARISON', S - 64, 99);

  // the two shapes, side by side at one shared km scale
  const A = project(pair.a.shape.multi, pair.a.shape.centroid), B = project(pair.b.shape.multi, pair.b.shape.centroid);
  const box = { top: 170, h: 520, half: (S - 160) / 2 };
  const scale = Math.min(box.half * 0.86 / Math.max(A.w, 1), box.half * 0.86 / Math.max(B.w, 1), box.h / Math.max(A.h, B.h, 1));
  const draw = (P, hex, cx) => {
    const cy = box.top + box.h / 2;
    ctx.beginPath();
    for (const poly of P.polys) for (const ring of poly) ring.forEach(([x, y], i) => {
      const X = cx + (x - P.cx) * scale, Y = cy - (y - P.cy) * scale;
      if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
    });
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 36; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 16;
    ctx.fillStyle = hex; ctx.fill('evenodd');
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = lighten(hex, 0.55); ctx.stroke();
  };
  const ax = 80 + box.half / 2, bx = S - 80 - box.half / 2;
  draw(A, pair.a.hex, ax); draw(B, pair.b.hex, bx);
  // a tiny country could vanish next to a huge one: mark where it is
  for (const [P, x, hex] of [[A, ax, pair.a.hex], [B, bx, pair.b.hex]]) {
    if (Math.max(P.w, P.h) * scale < 14) { ctx.strokeStyle = hex; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, box.top + box.h / 2, 22, 0, Math.PI * 2); ctx.stroke(); }
  }

  // names (with flags) and areas
  const label = (side, cx, flag) => {
    ctx.textAlign = 'center';
    ctx.font = `800 40px ${FONT}`;
    const name = side.o.unit.n, w = ctx.measureText(name).width, fw = flag ? 46 : 0, gap = flag ? 14 : 0;
    const x0 = cx - (w + fw + gap) / 2;
    if (flag) { ctx.save(); roundRect(ctx, x0, 718, fw, 34, 5); ctx.clip(); ctx.drawImage(flag, x0, 718, fw, 34); ctx.restore(); }
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(name, x0 + fw + gap, 748, box.half);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(226,230,255,0.7)'; ctx.font = `500 24px ${FONT}`;
    ctx.fillText(fmtArea(side.area) + (side.shape.trimmed ? ' · main territory' : ''), cx, 788);
  };
  label(pair.a, ax, fa); label(pair.b, bx, fb);

  // the headline ratio
  const big = pair.a.area >= pair.b.area ? pair.a : pair.b, small = big === pair.a ? pair.b : pair.a;
  const r = big.area / small.area;
  const how = r >= 1.5 ? `${r >= 10 ? fmtInt.format(Math.round(r)) : r.toFixed(1)}× the size of` : r >= 1.01 ? `${Math.round((r - 1) * 100)}% larger than` : 'about the same size as';
  roundRect(ctx, 64, 830, S - 128, 92, 24); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#f2f3ff'; ctx.font = `700 34px ${FONT}`;
  ctx.fillText(`${big.o.unit.n} is ${how} ${small.o.unit.n}`, S / 2, 888, S - 170);

  // population line + link
  const pa = pair.a.o.info.pop, pb = pair.b.o.info.pop;
  ctx.font = `500 24px ${FONT}`; ctx.fillStyle = 'rgba(226,230,255,0.66)';
  if (pa && pb) ctx.fillText(`Population: ${fmtCompact.format(pa)} vs ${fmtCompact.format(pb)}`, S / 2, 970);
  ctx.fillStyle = '#b98aff'; ctx.font = `700 24px ${FONT}`;
  ctx.fillText(url.replace(/^https?:\/\//, ''), S / 2, 1022, S - 120);

  return new Promise(res => cv.toBlob(res, 'image/png'));
}

/**
 * Share the PNG with the system share sheet where files can be shared, else download it.
 * Phones only allow the share sheet shortly after the tap; drawing the image can take longer on a slow phone,
 * so the last image is kept and, if the sheet is refused, 'retry' asks for a second tap that shares at once.
 */
let last = null; // { key, blob }
export async function shareCompareImage(pair, url) {
  const key = pair.a.o.key + '|' + pair.b.o.key;
  const blob = last?.key === key ? last.blob : await renderCompareImage(pair, url);
  last = { key, blob };
  const name = `${pair.a.o.unit.n}-vs-${pair.b.o.unit.n}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `${pair.a.o.unit.n} vs ${pair.b.o.unit.n}`, text: url }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; if (e.name === 'NotAllowedError') return 'retry'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
