import * as THREE from 'three';
import { loadWorld, setLoader } from './load.js';
import { createGlobe, tickGlobe } from './globe.js';
import { CountryLayer } from './countries.js';
import { Compare } from './compare.js';
import { createUI } from './ui.js';
import { mountAds } from './ads.js';
import { raySphere, vec3ToLonLat, lonLatToVec3 } from './geo.js';
import { Thrills } from './thrills.js';
import { Spin } from './spin.js';
import { SKY, updateSun } from './sun.js';
import { LENSES, LENS_ORDER, buildLens, renderLegend } from './lens.js';
import { createSearch } from './search.js';
import { createQuiz } from './quiz.js';
import { shareBase } from './site.js';
import { Pin } from './pin.js';
import { createSfx } from './sfx.js';
import { createMusic } from './music.js';
import { MissLine } from './miss-line.js';
import { Currents } from './currents.js';
import { countryOfTheDay, factsFor, mountDailyChip } from './daily-country.js';
import { flagImg } from './flags.js';
import { shareCompareImage } from './share-image.js';
import { track } from './analytics.js';
import { TIER } from './perf.js';

const data = await loadWorld();

// Offline + instant repeat visits (skipped on localhost so development always sees fresh files)
if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  const register = () => navigator.serviceWorker.register('sw.js').catch(() => {});
  if (document.readyState === 'complete') register(); else addEventListener('load', register);
}

const canvas = document.getElementById('globe');
const stage = document.getElementById('stage');
const globe = createGlobe(canvas);
const ads = mountAds(globe);
// Native app only (Capacitor): AdMob, consent, haptics, back button. The website never loads js/native.js.
const native = window.Capacitor?.isNativePlatform?.()
  ? import('./native.js').then(m => m.initNative({ ads, globe, isBusy: () => mode === 'quiz' })).catch(() => null)
  : Promise.resolve(null);
// "Get the app" links (render nothing until store links are set in js/app-links.js, or inside the app)
import('./app-links.js').then(m => m.mountStoreBadges(document.getElementById('app-links'))).catch(() => {});
const layer = new CountryLayer(globe, data);
const compare = new Compare(globe, layer);
const spin = new Spin(globe);
globe.controls.enableRotate = false; // rotation is ours (flywheel); OrbitControls keeps zoom + idle auto-rotate
const thrills = new Thrills(globe, spin);
const pin = new Pin(document.getElementById('stage'));
const sfx = createSfx({ muted: () => thrills.muted });
const music = createMusic(document.getElementById('music-toggle'));
const missLine = new MissLine(globe, layer, stage);
const currents = new Currents(globe, layer, stage);
const cotdKey = countryOfTheDay(data);
/** Fly to today's country and open its card (from the chip or the Play menu). */
function goDaily() { const o = layer.get(cotdKey); if (!o || mode === 'quiz') return; if (mode === 'compare') endCompare(true); openCountry(o, { fly: true }); openInfo(o); }

/** Soft ring that spreads from where the globe was tapped. */
function ripple(x, y, strong) {
  const r = stage.getBoundingClientRect(), el = document.createElement('span');
  el.className = 'tap-ripple' + (strong ? ' strong' : '');
  el.style.left = x - r.left + 'px'; el.style.top = y - r.top + 'px';
  stage.append(el); setTimeout(() => el.remove(), 650); // a timer, not animationend: reduced motion skips the animation
}

// the brand sits above the footer links, which wrap to more lines on narrow phones
const siteLinks = document.querySelector('.site-links');
if (siteLinks && window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty('--links-h', siteLinks.offsetHeight + 'px')).observe(siteLinks);

// sound toggle (bottom-right)
const soundBtn = document.getElementById('sound-toggle');
const paintSound = () => { soundBtn.setAttribute('aria-pressed', String(!thrills.muted)); soundBtn.title = thrills.muted ? 'Sound off' : 'Sound on'; soundBtn.classList.toggle('muted', thrills.muted); };
soundBtn.addEventListener('click', () => { thrills.setMuted(!thrills.muted); paintSound(); });
paintSound();

const params = new URLSearchParams(location.search);
let viewKey = data.views[params.get('view')] ? params.get('view') : data.defaultView;

// ---------- state ----------
let mode = 'browse';          // 'browse' | 'pick' | 'compare' | 'quiz'
let pickFrom = null;          // country chosen first for comparison
let anchor = null;            // 3D point the pin (and popup) is attached to
let selected = null;          // country marked by the pin

const ui = createUI({
  data, initialView: viewKey,
  onView: k => {
    if (mode === 'quiz') { ui.setViewSilently(viewKey); ui.showToast('Games use the UN map. Quit the game to switch.'); return; } // a view switch mid-round would lose its highlights
    switchView(k);
  },
  onCompareRequest: o => { mode = 'pick'; document.body.classList.add('picking'); pickFrom = o; closePopup(); compare.preview(o); sfx.play('snapOut'); ui.showPick(o); }, // it lifts out straight away
  onCompareCancelPick: () => cancelPick(),
  onCompareReset: () => compare.resetPositions(),
  onCompareEnd: () => endCompare(),
  onClosePopup: () => closeCard(),
  onSound: name => sfx.play(name),
  onInfo: o => openInfo(o),
  onNeighbour: key => { const o = layer.get(key); if (o) { openCountry(o, { fly: true }); openInfo(o); } },
  onShare: o => copyLink(o),
  onCompareImage: () => compareImage(),
  onSheet: () => { if (ui.popFor) frameBesideCard(ui.popFor); }, // phone sheet grew or shrank: keep the country above it
});
let cmpState = null;
/** Compare → Share image: a square post of the two countries at true size. */
async function compareImage() {
  if (!cmpState) return;
  const side = s => ({ ...s, shape: compare.shapeFor(s.o) });
  const url = new URL(shareBase()); url.search = ''; url.searchParams.set('compare', `${cmpState.a.o.key},${cmpState.b.o.key}`);
  try {
    const how = await shareCompareImage({ a: side(cmpState.a), b: side(cmpState.b) }, url.toString().replace(/%2C/gi, ','));
    if (how === 'downloaded') ui.showToast('Image saved');
    else if (how === 'retry') ui.showToast('Image ready. Tap Share image again.');
    track('compare-image', `${cmpState.a.o.key},${cmpState.b.o.key}`);
  } catch (e) { console.warn(e); ui.showToast('Could not make the image'); }
}

let trackedPair = '';
compare.onChange = state => {
  const pair = state ? `${state.a.o.key},${state.b.o.key}` : '';
  if (pair && pair !== trackedPair) track('compare', pair); // counted once per pair, not on every drag
  trackedPair = pair; cmpState = state;
  ui.showCompare(state); document.body.classList.toggle('comparing', !!state); setParam('compare', state ? `${state.a.o.key},${state.b.o.key}` : null); };
thrills.onFirstScream = () => setTimeout(() => ui.showToast('Hold on tight! Sound can be muted bottom-right.'), 900);

function switchView(k) {
  viewKey = k;
  if (mode === 'compare') endCompare(true);
  if (mode === 'pick') cancelPick();
  // the pin goes: the same spot can belong to a different country in the new view (Crimea → Russia)
  if (guess) cancelGuess(); else if (selected || ui.popFor) closePopup();
  layer.setView(k);
  const url = new URL(location.href); url.searchParams.set('view', k); history.replaceState(null, '', url);
  applyLens();
}

// ---------- country focus, ranks, links ----------
const rankCache = new Map();
function ranks() {
  if (rankCache.has(viewKey)) return rankCache.get(viewKey);
  const objs = layer.view.objects.filter(o => (o.unit.t === 'country' || o.unit.t === 'limited') && o.key !== 'ATA');
  const rankBy = get => { const list = objs.filter(o => get(o) > 0).sort((a, b) => get(b) - get(a)); return { n: list.length, at: new Map(list.map((o, i) => [o.key, i + 1])) }; };
  const r = { pop: rankBy(o => o.info.pop || 0), area: rankBy(o => o.unit.area) };
  rankCache.set(viewKey, r); return r;
}
function extras(o) {
  const R = ranks(), counted = (o.unit.t === 'country' || o.unit.t === 'limited') && o.key !== 'ATA';
  const nb = (o.info.borders || []).map(k => layer.get(k)).filter(Boolean).map(n => ({ key: n.key, name: n.unit.n }));
  const lensVal = lens && lens.value(o);
  return {
    ranks: counted ? { pop: R.pop.at.has(o.key) ? [R.pop.at.get(o.key), R.pop.n] : null, area: [R.area.at.get(o.key), R.area.n] } : null,
    neighbours: o.unit.t === 'country' || o.unit.t === 'limited' || o.unit.t === 'territory' ? nb : null,
    lens: lensVal != null ? { label: lens.label, text: lens.fmt(lensVal) } : null,
    daily: o.key === cotdKey ? factsFor(o, k => layer.get(k), R) : null,
  };
}
function flyToCountry(o, minDist = 1.6) {
  const r = Math.sqrt(o.unit.area / Math.PI) / 6371;
  const dist = THREE.MathUtils.clamp(1 + r * 6, minDist, Math.max(minDist, globe.fitDistance));
  spin.stop(); globe.flyTo(compare.shapeFor(o).centroid, dist, 1200); // the main landmass, not a centroid pulled out to sea by overseas parts
}
/** Frame a wrong guess and the right country together (the miss line runs between them). */
function flyToBoth(point, o) {
  const a = point.clone().normalize(), b = o.g.centroid.clone().normalize();
  const r = Math.sqrt(o.unit.area / Math.PI) / 6371, half = a.angleTo(b) / 2 + r;
  const mid = a.clone().add(b); if (mid.lengthSq() < 1e-6) mid.copy(b);
  const dist = THREE.MathUtils.clamp(1 + half * 3.2, 2.1, Math.max(2.1, globe.fitDistance));
  spin.stop(); globe.flyTo(mid.normalize(), dist, 1200);
}
// Games: a tap drops the pin on your guess and asks to confirm it, so a stray tap never costs a round
let guess = null;
function proposeGuess(r) {
  guess = r;
  anchor = r.point.clone().normalize();
  layer.setSelected(r.o || null); // outline the country you're about to answer with
  pin.show(); sfx.play('tap');
  ui.showConfirm({ onYes: confirmGuess, onNo: cancelGuess });
}
function confirmGuess() {
  if (!guess || !quiz.waiting) return cancelGuess();
  const g = guess; cancelGuess();
  quiz.answer(g.o, g.point);
}
function cancelGuess() {
  guess = null; anchor = null; pin.hide(); ui.hideTag(); layer.setSelected(null);
}

/** Select a country: drop the pin and show the small tag. The full card only opens on request (openInfo). */
function openCountry(o, { fly = false, point = null } = {}) {
  if (mode === 'pick') cancelPick();
  selected = o;
  layer.setSelected(o);
  anchor = (point || compare.shapeFor(o).centroid).clone().normalize(); // main landmass: France's pin belongs in France, not between it and Guiana
  ui.hidePopup(); ui.showTag(o); ui.dismissHint();
  pin.show();
  if (fly) flyToCountry(o); else spin.brake();
  globe.hold('card', true); // the globe stays put while a country card is open
  globe.pauseAuto();
  setParam('c', o.key);
  track(`country/${o.key}`, o.unit.n);
}
function openInfo(o) {
  if (selected !== o) openCountry(o);
  ui.hideTag();
  ui.showPopup(o, viewKey, extras(o));
  frameBesideCard(o);
}
/**
 * The card must not cover its country: turn the globe so the country sits in the free space, to the left of the
 * docked card on desktop, above the bottom sheet's peek on phones, zoomed so it fits there.
 */
function frameBesideCard(o) {
  const { x: W, y: H } = globe.size, pop = document.getElementById('popup');
  if (!W || !H || pop.hidden) return;
  const m = 16, inset = window.__adInset || 0, sheet = W < 720;
  const free = sheet
    ? { l: 0, r: W, t: 70, b: H - (pop.classList.contains('peek') ? 196 : Math.min(pop.scrollHeight + 2, innerHeight * 0.7)) - 8 } // above the sheet
    : { l: inset + m, r: W - pop.offsetWidth - inset - m * 2, t: 70, b: H - 60 }; // left of the docked card
  const cx = (free.l + free.r) / 2, cy = (free.t + free.b) / 2, room = Math.max(60, Math.min(free.r - free.l, free.b - free.t) / 2);
  // exact perspective: a point `a` radians from the point under the camera, seen from distance d, lands this many px out
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(globe.camera.fov / 2)), pxPer = (H / 2) / tanHalf;
  const proj = (a, d) => Math.sin(a) / (d - Math.cos(a)) * pxPer;
  // frame the main landmass (far-flung islands would zoom right out): its centre and how far it reaches from it
  const shape = compare.shapeFor(o), c = shape.centroid.clone().normalize();
  if (shape.reach == null) { const v = new THREE.Vector3(); shape.reach = 0; for (const poly of shape.multi) for (const [lon, lat] of poly[0]) shape.reach = Math.max(shape.reach, lonLatToVec3(lon, lat, 1, v).angleTo(c)); }
  // distance at which that reach fills ~80% of the free room
  const r = Math.min(1.2, shape.reach);
  const dist = THREE.MathUtils.clamp(Math.cos(r) + Math.sin(r) * pxPer / (room * 0.8), 1.6, globe.controls.maxDistance * 0.95);
  const right = new THREE.Vector3(0, 1, 0).cross(c); if (right.lengthSq() < 1e-6) right.set(1, 0, 0); right.normalize();
  const up = c.clone().cross(right).normalize();
  const ox = cx - W / 2, oy = cy - H / 2, rho = Math.hypot(ox, oy);
  // how far the camera looks away from the country so it lands at (cx, cy): solve proj(a) = rho by bisection
  let lo = 0, hi = Math.acos(1 / dist) * 0.95;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (proj(mid, dist) < rho) lo = mid; else hi = mid; }
  const a = lo;
  const dir = rho < 1 ? c : c.clone().multiplyScalar(Math.cos(a)).addScaledVector(right, -Math.sin(a) * ox / rho).addScaledVector(up, Math.sin(a) * oy / rho);
  spin.stop(); globe.flyTo(dir.normalize(), dist, 900);
}
/** Close the card but keep the pin and its tag. */
function closeCard() {
  if (!ui.popFor) return;
  sfx.play('close');
  ui.hidePopup();
  if (selected && mode === 'browse') ui.showTag(selected);
}
function setParam(k, v) {
  const url = new URL(location.href);
  if (v == null) url.searchParams.delete(k); else url.searchParams.set(k, v);
  url.search = url.searchParams.toString().replace(/%2C/gi, ','); // ?compare=FRA,BRA reads better when shared
  try { history.replaceState(null, '', url); } catch { /* sandboxed */ }
}
async function copyLink(o) {
  const url = new URL(shareBase()); url.search = ''; url.searchParams.set('view', viewKey); url.searchParams.set('c', o.key);
  try { await navigator.clipboard.writeText(url.toString()); ui.showToast(`Link to ${o.unit.n} copied`); }
  catch { ui.showToast(url.toString()); }
}

// ---------- data lens ----------
let lensKey = 'none', lens = null;
const legendEl = document.getElementById('legend');
function applyLens() {
  if (!layer.view) return;
  lens = lensKey === 'none' ? null : buildLens(lensKey, layer.view.objects);
  layer.setLens(lens ? o => lens.color(o) : null);
  renderLegend(legendEl, lens);
  document.body.classList.toggle('lens-on', !!lens);
  document.querySelector('[data-dock="lens"]').classList.toggle('on', !!lens);
  if (ui.popFor) ui.showPopup(ui.popFor, viewKey, extras(ui.popFor));
}

// ---------- dock: search, play, data ----------
const GAME_VIEW = 'un';
let viewBeforeGame = null;
function startGame(m) { track(`play/${m}`); quiz.start(m); }
const search = createSearch({ getObjects: () => layer.view?.objects || [], onPick: o => { if (mode === 'quiz') return; if (mode === 'compare') endCompare(true); openCountry(o, { fly: true }); } });
const quiz = createQuiz({
  data, layer, globe,
  flyTo: (o, from) => from ? flyToBoth(from, o) : flyToCountry(o, 2.1),
  onMiss: (from, to, km) => (from ? missLine.show(from, to, km) : missLine.hide()),
  onResult: ok => sfx.play(ok ? 'correct' : 'wrong'),
  onMode: on => {
    ui.showTip(null);
    if (on) {
      if (mode === 'compare') endCompare(true); if (mode === 'pick') cancelPick(); closePopup(); mode = 'quiz'; layer.setHover(null);
      // games play on the UN map: the internationally recognised countries the questions are about
      if (mode === 'quiz' && viewKey !== GAME_VIEW && !viewBeforeGame) { viewBeforeGame = viewKey; ui.setViewSilently(GAME_VIEW); switchView(GAME_VIEW); ui.showToast('Games use the UN map'); }
    } else {
      if (guess) cancelGuess(); mode = 'browse'; native.then(n => n?.showInterstitial()); // an ad between games in the app, never mid-round
      if (viewBeforeGame && viewKey === GAME_VIEW) { ui.setViewSilently(viewBeforeGame); switchView(viewBeforeGame); } // back to the view you had
      viewBeforeGame = null;
    }
    document.body.classList.toggle('quiz-on', on);
    setParam('play', null);
  },
});
const menus = { play: document.getElementById('play-menu'), lens: document.getElementById('lens-menu') };
function closeMenus() { for (const [k, m] of Object.entries(menus)) { m.hidden = true; document.querySelector(`[data-dock="${k}"]`).setAttribute('aria-expanded', 'false'); } }
function openMenu(k) {
  const m = menus[k], was = !m.hidden; closeMenus(); if (was) return;
  if (k === 'play') {
    const done = quiz.dailyDone(); let best = 0; try { best = +JSON.parse(localStorage.getItem('ei-best')) || 0; } catch { /* no storage */ }
    m.innerHTML = `
      <button type="button" role="menuitem" data-play="daily"><span class="m-ico">5</span><span><b>Daily Challenge</b><small>Same 5 countries for everyone today</small></span>${done ? '<span class="m-done">Done ✓</span>' : ''}</button>
      <button type="button" role="menuitem" data-play="cotd"><span class="m-ico">${flagImg(layer.get(cotdKey)?.info, 'm-flag') || '★'}</span><span><b>Country of the day</b><small>${layer.get(cotdKey)?.unit.n || ''}: a new one every day</small></span></button>
      <button type="button" role="menuitem" data-play="classic"><span class="m-ico">10</span><span><b>Find it</b><small>${best ? 'Your best: ' + best.toLocaleString('en-US') + ' pts' : 'Ten countries, getting smaller'}</small></span></button>`;
    m.querySelectorAll('[data-play]').forEach(b => (b.onclick = () => { closeMenus(); if (b.dataset.play === 'cotd') goDaily(); else startGame(b.dataset.play); }));
  } else {
    m.innerHTML = LENS_ORDER.map(k2 => `<button type="button" role="menuitemradio" aria-checked="${k2 === lensKey}" data-lens="${k2}"><span class="m-ramp ${k2 === 'none' ? 'none' : ''}"></span><span><b>${LENSES[k2].short}</b><small>${k2 === 'none' ? 'Political colours' : LENSES[k2].label}</small></span></button>`).join('');
    m.querySelectorAll('[data-lens]').forEach(b => (b.onclick = () => { lensKey = b.dataset.lens; closeMenus(); applyLens(); }));
  }
  m.hidden = false; document.querySelector(`[data-dock="${k}"]`).setAttribute('aria-expanded', 'true');
  m.querySelector('button')?.focus({ preventScroll: true });
}
document.getElementById('dock').addEventListener('click', e => {
  const b = e.target.closest('[data-dock]'); if (!b) return;
  if (b.dataset.dock === 'search') { closeMenus(); search.open(); } else openMenu(b.dataset.dock);
});
document.addEventListener('pointerdown', e => { if (!e.target.closest('.dock')) closeMenus(); });

// ---------- live day & night ----------
const clock = document.getElementById('clock');
const NIGHT = 1; // day & night fully on (the shaders set how dark night is)
let dayNight = true;
try { dayNight = localStorage.getItem('ei-daynight') !== '0'; } catch { /* storage unavailable */ }
const dnBtn = document.getElementById('daynight-toggle');
function paintDayNight() {
  dnBtn.setAttribute('aria-checked', String(dayNight)); dnBtn.title = `Day & night: ${dayNight ? 'on' : 'off'}`;
  clock.hidden = !dayNight;
}
dnBtn.addEventListener('click', () => {
  dayNight = !dayNight; paintDayNight();
  try { localStorage.setItem('ei-daynight', dayNight ? '1' : '0'); } catch { /* storage unavailable */ }
});
paintDayNight();
SKY.uNight.value = dayNight ? NIGHT : 0;
/** Ease the night shading towards on/off (and off under data lenses, which need their true colours). */
function tickNight(dt) {
  const target = dayNight && !lens ? NIGHT : 0;
  SKY.uNight.value += (target - SKY.uNight.value) * Math.min(1, dt * 4);
}
function tickSun() {
  const now = new Date(); updateSun(now);
  clock.textContent = `Live day & night · ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;
}
tickSun(); setInterval(tickSun, 30000);

function closePopup() {
  ui.hidePopup(); ui.hideTag(); pin.hide(); anchor = null; selected = null; if (mode === 'browse') layer.setSelected(null); setParam('c', null);
  if (globe.hold('card', false)) globe.pauseAuto(); // card closed: idle auto-rotate resumes after the usual delay
}

// Recenter: back to the start-up framing, spinning again
function recenter() {
  if (mode === 'quiz') return;
  closeMenus();
  if (mode === 'compare') endCompare(true); else if (mode === 'pick') cancelPick();
  closePopup();
  spin.stop(); globe.flyHome();
  globe.resumeAuto();
}
document.getElementById('recenter').addEventListener('click', recenter);
function cancelPick() {
  if (mode === 'pick' && compare.previewPiece) { compare.end(); sfx.play('snapIn'); } // the lifted piece settles back
  mode = 'browse'; pickFrom = null; ui.hidePick(); layer.setSelected(null); document.body.classList.remove('picking');
}
function endCompare(immediate) {
  if (!immediate && mode === 'compare') sfx.play('snapIn'); // pieces settle back into their sockets
  compare.end(immediate); mode = 'browse'; ui.showCompare(null);
}

// ---------- pointer handling: click vs drag ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function rayAt(x, y) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, globe.camera);
  return raycaster.ray;
}
function countryAt(x, y) {
  const hit = raySphere(rayAt(x, y), 1); if (!hit) return null;
  const [lon, lat] = vec3ToLonLat(hit);
  const o = layer.pick(lon, lat);
  return o ? { o, point: hit.clone() } : { o: null, point: hit.clone() };
}

const CLICK_SLOP = 6, CLICK_MS = 650;
let down = null; const pointers = new Set();

// capture phase → runs before OrbitControls so we can claim drags that start on a compare piece
stage.addEventListener('pointerdown', e => {
  if (e.target !== canvas) return;
  thrills.unlock();
  pointers.add(e.pointerId);
  ui.dismissHint();
  down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, multi: pointers.size > 1 };
  if ((mode === 'compare' || mode === 'pick') && pointers.size === 1) { // pieces can be dragged while choosing the second country too
    const hit = compare.hitPiece(rayAt(e.clientX, e.clientY));
    if (hit) {
      globe.controls.enabled = false;
      compare.beginDrag(hit);
      canvas.setPointerCapture(e.pointerId);
      stage.classList.add('dragging-piece');
    }
  }
  if (!compare.drag) { if (pointers.size === 1) spin.begin(e.clientX, e.clientY, performance.now()); else spin.pinch(performance.now()); }
  stage.classList.add('grabbing');
}, { capture: true });

// wheel / trackpad zoom: eased (OrbitControls would jump a step per notch); never touches the rotation
stage.addEventListener('wheel', e => {
  if (e.target !== canvas) return;
  e.preventDefault(); e.stopPropagation();
  const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  globe.zoomBy(Math.exp(THREE.MathUtils.clamp(px, -240, 240) * 0.0016));
}, { capture: true, passive: false });

window.addEventListener('pointermove', e => {
  if (down) {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) down.moved = true;
    if (compare.drag) compare.dragTo(rayAt(e.clientX, e.clientY));
    else if (pointers.size === 1) spin.move(e.clientX, e.clientY, performance.now());
    ui.showTip(null);
    return;
  }
  if (e.pointerType !== 'mouse' || e.target !== canvas) { ui.showTip(null); return; }
  hoverAt(e.clientX, e.clientY);
});

let hoverQueued = null;
function hoverAt(x, y) {
  if (hoverQueued) { hoverQueued = [x, y]; return; }
  hoverQueued = [x, y];
  requestAnimationFrame(() => {
    const [hx, hy] = hoverQueued; hoverQueued = null;
    if (mode === 'compare' || (mode === 'pick' && compare.previewPiece)) {
      const hit = compare.hitPiece(rayAt(hx, hy));
      stage.classList.toggle('over-piece', !!hit);
      if (hit || mode === 'compare') { ui.showTip(hit ? hit.piece.o.unit.n : null, hx, hy); if (hit) layer.setHover(null); return; }
    }
    const r = countryAt(hx, hy);
    const o = r?.o || null;
    layer.setHover(o && !(mode === 'pick' && o === pickFrom) ? o : null);
    stage.classList.toggle('over-country', !!o);
    if (mode === 'quiz') { ui.showTip(null); return; }   // no free answers
    const v = o && lens ? lens.value(o) : null;
    ui.showTip(o ? (v != null ? `${o.unit.n} · ${lens.fmt(v)}` : o.unit.n) : null, hx, hy);
  });
}

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (!down) return;
  const d = down; down = null;
  stage.classList.remove('grabbing');
  if (compare.drag) { compare.endDrag(); globe.controls.enabled = true; stage.classList.remove('dragging-piece'); return; }
  const tap = !(e.type === 'pointercancel' || d.moved || d.multi || performance.now() - d.t > CLICK_MS);
  const usedToBrake = spin.end(performance.now(), tap); // a tap on a fast-spinning globe just stops it
  if (!tap || usedToBrake) return; // it was a spin, not a click
  onClick(e.clientX, e.clientY);
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

function onClick(x, y) {
  ui.showTip(null);
  if (mode === 'compare') return;
  const r = countryAt(x, y);
  if (r) ripple(x, y, !!r.o);
  if (mode === 'quiz') { if (r && quiz.waiting) proposeGuess(r); return; }
  if (mode === 'pick') {
    if (compare.hitPiece(rayAt(x, y))) return; // a tap on the lifted piece isn't a choice
    if (r?.o && r.o !== pickFrom) {
      const a = pickFrom; ui.hidePick(); pickFrom = null; mode = 'compare'; document.body.classList.remove('picking');
      layer.setHover(null); compare.start(a, r.o); sfx.play('snapOut');
    } else if (r?.o === pickFrom) ui.showToast('Pick a different country');
    return;
  }
  if (r?.o) { openCountry(r.o, { point: r.point }); sfx.play('tap'); }
  else closePopup();
}

window.addEventListener('keydown', e => {
  if (search.isOpen || e.target.closest?.('input, textarea')) return;
  if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && mode !== 'quiz') { e.preventDefault(); closeMenus(); search.open(); return; }
  if (e.key === 'Escape') {
    if (!Object.values(menus).every(m => m.hidden)) closeMenus();
    else if (mode === 'compare') endCompare(); else if (mode === 'pick') cancelPick(); else if (mode === 'quiz') { if (guess) cancelGuess(); } else { if (ui.popFor) closeCard(); else closePopup(); }
    return;
  }
  if ((e.key === 'Home' || e.key.toLowerCase() === 'r') && !e.metaKey && !e.ctrlKey && !e.altKey && mode !== 'quiz') { e.preventDefault(); recenter(); return; }
  if (e.key === 'Enter' && guess && !e.target.closest?.('button')) { confirmGuess(); return; }
  if (e.key === 'Enter' && quiz.canAdvance && !e.target.closest?.('button')) { quiz.next(); return; }
  // keyboard spinning & zoom
  const step = 0.12;
  if (e.key === 'ArrowLeft') { spin.pending.t += step; } else if (e.key === 'ArrowRight') { spin.pending.t -= step; }
  else if (e.key === 'ArrowUp') { spin.pending.p -= step; } else if (e.key === 'ArrowDown') { spin.pending.p += step; }
  else if (e.key === '+' || e.key === '=') { globe.zoomBy(0.8); }
  else if (e.key === '-' || e.key === '_') { globe.zoomBy(1.25); }
  else return;
  if (e.key.startsWith('Arrow')) globe.pauseAuto(); // zooming leaves the rotation alone
  e.preventDefault();
});

// ---------- resize & loop ----------
globe.onResize = () => layer.resizeLines();
globe.resize();

const camDir = new THREE.Vector3(), tmp = new THREE.Vector3();
let prevNow = performance.now();
function frame(now) {
  const t = now / 1000;
  const dt = Math.max(0, (now - prevNow) / 1000); prevNow = now;
  globe.governor.frame(dt * 1000);
  globe.flight?.(now);
  spin.update(now, dt);
  globe.controls.update();
  tickGlobe(globe, t);
  layer.tick(now);
  compare.tick(now);
  missLine.tick(now);
  currents.tick(now);
  tickNight(dt);
  if (guess && !quiz.waiting) cancelGuess(); // the round moved on (hint, Show me, next)
  thrills.tick(now);
  if (anchor) {
    camDir.copy(globe.camera.position).normalize();
    const vis = anchor.dot(camDir) > 0.2;
    const { x: W, y: H } = globe.size;
    tmp.copy(anchor).multiplyScalar(1.002).project(globe.camera);
    const ax = (tmp.x + 1) / 2 * W, ay = (1 - tmp.y) / 2 * H;
    pin.place(ax, ay, vis);
    ui.placeTag(ax, ay - pin.height, vis, W, H);
    ui.placePopup(ax, ay, vis, W, H);
  }
  // phones: while nothing moves (reading a card, idle with auto-rotate paused) draw every other frame; the ocean and
  // stars still animate at 30 fps and the battery lasts noticeably longer. Any movement goes straight back to full rate.
  const calm = TIER === 'low' && !globe.flight && !globe.zoom && !spin.dragging && spin.momentum() < 0.02 && spin.auto < 0.01
    && !compare.anim && !compare.drag && !pointers.size;
  halfRate = calm && !halfRate;
  if (!halfRate) globe.renderer.render(globe.scene, globe.camera);
  requestAnimationFrame(frame);
}
let halfRate = false;

// Build the first view after the loader has painted, then warm the others in the background.
requestAnimationFrame(() => setTimeout(async () => {
  await layer.buildAsync(viewKey, f => setLoader(`Drawing countries… ${Math.round(f * 100)}%`, 0.7 + 0.3 * f));
  setLoader(null, 1);
  layer.setView(viewKey);
  applyLens();
  document.body.classList.add('ready');
  // deep links: ?c=FRA · ?compare=FRA,DEU · ?play=daily
  const c = params.get('c'), cmp = params.get('compare')?.split(','), play = params.get('play');
  if (cmp?.length === 2 && cmp[0] !== cmp[1] && layer.get(cmp[0]) && layer.get(cmp[1])) { mode = 'compare'; compare.start(layer.get(cmp[0]), layer.get(cmp[1])); }
  else if (play === 'daily' || play === 'classic') startGame(play);
  else if (c && layer.get(c)) openCountry(layer.get(c), { fly: true });
  const chip = layer.get(cotdKey) && mountDailyChip(document.getElementById('cotd'), { o: layer.get(cotdKey), onGo: goDaily });
  if (chip && !c && !cmp && !play) setTimeout(() => chip.show(), 1400); // after the globe has settled in
  requestAnimationFrame(frame);
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  for (const k of Object.keys(data.views)) if (k !== viewKey) idle(() => layer.build(k));
}, 30));

// Small public API for later integrations / debugging
window.EarthInteractive = {
  globe, layer, compare, ads, data, thrills, spin, quiz, search, native, sfx, music, currents,
  setLens: k => { lensKey = LENSES[k] ? k : 'none'; applyLens(); },
  setView: k => { if (!data.views[k]) return false; ui.setViewSilently(k); switchView(k); return true; },
  compareKeys: (a, b) => { const A = layer.get(a), B = layer.get(b); if (!A || !B || A === B) return false; closePopup(); cancelPick(); mode = 'compare'; compare.start(A, B); return true; },
};
