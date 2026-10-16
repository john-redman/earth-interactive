// Rankings: every country of the current view ranked by a statistic the visitor picks (population by default),
// with its rank and value. A tap on a row flies to that country. ?rank=area opens it ranked by area.
import { flagImg } from './flags.js';
import { fmtArea } from './ui.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const big = v => (v >= 1e12 ? (v / 1e12).toFixed(2) + ' trillion' : v >= 1e9 ? (v / 1e9).toFixed(1) + ' billion' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' million' : int.format(v));

/** What can be ranked: value from a country's facts and shape, how to show it, and where it comes from. */
export const RANK_BY = {
  pop:     { label: 'Population', get: (i) => i.pop, fmt: v => int.format(v), unit: 'people', year: 'popYear', source: 'World Bank' },
  area:    { label: 'Area', get: (i, u) => u.area, fmt: v => fmtArea(v), source: 'Natural Earth borders, as drawn in this view' },
  density: { label: 'Density', get: (i, u) => (i.pop && u.area > 0 ? i.pop / u.area : null), fmt: v => (v < 10 ? v.toFixed(1) : int.format(v)) + ' per km²', year: 'popYear', source: 'World Bank, Natural Earth' },
  gdp:     { label: 'GDP', get: (i) => (i.gdp ? i.gdp * 1e6 : null), fmt: v => '$' + big(v), year: 'gdpYear', source: 'World Bank (US$)' },
  gdppc:   { label: 'GDP per person', get: (i) => (i.gdp && i.pop > 50000 ? (i.gdp * 1e6) / i.pop : null), fmt: v => '$' + int.format(v), year: 'gdpYear', source: 'World Bank (US$)' },
};
export const RANK_ORDER = ['pop', 'area', 'density', 'gdp', 'gdppc'];

/** Countries ranked by `key`, highest first: [{ o, v, rank }]. Ties share a rank. Antarctica and disputed areas are left out. */
export function rankList(objects, key) {
  const R = RANK_BY[key];
  const rows = objects.filter(o => (o.unit.t === 'country' || o.unit.t === 'limited') && o.key !== 'ATA')
    .map(o => ({ o, v: R.get(o.info, o.unit) }))
    .filter(r => r.v != null && isFinite(r.v) && r.v > 0)
    .sort((a, b) => b.v - a.v || a.o.unit.n.localeCompare(b.o.unit.n));
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].v === r.v ? rows[i - 1].rank : i + 1; });
  return rows;
}

export function createRankings({ getObjects, onPick, onToggle }) {
  const el = document.getElementById('rankings');
  let key = 'pop', asc = false, open = false;

  function paint() {
    const R = RANK_BY[key], rows = rankList(getObjects(), key);
    if (asc) rows.reverse();
    const years = new Map();
    if (R.year) for (const r of rows) { const y = r.o.info[R.year]; if (y) years.set(y, (years.get(y) || 0) + 1); }
    const year = [...years].sort((a, b) => b[1] - a[1])[0]?.[0];
    el.innerHTML = `
      <div class="rk-head">
        <h2 id="rk-title">Rankings</h2>
        <button type="button" class="pop-x rk-x" aria-label="Close rankings">✕</button>
      </div>
      <div class="rk-by" role="radiogroup" aria-label="Rank by">
        <span class="rk-label" aria-hidden="true">Rank by</span>
        ${RANK_ORDER.map(k => `<button type="button" role="radio" class="chip rk-chip" data-k="${k}" aria-checked="${k === key}">${RANK_BY[k].label}</button>`).join('')}
      </div>
      <div class="rk-sub">
        <span>${rows.length} countries · ${esc(R.source)}${year ? `, mostly ${year}` : ''}</span>
        <button type="button" class="rk-order" aria-label="${asc ? 'Lowest first. Show highest first' : 'Highest first. Show lowest first'}">${asc ? 'Lowest first ↑' : 'Highest first ↓'}</button>
      </div>
      <ol class="rk-list" aria-labelledby="rk-title">
        ${rows.map(r => `<li><button type="button" class="rk-row" data-key="${esc(r.o.key)}"><span class="rk-n">${r.rank}</span>${flagImg(r.o.info, 'rk-flag') || '<span class="rk-flag"></span>'}<span class="rk-name">${esc(r.o.unit.n)}</span><span class="rk-v">${R.fmt(r.v)}${R.unit ? ` <small>${R.unit}</small>` : ''}</span></button></li>`).join('')}
      </ol>`;
    el.querySelector('.rk-x').onclick = () => hide();
    el.querySelectorAll('.rk-chip').forEach(b => (b.onclick = () => { set(b.dataset.k); el.querySelector(`.rk-chip[data-k="${key}"]`)?.focus({ preventScroll: true }); }));
    el.querySelector('.rk-order').onclick = () => { asc = !asc; paint(); el.querySelector('.rk-order').focus({ preventScroll: true }); };
    const byKey = new Map(rows.map(r => [r.o.key, r.o]));
    el.querySelectorAll('.rk-row').forEach(b => (b.onclick = () => { const o = byKey.get(b.dataset.key); hide(); onPick(o); }));
  }
  function set(k) { if (!RANK_BY[k]) return; key = k; el.querySelector('.rk-list')?.scrollTo?.(0, 0); paint(); onToggle?.(true, key); }
  // the chips: arrow keys move along them, as in a radio group
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); hide(); return; }
    if (!e.target.classList?.contains('rk-chip') || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const i = RANK_ORDER.indexOf(key) + (e.key === 'ArrowRight' ? 1 : -1);
    set(RANK_ORDER[(i + RANK_ORDER.length) % RANK_ORDER.length]);
    el.querySelector(`.rk-chip[data-k="${key}"]`)?.focus({ preventScroll: true });
  });

  function show(k = key) {
    if (RANK_BY[k]) key = k;
    open = true; paint();
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    el.querySelector(`.rk-chip[data-k="${key}"]`)?.focus({ preventScroll: true });
    onToggle?.(true, key);
  }
  function hide() {
    if (!open) return;
    open = false; el.hidden = true;
    onToggle?.(false, key);
  }
  return {
    show, hide, set,
    toggle() { if (open) hide(); else show(); },
    get isOpen() { return open; },
    get key() { return key; },
    /** The view changed: same ranking, the new view's countries. */
    refresh() { if (open) paint(); },
  };
}
