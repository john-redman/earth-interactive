// DOM UI: view switch pill, country popup, compare bar, pick banner, hint, hover tooltip.

/** Play an element's .out animation, then hide it (reopening before then cancels the hide). */
function hideAnimated(el, ms) {
  if (el.hidden) return;
  el.classList.remove('in'); el.classList.add('out');
  clearTimeout(el.hideTimer);
  el.hideTimer = setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, ms);
}
function showAnimated(el) {
  clearTimeout(el.hideTimer); el.classList.remove('out');
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
}
import { flagImg } from './flags.js';
import { attachSheetDrag } from './sheet-drag.js';
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtInt = new Intl.NumberFormat('en-US');
const fmtCompact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
export const fmtArea = km2 => (km2 >= 1e6 ? (km2 / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : fmtInt.format(Math.round(km2))) + ' km²';
const fmtGdp = md => (md >= 1e6 ? '$' + (md / 1e6).toFixed(2) + ' T' : md >= 1e3 ? '$' + (md / 1e3).toFixed(1) + ' B' : '$' + md + ' M');

const ICONS = {
  un: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/></svg>',
  defacto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>',
  neutral: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-2.5 6a2.5 2.5 0 005 0zM19 7l-2.5 6a2.5 2.5 0 005 0z"/></svg>',
};
const SHORT = { un: 'UN', defacto: 'De facto', neutral: 'Neutral' };
const KIND_LABEL = { country: 'Country', territory: 'Territory', limited: 'Limited recognition', breakaway: 'Breakaway region', disputed: 'Disputed area' };

export function createUI({ data, initialView, onView, onCompareRequest, onMoveRequest, onCompareCancelPick, onCompareReset, onCompareEnd, onClosePopup, onNeighbour, onShare, onInfo, onSound, onCompareImage, onSheet }) {
  // ---------- view switch ----------
  const vs = $('#view-switch');
  const order = ['un', 'defacto', 'neutral'];
  vs.innerHTML = `<span class="vs-thumb" aria-hidden="true"></span>` + order.map(k =>
    `<button type="button" role="radio" class="vs-opt" data-view="${k}" aria-checked="false" title="${esc(data.views[k].label)} — ${esc(data.views[k].blurb)}">
       <span class="vs-ico">${ICONS[k]}</span><span class="vs-txt">${SHORT[k]}</span></button>`).join('');
  const caption = $('#view-caption');
  let current = initialView;
  function paintSwitch() {
    const btns = [...vs.querySelectorAll('.vs-opt')];
    btns.forEach(b => { const on = b.dataset.view === current; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; b.classList.toggle('on', on); });
    const active = btns.find(b => b.dataset.view === current);
    const thumb = $('.vs-thumb', vs);
    thumb.style.width = active.offsetWidth + 'px';
    thumb.style.transform = `translateX(${active.offsetLeft}px)`;
    caption.innerHTML = `<b>${esc(data.views[current].label)}</b><span>${esc(data.views[current].blurb)}</span>`;
  }
  vs.addEventListener('click', e => { const b = e.target.closest('.vs-opt'); if (b && b.dataset.view !== current) setView(b.dataset.view); });
  vs.addEventListener('keydown', e => {
    const i = order.indexOf(current);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setView(order[(i + 1) % 3], true); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setView(order[(i + 2) % 3], true); }
  });
  function setView(k, focus) { current = k; paintSwitch(); if (focus) vs.querySelector(`[data-view="${k}"]`).focus(); onView(k); }
  requestAnimationFrame(paintSwitch);
  window.addEventListener('resize', paintSwitch);
  document.fonts?.ready.then(paintSwitch);

  // ---------- popup ----------
  const pop = $('#popup'), dot = $('#anchor-dot');
  let popFor = null;
  function showPopup(o, viewKey, extra = {}) {
    popFor = o;
    const i = o.info, u = o.unit, v = data.views[viewKey];
    const areaTxt = !u.mod && i.areaOfficial ? fmtArea(i.areaOfficial) : '≈ ' + fmtArea(u.area);
    const rows = [
      ['Capital', i.capital ? esc(i.capital) : null],
      ['Population', i.pop ? `${fmtCompact.format(i.pop)}${i.popYear ? ` <em>(${i.popYear})</em>` : ''}${rank(extra.ranks?.pop)}` : null],
      ['Area', areaTxt + (u.mod || !i.areaOfficial ? ' <em>(as mapped)</em>' : '') + rank(extra.ranks?.area)],
      ['Density', i.pop && u.area > 50 && u.t !== 'disputed' ? `${fmtInt.format(Math.round(i.pop / u.area))} <em>people per km²</em>` : null],
      ['Region', esc([i.subregion, i.continent].filter(Boolean).filter((x, k, a) => a.indexOf(x) === k).join(' · ')) || null],
      ['GDP', i.gdp && u.t !== 'disputed' ? `${fmtGdp(i.gdp)}${i.gdpYear ? ` <em>(${i.gdpYear})</em>` : ''}` : null],
      ['Languages', i.languages?.length ? esc(i.languages.join(', ')) : null],
      ['Currency', i.currencies?.length ? esc(i.currencies.join(', ')) : null],
      ['Status', u.t === 'disputed' || u.t === 'breakaway' ? esc(i.status) : i.sovereign ? `Part of ${esc(i.sovereign)}` : null],
    ].filter(r => r[1]);
    const badges = [`<span class="badge k-${u.t}">${KIND_LABEL[u.t] || 'Country'}</span>`];
    if (i.unMember && u.t === 'country') badges.push('<span class="badge">UN member</span>');
    if (i.landlocked) badges.push('<span class="badge">Landlocked</span>');
    const wiki = i.wikidata ? `https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${i.wikidata}` : `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(u.n)}`;
    pop.style.setProperty('--c', o.color);
    pop.innerHTML = `
      <button class="pop-grab" type="button" aria-label="Show more" aria-expanded="false"></button>
      <button class="pop-x" type="button" aria-label="Close">✕</button>
      <button class="pop-x pop-link" type="button" data-act="share" title="Copy a link to ${esc(u.n)}" aria-label="Copy link">${ICON_LINK}</button>
      <div class="pop-head">
        ${flagImg(i, 'pop-flag') || `<span class="pop-swatch"></span>`}
        <div><h2>${esc(u.n)}</h2>${i.formal && i.formal !== u.n ? `<p class="pop-sub">${esc(i.formal)}</p>` : ''}</div>
      </div>
      <div class="badges">${badges.join('')}</div>
      <dl class="pop-stats">${rows.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>
      ${extra.daily ? `<p class="pop-note pop-daily"><span>Country of the day</span>${extra.daily.map(esc).join(' ')}</p>` : ''}
      ${extra.lens ? `<p class="pop-lens"><span>${esc(extra.lens.label)}</span>${esc(extra.lens.text)}</p>` : ''}
      ${neighbours(extra.neighbours, i, u)}
      ${u.note ? `<p class="pop-note"><span>${esc(v.label)}</span>${esc(u.note)}</p>` : ''}
      <div class="pop-actions">
        <button class="btn primary" type="button" data-act="compare">${ICON_COMPARE} Compare size</button>
        <a class="btn ghost" href="${wiki}" target="_blank" rel="noopener">Learn more ↗</a>
      </div>`;
    const same = pop.dataset.key === o.key && !pop.hidden;
    pop.dataset.key = o.key;
    clearTimeout(pop.hideTimer); pop.classList.remove('out');
    pop.classList.toggle('sheet', innerWidth < 720); // decide the layout now, so the right open animation plays
    pop.hidden = false; document.body.classList.add('card-open'); // the pin marks the spot, so no anchor dot
    if (!same) { setPeek(true); pop.scrollTop = 0; pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in'); }
    else setPeek(pop.classList.contains('peek'));
    $('.pop-x', pop).onclick = () => onClosePopup();
    $('[data-act="compare"]', pop).onclick = () => onCompareRequest(o);
    $('[data-act="share"]', pop).onclick = () => onShare?.(o);
    pop.querySelectorAll('[data-nb]').forEach(b => (b.onclick = () => onNeighbour?.(b.dataset.nb)));
  }
  function rank(r) { return r ? ` <em class="rank">#${r[0]} of ${r[1]}</em>` : ''; }
  function neighbours(list, i, u) {
    if (!list || u.t === 'disputed') return '';
    if (!list.length) return i.landlocked === false && (u.t === 'country' || u.t === 'limited') ? '<div class="pop-nb"><span>Neighbours</span><small>No land borders</small></div>' : '';
    return `<div class="pop-nb"><span>Neighbours</span><div>${list.map(n => `<button type="button" class="chip" data-nb="${esc(n.key)}">${esc(n.name)}</button>`).join('')}</div></div>`;
  }
  function hidePopup() {
    popFor = null; dot.hidden = true; delete pop.dataset.key; document.body.classList.remove('card-open');
    hideAnimated(pop, 300);
  }

  // Phone sheet: opens as a short peek (name + key facts) so the globe stays visible.
  // Swipe up or tap the handle to expand; swipe down to shrink, then to close.
  function setPeek(on) {
    pop.classList.toggle('peek', on);
    const grab = $('.pop-grab', pop);
    if (grab) { grab.setAttribute('aria-expanded', String(!on)); grab.setAttribute('aria-label', on ? 'Show more' : 'Show less'); }
    if (on) pop.scrollTop = 0;
  }
  pop.addEventListener('click', e => {
    if (!pop.classList.contains('sheet')) return;
    if (e.target.closest('.pop-grab')) { setPeek(!pop.classList.contains('peek')); onSheet?.(); }
    else if (pop.classList.contains('peek') && e.target.closest('.pop-head')) { setPeek(false); onSheet?.(); }
  });
  attachSheetDrag(pop, {
    enabled: () => pop.classList.contains('sheet'),
    states: () => ({ peek: 196, full: Math.min(pop.scrollHeight + 2, innerHeight * 0.7) }),
    current: () => pop.classList.contains('peek') ? 'peek' : 'full',
    settle: state => { const was = pop.classList.contains('peek'); setPeek(state === 'peek'); if (was !== (state === 'peek')) { onSound?.(was ? 'open' : 'close'); onSheet?.(); } },
    dismiss: () => onClosePopup(),
  });
  // ---------- pin tag: flag + name + two choices, floating above the 3D pin ----------
  const tag = $('#pin-tag');
  let tagFor = null;
  function showTag(o) {
    tagFor = o;
    tag.innerHTML = `
      <div class="tag-name">${flagImg(o.info, 'tag-flag') || '<span class="tag-swatch"></span>'}<b>${esc(o.unit.n)}</b></div>
      <div class="tag-acts">
        <button type="button" class="tag-btn" data-act="move" title="Lift it out and drag it anywhere (or press and hold the country)">${ICON_MOVE}<span>Move</span></button>
        <button type="button" class="tag-btn" data-act="compare">${ICON_COMPARE}<span>Compare</span></button>
        <button type="button" class="tag-btn primary" data-act="info">${ICON_INFO}<span>Info</span></button>
      </div>`;
    tag.style.setProperty('--c', o.color);
    $('[data-act="move"]', tag).onclick = () => onMoveRequest(o);
    tag.hidden = false; tag.classList.remove('in'); void tag.offsetWidth; tag.classList.add('in');
    $('[data-act="compare"]', tag).onclick = () => onCompareRequest(o);
    $('[data-act="info"]', tag).onclick = () => onInfo?.(o);
  }
  function hideTag() { tagFor = null; tag.hidden = true; tag.classList.remove('confirm'); }
  /** In a game: the pin marks your guess and the tag asks to confirm it (no name, that would give it away). */
  function showConfirm({ onYes, onNo }) {
    tagFor = null;
    tag.innerHTML = `
      <div class="tag-name"><b>Your answer?</b></div>
      <div class="tag-acts">
        <button type="button" class="tag-btn" data-act="guess-no">Not here</button>
        <button type="button" class="tag-btn primary" data-act="guess-yes">Confirm</button>
      </div>`;
    tag.style.setProperty('--c', 'var(--accent)');
    tag.classList.add('confirm');
    tag.hidden = false; tag.classList.remove('in'); void tag.offsetWidth; tag.classList.add('in');
    $('[data-act="guess-no"]', tag).onclick = onNo;
    $('[data-act="guess-yes"]', tag).onclick = onYes;
    $('[data-act="guess-yes"]', tag).focus({ preventScroll: true });
  }
  /** Called every frame with the projected pin head. */
  function placeTag(x, y, visible, vw) {
    if (tag.hidden) return;
    const w = tag.offsetWidth, h = tag.offsetHeight, m = 8;
    const px = Math.max(m, Math.min(x - w / 2, vw - w - m)), py = Math.max(m + 60, y - h - 10);
    tag.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px)`;
    tag.classList.toggle('away', !visible);
  }

  /** Called every frame with the projected anchor. */
  function placePopup(x, y, visible, vw, vh) {
    if (pop.hidden) return;
    const mobile = vw < 720;
    pop.classList.toggle('sheet', mobile);
    pop.classList.toggle('away', !visible && !mobile);
    dot.style.opacity = visible ? 1 : 0;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    if (mobile) { pop.style.transform = ''; return; }
    // docked on the right, below the dock; main.js turns the globe so the country sits in the space beside it
    const w = pop.offsetWidth, h = pop.offsetHeight, m = 16, inset = window.__adInset || 0;
    const px = vw - w - m - inset, py = Math.max(m + 68, Math.min((vh - h) / 2, vh - h - m));
    pop.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px)`;
  }

  // ---------- pick banner / compare bar ----------
  const pick = $('#pick-banner'), bar = $('#compare-bar');
  /**
   * One banner for a lifted country, however it was lifted: Move leads with dragging, Compare with choosing the
   * second country, and both can do either (dragging, then tapping another country, turns into a comparison).
   */
  function showPick(o, intent = 'compare') {
    const n = `<b>${esc(o.unit.n)}</b>`;
    const keys = !matchMedia('(pointer: coarse)').matches; // keyboards: the arrow keys move it too
    const [main, sub] = intent === 'move'
      ? [`Drag ${n} anywhere`, keys ? 'Or use the arrow keys. Click another country to compare sizes' : 'Tap another country to compare sizes']
      : [`${keys ? 'Click' : 'Tap'} a country to compare with ${n}`, keys ? `Or drag ${n} around first, or move it with the arrow keys` : `Or drag ${n} around first`];
    const again = !pick.hidden && pick.dataset.key === o.key;
    pick.dataset.key = o.key;
    pick.innerHTML = `<span class="pulse"></span><span class="pk-text"><span>${main}</span><small>${sub}</small></span><button type="button" class="btn small ghost">Put back</button>`;
    pick.hidden = false; $('button', pick).onclick = () => onCompareCancelPick();
    if (!again) { pick.classList.remove('in'); void pick.offsetWidth; pick.classList.add('in'); }
  }
  function hidePick() { pick.hidden = true; }
  let cmpOpen = false; // stats table expanded; kept while the same comparison stays up
  const pill = $('#compare-pill');
  pill.innerHTML = `<button type="button" class="pill-main" data-act="stats" aria-controls="compare-bar">${ICON_COMPARE}<span>Compare stats</span></button>`
    + `<button type="button" class="pill-x" data-act="done" aria-label="End comparison" title="End comparison">✕</button>`;
  $('[data-act="stats"]', pill).onclick = () => setCmpOpen(true);
  $('[data-act="done"]', pill).onclick = () => onCompareEnd();
  function setCmpOpen(on, animate = true) {
    cmpOpen = on;
    bar.classList.toggle('open', on);
    if (on) { if (animate || bar.hidden) showAnimated(bar); else { clearTimeout(bar.hideTimer); bar.hidden = false; } pill.hidden = true; }
    else { hideAnimated(bar, 320); pill.hidden = false; }
    const grab = $('.cmp-grab', bar), btn = $('[data-act="stats"]', bar);
    grab?.setAttribute('aria-expanded', String(on)); grab?.setAttribute('aria-label', on ? 'Hide stats' : 'Compare stats');
    btn?.setAttribute('aria-expanded', String(on));
    if (btn) btn.textContent = on ? 'Hide stats' : 'Compare stats';
    if (!on) bar.scrollTop = 0;
  }
  /** Side-by-side facts; the larger number in each row is highlighted in that country's colour. */
  function statsTable(a, b) {
    const A = a.o.info, B = b.o.info, ua = a.o.unit, ub = b.o.unit;
    const area = (i, u) => i.areaOfficial || u.area;
    const density = (i, u) => i.pop && area(i, u) > 50 ? i.pop / area(i, u) : null;
    const perPerson = i => i.gdp && i.pop ? i.gdp * 1e6 / i.pop : null;
    const num = (label, va, vb, fmt) => {
      if (va == null && vb == null) return '';
      const win = va != null && vb != null && va !== vb ? (va > vb ? 'a' : 'b') : '';
      const ratio = win ? Math.max(va, vb) / Math.min(va, vb) : 0;
      const r = ratio >= 1.05 ? `<small>${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×</small>` : '';
      return `<div class="cs-row"><span class="cs-a${win === 'a' ? ' win' : ''}">${va != null ? fmt(va) : '—'}</span>`
        + `<span class="cs-k">${label}${r}</span><span class="cs-b${win === 'b' ? ' win' : ''}">${vb != null ? fmt(vb) : '—'}</span></div>`;
    };
    const txt = (label, va, vb) => va || vb
      ? `<div class="cs-row txt"><span class="cs-a">${esc(va || '—')}</span><span class="cs-k">${label}</span><span class="cs-b">${esc(vb || '—')}</span></div>` : '';
    return [
      num('Population', A.pop, B.pop, v => fmtCompact.format(v)),
      num('Area', area(A, ua), area(B, ub), fmtArea),
      num('People per km²', density(A, ua), density(B, ub), v => fmtInt.format(Math.round(v))),
      num('GDP', A.gdp, B.gdp, fmtGdp),
      num('GDP per person', perPerson(A), perPerson(B), v => '$' + fmtInt.format(Math.round(v))),
      num('Land neighbours', A.borders?.length ?? null, B.borders?.length ?? null, v => String(v)),
      txt('Capital', A.capital, B.capital),
      txt('Region', A.subregion || A.continent, B.subregion || B.continent),
      txt('Languages', A.languages?.slice(0, 3).join(', '), B.languages?.slice(0, 3).join(', ')),
      txt('Currency', A.currencies?.join(', '), B.currencies?.join(', ')),
    ].join('');
  }
  function showCompare(state) {
    if (!state) { hideAnimated(bar, 320); pill.hidden = true; cmpOpen = false; bar.classList.remove('open'); return; }
    const { a, b } = state;
    const A = { n: a.o.unit.n, area: a.area }, B = { n: b.o.unit.n, area: b.area };
    const big = A.area >= B.area ? [A, B] : [B, A];
    const r = big[0].area / big[1].area;
    const ratio = r >= 1.5 ? `<b>${r >= 10 ? Math.round(r) : r.toFixed(1)}×</b> the size of` : r >= 1.01 ? `<b>${Math.round((r - 1) * 100)}%</b> larger than` : 'about the same size as';
    const sub = x => `${fmtArea(x.area)}${x.trimmed ? ' · <em>main territory</em>' : ''}`;
    const pairKey = a.o.key + '|' + b.o.key, samePair = bar.dataset.pair === pairKey && !bar.hidden;
    if (!samePair) cmpOpen = false;
    bar.dataset.pair = pairKey;
    bar.style.setProperty('--ca', a.hex); bar.style.setProperty('--cb', b.hex);
    bar.innerHTML = `
      <button class="cmp-grab" type="button" aria-label="Compare stats" aria-expanded="false" aria-controls="cmp-stats"></button>
      <div class="cmp-row">
        <div class="cmp-item" style="--c:${a.hex}"><i></i><div><b>${esc(A.n)}</b><span>${sub(a)}</span></div></div>
        <span class="cmp-vs">vs</span>
        <div class="cmp-item" style="--c:${b.hex}"><i></i><div><b>${esc(B.n)}</b><span>${sub(b)}</span></div></div>
      </div>
      <p class="cmp-ratio">${esc(big[0].n)} is ${ratio} ${esc(big[1].n)}</p>
      <div id="cmp-stats" class="cmp-stats">${statsTable(a, b)}</div>
      <div class="cmp-actions">
        <span class="cmp-tip">Drag a piece to move it · drag the ocean to spin</span>
        <button class="btn small ghost" type="button" data-act="stats" aria-expanded="false" aria-controls="cmp-stats">Compare stats</button>
        <button class="btn small ghost" type="button" data-act="reset">Side by side</button>
        <button class="btn small ghost" type="button" data-act="image" aria-label="Share image" title="A square image for social posts">${ICON_IMAGE}<span>Share image</span></button>
        <button class="btn small primary" type="button" data-act="done">Done</button>
      </div>`;
    if (!samePair) { pill.classList.remove('in'); void pill.offsetWidth; pill.classList.add('in'); }
    setCmpOpen(cmpOpen, !samePair);
    $('.cmp-grab', bar).onclick = () => setCmpOpen(!cmpOpen);
    $('[data-act="stats"]', bar).onclick = () => setCmpOpen(!cmpOpen);
    $('[data-act="reset"]', bar).onclick = () => onCompareReset();
    $('[data-act="image"]', bar).onclick = async e => {
      const btn = e.currentTarget; if (btn.disabled) return;
      btn.disabled = true; btn.querySelector('span').textContent = 'Making image…';
      try { await onCompareImage?.(); } finally { btn.disabled = false; btn.querySelector('span').textContent = 'Share image'; }
    };
    $('[data-act="done"]', bar).onclick = () => onCompareEnd();
  }

  // drag the stats panel down to put it away (it follows the finger); swipe up on the pill to open it
  attachSheetDrag(bar, {
    enabled: () => cmpOpen,
    states: () => ({ peek: null, full: Math.min(bar.scrollHeight + 2, innerHeight * 0.72) }),
    current: () => 'full',
    settle: () => {},
    dismiss: () => { setCmpOpen(false); onSound?.('close'); },
  });
  let pillY = null;
  pill.addEventListener('touchstart', e => { pillY = e.touches[0].clientY; }, { passive: true });
  pill.addEventListener('touchmove', e => { if (pillY != null && pillY - e.touches[0].clientY > 24) { pillY = null; setCmpOpen(true); onSound?.('open'); } }, { passive: true });

  // ---------- hover tooltip ----------
  const tip = $('#tooltip');
  function showTip(text, x, y) {
    if (!text) { tip.hidden = true; return; }
    tip.textContent = text; tip.hidden = false;
    tip.style.transform = `translate(${x + 14}px, ${y + 16}px)`;
  }

  // ---------- first-run hint ----------
  const hint = $('#hint');
  if (matchMedia('(pointer: coarse)').matches) hint.innerHTML = '<span><kbd>Drag</kbd> to spin</span><span><kbd>Tap</kbd> a country</span><span><kbd>Pinch</kbd> to zoom</span>';
  const dismissHint = () => hint.classList.add('gone');
  setTimeout(dismissHint, 9000);

  // ---------- toast ----------
  const toast = $('#toast'); let toastT;
  function showToast(msg) { toast.textContent = msg; toast.hidden = false; toast.classList.remove('in'); void toast.offsetWidth; toast.classList.add('in'); clearTimeout(toastT); toastT = setTimeout(() => (toast.hidden = true), 2600); }

  return { showPopup, hidePopup, placePopup, get popFor() { return popFor; }, showTag, hideTag, showConfirm, placeTag, get tagFor() { return tagFor; }, showPick, hidePick, showCompare, showTip, dismissHint, showToast, setViewSilently(k) { current = k; paintSwitch(); } };
}

const ICON_LINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>';
const ICON_INFO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/></svg>';
const ICON_MOVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M9 5.5L12 2.5l3 3M9 18.5l3 3 3-3M5.5 9L2.5 12l3 3M18.5 9l3 3-3 3"/></svg>';
const ICON_COMPARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="8" height="10" rx="2"/><rect x="13" y="4" width="8" height="16" rx="2"/></svg>';
const ICON_IMAGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8 8.5"/></svg>';
