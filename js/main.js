import * as THREE from 'three';
import { loadWorld, setLoader } from './load.js';
import { createGlobe, tickGlobe } from './globe.js';
import { CountryLayer } from './countries.js';
import { Compare } from './compare.js';
import { createUI } from './ui.js';
import { mountAds } from './ads.js';
import { raySphere, vec3ToLonLat } from './geo.js';
import { Thrills } from './thrills.js';
import { Spin } from './spin.js';
import { SKY, updateSun } from './sun.js';
import { LENSES, LENS_ORDER, buildLens, renderLegend } from './lens.js';
import { createSearch } from './search.js';
import { createQuiz } from './quiz.js';

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
const layer = new CountryLayer(globe, data);
const compare = new Compare(globe, layer);
const spin = new Spin(globe);
globe.controls.enableRotate = false; // rotation is ours (flywheel); OrbitControls keeps zoom + idle auto-rotate
const thrills = new Thrills(globe, spin);

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
let anchor = null;            // 3D point the popup is attached to

const ui = createUI({
  data, initialView: viewKey,
  onView: k => switchView(k),
  onCompareRequest: o => { mode = 'pick'; pickFrom = o; closePopup(); layer.setSelected(o); ui.showPick(o); },
  onCompareCancelPick: () => cancelPick(),
  onCompareReset: () => compare.resetPositions(),
  onCompareEnd: () => endCompare(),
  onClosePopup: () => closePopup(),
  onNeighbour: key => { const o = layer.get(key); if (o) openCountry(o, { fly: true }); },
  onShare: o => copyLink(o),
});

compare.onChange = state => { ui.showCompare(state); document.body.classList.toggle('comparing', !!state); setParam('compare', state ? `${state.a.o.key},${state.b.o.key}` : null); };
thrills.onFirstScream = () => setTimeout(() => ui.showToast('Hold on tight! Sound can be muted bottom-right.'), 900);

function switchView(k) {
  viewKey = k;
  if (mode === 'compare') endCompare(true);
  if (mode === 'pick') cancelPick();
  const keep = ui.popFor?.key;
  layer.setView(k);
  const url = new URL(location.href); url.searchParams.set('view', k); history.replaceState(null, '', url);
  applyLens();
  if (keep) {
    const o = layer.get(keep);
    if (o) { layer.setSelected(o); ui.showPopup(o, k, extras(o)); } else closePopup();
  }
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
  };
}
function flyToCountry(o, minDist = 1.6) {
  const r = Math.sqrt(o.unit.area / Math.PI) / 6371;
  const dist = THREE.MathUtils.clamp(1 + r * 6, minDist, Math.max(minDist, globe.fitDistance));
  spin.stop(); globe.flyTo(o.g.centroid, dist, 1200);
}
function openCountry(o, { fly = false, point = null } = {}) {
  if (mode === 'pick') cancelPick();
  layer.setSelected(o);
  anchor = (point || o.g.centroid).clone().normalize();
  ui.showPopup(o, viewKey, extras(o));
  if (fly) flyToCountry(o); else spin.brake();
  globe.hold('card', true); // the globe stays put while a country card is open
  globe.pauseAuto();
  setParam('c', o.key);
}
function setParam(k, v) {
  const url = new URL(location.href);
  if (v == null) url.searchParams.delete(k); else url.searchParams.set(k, v);
  try { history.replaceState(null, '', url); } catch { /* sandboxed */ }
}
async function copyLink(o) {
  const url = new URL(location.href); url.search = ''; url.searchParams.set('view', viewKey); url.searchParams.set('c', o.key);
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
  SKY.uNight.value = lens ? 0 : 0.42;      // no night shading over data colours
  renderLegend(legendEl, lens);
  document.querySelector('[data-dock="lens"]').classList.toggle('on', !!lens);
  if (ui.popFor) ui.showPopup(ui.popFor, viewKey, extras(ui.popFor));
}

// ---------- dock: search, play, data ----------
const search = createSearch({ getObjects: () => layer.view?.objects || [], onPick: o => { if (mode === 'quiz') return; if (mode === 'compare') endCompare(true); openCountry(o, { fly: true }); } });
const quiz = createQuiz({
  data, layer, globe,
  flyTo: o => flyToCountry(o, 2.1),
  onMode: on => {
    ui.showTip(null);
    if (on) { if (mode === 'compare') endCompare(true); if (mode === 'pick') cancelPick(); closePopup(); mode = 'quiz'; layer.setHover(null); }
    else mode = 'browse';
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
      <button type="button" role="menuitem" data-play="classic"><span class="m-ico">10</span><span><b>Find it</b><small>${best ? 'Your best: ' + best.toLocaleString('en-US') + ' pts' : 'Ten countries, getting smaller'}</small></span></button>`;
    m.querySelectorAll('[data-play]').forEach(b => (b.onclick = () => { closeMenus(); quiz.start(b.dataset.play); }));
  } else {
    m.innerHTML = LENS_ORDER.map(k2 => `<button type="button" role="menuitemradio" aria-checked="${k2 === lensKey}" data-lens="${k2}"><span class="m-ramp ${k2 === 'none' ? 'none' : ''}"></span><span><b>${LENSES[k2].short}</b><small>${k2 === 'none' ? 'Political colours, live day & night' : LENSES[k2].label}</small></span></button>`).join('');
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
function tickSun() {
  const now = new Date(); updateSun(now);
  clock.textContent = `Live day & night · ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;
}
tickSun(); setInterval(tickSun, 30000);

function closePopup() {
  ui.hidePopup(); anchor = null; if (mode === 'browse') layer.setSelected(null); setParam('c', null);
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
function cancelPick() { mode = 'browse'; pickFrom = null; ui.hidePick(); layer.setSelected(null); }
function endCompare(immediate) { compare.end(immediate); mode = 'browse'; ui.showCompare(null); }

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
  if (mode === 'compare' && pointers.size === 1) {
    const hit = compare.hitPiece(rayAt(e.clientX, e.clientY));
    if (hit) {
      globe.controls.enabled = false;
      compare.beginDrag(hit);
      canvas.setPointerCapture(e.pointerId);
      stage.classList.add('dragging-piece');
    }
  }
  if (!compare.drag) { if (pointers.size === 1) spin.begin(e.clientX, e.clientY, performance.now()); else spin.cancel(); }
  stage.classList.add('grabbing');
}, { capture: true });

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
    if (mode === 'compare') {
      const hit = compare.hitPiece(rayAt(hx, hy));
      stage.classList.toggle('over-piece', !!hit);
      ui.showTip(hit ? hit.piece.o.unit.n : null, hx, hy);
      return;
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
  if (mode === 'quiz') { if (r && quiz.waiting) quiz.answer(r.o, r.point); return; }
  if (mode === 'pick') {
    if (r?.o && r.o !== pickFrom) {
      const a = pickFrom; ui.hidePick(); pickFrom = null; mode = 'compare';
      layer.setHover(null); compare.start(a, r.o);
    } else if (r?.o === pickFrom) ui.showToast('Pick a different country');
    return;
  }
  if (r?.o) openCountry(r.o, { point: r.point });
  else closePopup();
}

window.addEventListener('keydown', e => {
  if (search.isOpen || e.target.closest?.('input, textarea')) return;
  if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && mode !== 'quiz') { e.preventDefault(); closeMenus(); search.open(); return; }
  if (e.key === 'Escape') {
    if (!Object.values(menus).every(m => m.hidden)) closeMenus();
    else if (mode === 'compare') endCompare(); else if (mode === 'pick') cancelPick(); else if (mode !== 'quiz') closePopup();
    return;
  }
  if ((e.key === 'Home' || e.key.toLowerCase() === 'r') && !e.metaKey && !e.ctrlKey && !e.altKey && mode !== 'quiz') { e.preventDefault(); recenter(); return; }
  if (e.key === 'Enter' && quiz.canAdvance && !e.target.closest?.('button')) { quiz.next(); return; }
  // keyboard spinning & zoom
  const step = 0.12;
  if (e.key === 'ArrowLeft') { spin.pending.t += step; } else if (e.key === 'ArrowRight') { spin.pending.t -= step; }
  else if (e.key === 'ArrowUp') { spin.pending.p -= step; } else if (e.key === 'ArrowDown') { spin.pending.p += step; }
  else if (e.key === '+' || e.key === '=') { globe.camera.position.multiplyScalar(0.88); }
  else if (e.key === '-' || e.key === '_') { globe.camera.position.multiplyScalar(1.12); }
  else return;
  const d = globe.camera.position.length(), c = globe.controls;
  if (d < c.minDistance || d > c.maxDistance) globe.camera.position.setLength(THREE.MathUtils.clamp(d, c.minDistance, c.maxDistance));
  globe.pauseAuto(); e.preventDefault();
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
  thrills.tick(now);
  if (anchor) {
    camDir.copy(globe.camera.position).normalize();
    const vis = anchor.dot(camDir) > 0.2;
    tmp.copy(anchor).multiplyScalar(1.002).project(globe.camera);
    ui.placePopup((tmp.x + 1) / 2 * globe.size.x, (1 - tmp.y) / 2 * globe.size.y, vis, globe.size.x, globe.size.y);
  }
  globe.renderer.render(globe.scene, globe.camera);
  requestAnimationFrame(frame);
}

// Build the first view after the loader has painted, then warm the others in the background.
requestAnimationFrame(() => setTimeout(async () => {
  await layer.buildAsync(viewKey, f => setLoader(`Drawing countries… ${Math.round(f * 100)}%`, 0.7 + 0.3 * f));
  setLoader(null, 1);
  layer.setView(viewKey);
  applyLens();
  document.body.classList.add('ready');
  // deep links: ?c=FRA · ?compare=FRA,DEU · ?play=daily
  const c = params.get('c'), cmp = params.get('compare')?.split(','), play = params.get('play');
  if (cmp?.length === 2 && layer.get(cmp[0]) && layer.get(cmp[1])) { mode = 'compare'; compare.start(layer.get(cmp[0]), layer.get(cmp[1])); }
  else if (play === 'daily' || play === 'classic') quiz.start(play);
  else if (c && layer.get(c)) openCountry(layer.get(c), { fly: true });
  requestAnimationFrame(frame);
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  for (const k of Object.keys(data.views)) if (k !== viewKey) idle(() => layer.build(k));
}, 30));

// Small public API for later integrations / debugging
window.EarthInteractive = {
  globe, layer, compare, ads, data, thrills, spin, quiz, search,
  setLens: k => { lensKey = LENSES[k] ? k : 'none'; applyLens(); },
  setView: k => { ui.setViewSilently(k); switchView(k); },
  compareKeys: (a, b) => { const A = layer.get(a), B = layer.get(b); if (!A || !B) return false; closePopup(); cancelPick(); mode = 'compare'; compare.start(A, B); return true; },
};
