// Country of the day: one country per calendar day (the same for everyone), with a couple of facts built
// from the map data. Shown as a small chip when the page opens; it flies there and opens the card.
import { todayKey } from './quiz.js';
import { flagImg } from './flags.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = s => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 11) >>> 0;
const int = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const list = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
// well-known yardsticks for "how big is it?"
const YARDSTICKS = ['GBR', 'FRA', 'DEU', 'ITA', 'JPN', 'ESP', 'USA', 'AUS', 'IND', 'CHN', 'BRA', 'MEX', 'NGA', 'EGY', 'ZAF', 'CAN', 'ARG', 'TUR'];
const SEEN = 'ei-cotd-seen';

/** Today's country key: a country in every border view, with population data. */
export function countryOfTheDay(data, day = todayKey()) {
  const views = Object.values(data.views).map(v => new Map(v.units.map(u => [u.k, u])));
  const pool = data.views.defacto.units
    .filter(u => u.t === 'country' && data.info[u.k]?.pop && views.every(m => m.get(u.k)?.t === 'country'))
    .map(u => u.k).sort();
  return pool[hash('cotd-' + day) % pool.length];
}

/** Two short facts about a country object: how big it is next to something familiar, plus one more. */
export function factsFor(o, get, ranks) {
  const i = o.info, area = i.areaOfficial || o.unit.area, facts = [];
  // size against the most fitting familiar country (a ratio between 1.5× and ~40×, either way round)
  let best = null;
  for (const k of YARDSTICKS) {
    const y = get(k); if (!y || k === o.key) continue;
    const ya = y.info.areaOfficial || y.unit.area, r = area >= ya ? area / ya : ya / area;
    const score = Math.abs(Math.log(r) - Math.log(4));
    if (r >= 1.5 && r <= 40 && (!best || score < best.score)) best = { y, r, bigger: area >= ya, score };
  }
  if (best) {
    const r = best.r >= 10 ? Math.round(best.r) : best.r.toFixed(1).replace(/\.0$/, '');
    facts.push(best.bigger
      ? `${o.unit.n} is about ${r}× the size of ${best.y.unit.n}.`
      : `You could fit ${o.unit.n} into ${best.y.unit.n} about ${r} times.`);
  }
  const extra = [];
  const nb = (i.borders || []).map(get).filter(Boolean).map(x => x.unit.n);
  if (i.landlocked) extra.push(`It has no coastline at all${nb.length ? `, and borders ${nb.length === 1 ? nb[0] : nb.length + ' countries'}` : ''}.`);
  else if (!nb.length) extra.push('It has no land borders: the sea surrounds it.');
  else if (nb.length >= 6) extra.push(`It shares a border with ${nb.length} countries.`);
  else extra.push(`Its neighbours: ${list(nb)}.`);
  const pr = ranks?.pop.at.get(o.key);
  if (pr && pr <= 40) extra.push(`About ${compact.format(i.pop)} people live here, the ${ordinal(pr)} largest population in the world.`);
  if (i.languages?.length >= 3) extra.push(`It has ${i.languages.length} official languages, including ${list(i.languages.slice(0, 2))}.`);
  if (i.pop && area > 50) {
    const d = i.pop / area;
    if (d > 400) extra.push(`It is crowded: about ${int.format(Math.round(d))} people per km².`);
    else if (d < 10) extra.push(`It is wide open: fewer than ${Math.max(1, Math.ceil(d))} ${d < 1.5 ? 'person' : 'people'} per km².`);
  }
  if (i.capital) extra.push(`Its capital is ${i.capital}.`);
  facts.push(extra[hash(o.key + todayKey()) % extra.length]);
  return facts.filter(Boolean);
}

/** The chip: "Country of the day · flag Name", with Go and dismiss. */
export function mountDailyChip(el, { o, onGo }) {
  const day = todayKey();
  let seen = null; try { seen = localStorage.getItem(SEEN); } catch { /* storage unavailable */ }
  el.innerHTML = `
    <button type="button" class="cotd-main" title="Fly to today's country">
      <span class="cotd-k">Country of the day</span>
      ${flagImg(o.info, 'cotd-flag')}<b>${esc(o.unit.n)}</b><span class="cotd-go" aria-hidden="true">→</span>
    </button>
    <button type="button" class="cotd-x" aria-label="Hide country of the day">✕</button>`;
  const hide = () => { el.classList.remove('in'); el.hidden = true; try { localStorage.setItem(SEEN, day); } catch { /* storage unavailable */ } };
  el.querySelector('.cotd-main').onclick = () => { hide(); onGo(o); };
  el.querySelector('.cotd-x').onclick = hide;
  return {
    /** Show it (once a day, until opened or dismissed). */
    show() { if (seen === day) return; el.hidden = false; el.classList.add('in'); },
    hide() { el.hidden = true; },
  };
}
