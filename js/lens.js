// Data lenses: recolour the globe by a statistic (choropleth) with a legend.
import { fmtArea } from './ui.js';

// One warm hue, dim → bright (low values recede into the night-blue ocean, high values glow).
export const RAMP = ['#4a2610', '#6e3611', '#954a14', '#bb621b', '#dc812c', '#f2a64b', '#ffd27e'];

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const LENSES = {
  none:    { label: 'Countries', short: 'Political' },
  pop:     { label: 'Population', short: 'Population', get: (i) => i.pop, fmt: v => compact.format(v) + ' people' },
  density: { label: 'People per km²', short: 'Density', get: (i, u) => (i.pop && u.area > 50 ? i.pop / u.area : null), fmt: v => int.format(v) + ' per km²' },
  gdppc:   { label: 'GDP per person (US$)', short: 'Wealth', get: (i) => (i.gdp && i.pop > 50000 ? (i.gdp * 1e6) / i.pop : null), fmt: v => '$' + int.format(v) + ' per person' },
  area:    { label: 'Land area', short: 'Area', get: (i, u) => u.area, fmt: v => fmtArea(v) },
};
export const LENS_ORDER = ['none', 'pop', 'density', 'gdppc', 'area'];

const counts = new Set(['country', 'limited', 'territory']);

/** Quantile breaks over the current view → colour function + legend data. */
export function buildLens(key, objects) {
  const L = LENSES[key];
  if (!L?.get) return null;
  const vals = new Map();
  for (const o of objects) {
    if (!counts.has(o.unit.t)) continue;
    const v = L.get(o.info, o.unit);
    if (v != null && isFinite(v) && v > 0) vals.set(o.key, v);
  }
  const sorted = [...vals.values()].sort((a, b) => a - b);
  const n = RAMP.length;
  const breaks = Array.from({ length: n - 1 }, (_, i) => sorted[Math.floor(((i + 1) / n) * sorted.length)]);
  const binOf = v => { let b = 0; while (b < breaks.length && v >= breaks[b]) b++; return b; };
  return {
    key, label: L.label, fmt: L.fmt, breaks,
    min: sorted[0], max: sorted[sorted.length - 1],
    value: o => vals.get(o.key) ?? null,
    color: o => { const v = vals.get(o.key); return v == null ? null : RAMP[binOf(v)]; },
  };
}

export function renderLegend(el, lens) {
  if (!lens) { el.hidden = true; return; }
  const tick = v => lens.fmt(v).replace(/ (people|per km²|per person)$/, '');
  el.innerHTML = `
    <div class="lg-title">${lens.label}</div>
    <div class="lg-ramp">${RAMP.map((c, i) => `<i style="--c:${c}" title="${i === 0 ? 'below ' + tick(lens.breaks[0]) : i === RAMP.length - 1 ? tick(lens.breaks[i - 1]) + ' and above' : tick(lens.breaks[i - 1]) + ' – ' + tick(lens.breaks[i])}"></i>`).join('')}</div>
    <div class="lg-ends"><span>${tick(lens.min)}</span><span>${tick(lens.max)}</span></div>
    <div class="lg-foot"><i class="lg-nodata"></i>No data · each colour step holds the same number of countries</div>`;
  el.hidden = false;
}
