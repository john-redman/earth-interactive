// DOM UI: view switch pill, country popup, compare bar, pick banner, hint, hover tooltip.
import { flagImg } from './flags.js';
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

export function createUI({ data, initialView, onView, onCompareRequest, onCompareCancelPick, onCompareReset, onCompareEnd, onClosePopup, onNeighbour, onShare }) {
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
      ${extra.lens ? `<p class="pop-lens"><span>${esc(extra.lens.label)}</span>${esc(extra.lens.text)}</p>` : ''}
      ${neighbours(extra.neighbours, i, u)}
      ${u.note ? `<p class="pop-note"><span>${esc(v.label)}</span>${esc(u.note)}</p>` : ''}
      <div class="pop-actions">
        <button class="btn primary" type="button" data-act="compare">${ICON_COMPARE} Compare size</button>
        <a class="btn ghost" href="${wiki}" target="_blank" rel="noopener">Learn more ↗</a>
      </div>`;
    const same = pop.dataset.key === o.key && !pop.hidden;
    pop.dataset.key = o.key;
    pop.hidden = false; dot.hidden = false; document.body.classList.add('card-open');
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
  function hidePopup() { popFor = null; pop.hidden = true; dot.hidden = true; delete pop.dataset.key; document.body.classList.remove('card-open'); }

  // Phone sheet: opens as a short peek (name + key facts) so the globe stays visible.
  // Swipe up or tap the handle to expand; swipe down to shrink, then to close.
  function setPeek(on) {
    pop.classList.toggle('peek', on);
    const grab = $('.pop-grab', pop);
    if (grab) { grab.setAttribute('aria-expanded', String(!on)); grab.setAttribute('aria-label', on ? 'Show more' : 'Show less'); }
    if (on) pop.scrollTop = 0;
  }
  let swipe = null;
  pop.addEventListener('click', e => {
    if (!pop.classList.contains('sheet')) return;
    if (e.target.closest('.pop-grab')) setPeek(!pop.classList.contains('peek'));
    else if (pop.classList.contains('peek') && e.target.closest('.pop-head')) setPeek(false);
  });
  pop.addEventListener('touchstart', e => {
    if (!pop.classList.contains('sheet') || e.touches.length !== 1) return;
    swipe = { y: e.touches[0].clientY, t: performance.now(), top: pop.scrollTop };
  }, { passive: true });
  pop.addEventListener('touchend', e => {
    if (!swipe) return;
    const dy = e.changedTouches[0].clientY - swipe.y, quick = performance.now() - swipe.t < 600, s = swipe; swipe = null;
    if (!quick || Math.abs(dy) < 40) return;
    const peek = pop.classList.contains('peek');
    if (dy < 0 && peek) setPeek(false);
    else if (dy > 0 && s.top <= 0) { if (peek) onClosePopup(); else setPeek(true); }
  }, { passive: true });
  /** Called every frame with the projected anchor. */
  function placePopup(x, y, visible, vw, vh) {
    if (pop.hidden) return;
    const mobile = vw < 720;
    pop.classList.toggle('sheet', mobile);
    pop.classList.toggle('away', !visible && !mobile);
    dot.style.opacity = visible ? 1 : 0;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    if (mobile) { pop.style.transform = ''; return; }
    const w = pop.offsetWidth, h = pop.offsetHeight, m = 16;
    let px = x + 22, py = y - h / 2;
    if (px + w > vw - m - (window.__adInset || 0)) px = x - 22 - w;
    px = Math.max(m + (window.__adInset || 0), Math.min(px, vw - w - m - (window.__adInset || 0)));
    py = Math.max(m + 84, Math.min(py, vh - h - m));
    pop.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px)`;
  }

  // ---------- pick banner / compare bar ----------
  const pick = $('#pick-banner'), bar = $('#compare-bar');
  function showPick(o) {
    pick.innerHTML = `<span class="pulse"></span>Choose a country to compare with <b>${esc(o.unit.n)}</b><button type="button" class="btn small ghost">Cancel</button>`;
    pick.hidden = false; $('button', pick).onclick = () => onCompareCancelPick();
  }
  function hidePick() { pick.hidden = true; }
  function showCompare(state) {
    if (!state) { bar.hidden = true; return; }
    const { a, b } = state;
    const A = { n: a.o.unit.n, area: a.area }, B = { n: b.o.unit.n, area: b.area };
    const big = A.area >= B.area ? [A, B] : [B, A];
    const r = big[0].area / big[1].area;
    const ratio = r >= 1.5 ? `<b>${r >= 10 ? Math.round(r) : r.toFixed(1)}×</b> the size of` : r >= 1.01 ? `<b>${Math.round((r - 1) * 100)}%</b> larger than` : 'about the same size as';
    const sub = x => `${fmtArea(x.area)}${x.trimmed ? ' · <em>main territory</em>' : ''}`;
    bar.innerHTML = `
      <div class="cmp-row">
        <div class="cmp-item" style="--c:${a.hex}"><i></i><div><b>${esc(A.n)}</b><span>${sub(a)}</span></div></div>
        <span class="cmp-vs">vs</span>
        <div class="cmp-item" style="--c:${b.hex}"><i></i><div><b>${esc(B.n)}</b><span>${sub(b)}</span></div></div>
      </div>
      <p class="cmp-ratio">${esc(big[0].n)} is ${ratio} ${esc(big[1].n)}</p>
      <div class="cmp-actions">
        <span class="cmp-tip">Drag a piece to move it · drag the ocean to spin</span>
        <button class="btn small ghost" type="button" data-act="reset">Side by side</button>
        <button class="btn small primary" type="button" data-act="done">Done</button>
      </div>`;
    bar.hidden = false; bar.classList.remove('in'); void bar.offsetWidth; bar.classList.add('in');
    $('[data-act="reset"]', bar).onclick = () => onCompareReset();
    $('[data-act="done"]', bar).onclick = () => onCompareEnd();
  }

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

  return { showPopup, hidePopup, placePopup, get popFor() { return popFor; }, showPick, hidePick, showCompare, showTip, dismissHint, showToast, setViewSilently(k) { current = k; paintSwitch(); } };
}

const ICON_LINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>';
const ICON_COMPARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="8" height="10" rx="2"/><rect x="13" y="4" width="8" height="16" rx="2"/></svg>';
