// Country search: press "/" or Ctrl/⌘ K, type a country, capital or other name, Enter to fly there.
import { flagImg } from './flags.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();

export function createSearch({ getObjects, onPick }) {
  const root = document.getElementById('search');
  root.innerHTML = `
    <div class="sr-box" role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-owns="sr-list">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
      <input id="sr-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search a country or capital…" aria-label="Search a country or capital" aria-controls="sr-list">
      <kbd>Esc</kbd>
    </div>
    <ul id="sr-list" class="sr-list" role="listbox"></ul>`;
  const input = root.querySelector('input'), list = root.querySelector('ul');
  let results = [], active = 0;

  function index() {
    return getObjects().filter(o => o.unit.t !== 'disputed' || o.unit.n).map(o => ({
      o,
      name: norm(o.unit.n),
      also: [o.info.formal, o.info.capital, ...(o.info.alt || [])].filter(Boolean).map(norm),
    }));
  }
  function run(q) {
    const nq = norm(q);
    if (!nq) { results = []; paint(); return; }
    const scored = [];
    for (const e of index()) {
      let s = -1;
      if (e.name === nq) s = 100;
      else if (e.name.startsWith(nq)) s = 80;
      else if (e.name.split(' ').some(w => w.startsWith(nq))) s = 60;
      else if (e.also.some(a => a.startsWith(nq))) s = 45;
      else if (e.name.includes(nq)) s = 35;
      else if (e.also.some(a => a.includes(nq))) s = 20;
      if (s >= 0) scored.push([s + Math.min(10, Math.log10(e.o.unit.area + 1)), e.o]);
    }
    results = scored.sort((a, b) => b[0] - a[0]).slice(0, 8).map(r => r[1]);
    active = 0; paint();
  }
  function paint() {
    list.innerHTML = results.map((o, i) => `
      <li role="option" id="sr-${i}" aria-selected="${i === active}" data-i="${i}" class="${i === active ? 'on' : ''}">
        <span class="sr-flag">${flagImg(o.info, 'sr-flag-img') || '<i></i>'}</span>
        <span class="sr-txt"><b>${esc(o.unit.n)}</b><small>${esc([o.info.capital, o.info.subregion || o.info.continent].filter(Boolean).join(' · '))}</small></span>
      </li>`).join('') || (input.value.trim() ? '<li class="sr-empty">No country matches that name</li>' : '');
    input.setAttribute('aria-activedescendant', results.length ? 'sr-' + active : '');
  }
  function choose(i) { const o = results[i]; if (!o) return; close(); onPick(o); }

  input.addEventListener('input', () => run(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(results.length - 1, active + 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    e.stopPropagation();
  });
  list.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(+li.dataset.i); } });
  root.addEventListener('pointerdown', e => { if (e.target === root) close(); });

  function open() { root.hidden = false; input.value = ''; results = []; paint(); requestAnimationFrame(() => input.focus()); }
  function close() { root.hidden = true; input.blur(); }
  return { open, close, get isOpen() { return !root.hidden; } };
}
