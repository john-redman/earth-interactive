// "Find it" geography game: a classic 10-question round and a Daily Challenge everyone shares.
import { createLeaderboard } from './leaderboard.js';
import { shareBase } from './site.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KM = 6371.0088;
const int = new Intl.NumberFormat('en-US');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const MODES = {
  classic: { label: 'Find it', count: 10, tiers: [400e3, 400e3, 400e3, 80e3, 80e3, 80e3, 80e3, 5e3, 5e3, 5e3] },
  daily:   { label: 'Daily Challenge', count: 5, tiers: [400e3, 150e3, 50e3, 15e3, 2e3] },
};

/** Points for a miss fall off with distance; a hint halves the maximum. */
const pointsFor = (km, hinted) => Math.round((hinted ? 500 : 1000) * Math.exp(-km / 1500));
const square = pts => (pts >= 1000 ? 'perfect' : pts >= 500 ? 'close' : pts >= 100 ? 'near' : 'miss');

export function createQuiz({ data, layer, globe, flyTo, onExit, onMode, onMiss, onResult }) {
  const el = document.getElementById('quiz');
  // countries that exist as a country in all three border views → questions work whatever view you're in
  const viewKeys = Object.values(data.views).map(v => new Map(v.units.map(u => [u.k, u])));
  const pool = data.views.defacto.units
    .filter(u => u.t === 'country' && viewKeys.every(m => m.get(u.k)?.t === 'country'))
    .map(u => ({ k: u.k, area: u.area }))
    .sort((a, b) => (a.k < b.k ? -1 : 1));

  let S = null; // game state

  function pickQuestions(mode, rand) {
    const used = new Set();
    return MODES[mode].tiers.map(minArea => {
      const cands = pool.filter(p => p.area >= minArea && !used.has(p.k));
      const p = cands[Math.floor(rand() * cands.length)];
      used.add(p.k); return p.k;
    });
  }

  function start(mode = 'classic') {
    const day = todayKey();
    if (mode === 'daily') {
      const done = store.get('ei-daily-' + day);
      if (done) { S = { mode, day, results: done.results, i: done.results.length, qs: done.qs, finished: true }; onMode(true); renderEnd(); return; }
    }
    const rand = mode === 'daily' ? mulberry32(hash('ei-' + day)) : Math.random;
    S = { mode, day, qs: pickQuestions(mode, rand), i: 0, results: [], hinted: false, answered: false, t0: performance.now() };
    onMode(true);
    ask();
  }

  function target() { return layer.get(S.qs[S.i]); }
  function total() { return S.results.reduce((s, r) => s + r.pts, 0); }

  function ask() {
    S.hinted = false; S.answered = false; layer.clearMarks(); onMiss?.(null);
    const t = target();
    const M = MODES[S.mode];
    el.innerHTML = `
      <div class="qz-top"><span class="qz-mode">${M.label}</span><span class="qz-prog">${S.i + 1} / ${S.qs.length}</span><span class="qz-score">${int.format(total())} pts</span>
        <button class="qz-x" type="button" aria-label="Quit game">✕</button></div>
      <div class="qz-ask"><span>Find</span><b>${esc(t.unit.n)}</b></div>
      <div class="qz-dots">${S.qs.map((_, i) => `<i class="${i < S.results.length ? square(S.results[i].pts) : i === S.i ? 'now' : ''}"></i>`).join('')}</div>
      <p class="qz-msg" aria-live="polite">Click it on the globe. You can spin and zoom first.</p>
      <div class="qz-act"><button class="btn small ghost" type="button" data-a="hint">Hint (½ points)</button><button class="btn small ghost" type="button" data-a="skip">Show me</button></div>`;
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    el.querySelector('.qz-x').onclick = exit;
    el.querySelector('[data-a="hint"]').onclick = hint;
    el.querySelector('[data-a="skip"]').onclick = () => resolve(null, null);
  }

  function hint() {
    if (S.answered || S.hinted) return;
    S.hinted = true;
    const i = target().info;
    el.querySelector('.qz-msg').innerHTML = `Hint: it's in <b>${esc(i.subregion || i.continent || 'the world')}</b>${i.landlocked ? ' and has no coastline' : ''}.`;
    el.querySelector('[data-a="hint"]').disabled = true;
  }

  /** Called by main.js on a click during the game. */
  function answer(o, point) {
    if (!S || S.finished || S.answered) return;
    resolve(o, point);
  }

  function resolve(o, point) {
    S.answered = true;
    const t = target();
    let pts = 0, msg;
    if (o && o.key === t.key) {
      pts = S.hinted ? 500 : 1000;
      layer.setMark(t.key, 'good');
      msg = `<span class="qz-ok">Correct!</span> That's ${esc(t.unit.n)}. <b>+${pts}</b>`;
    } else {
      const km = point ? Math.round(point.clone().normalize().angleTo(t.g.centroid) * KM) : null;
      pts = km == null ? 0 : pointsFor(km, S.hinted);
      if (o) layer.setMark(o.key, 'bad');
      layer.setMark(t.key, 'target');
      msg = km == null
        ? `Here it is: <b>${esc(t.unit.n)}</b>, outlined in white.`
        : `<span class="qz-no">Not quite.</span> ${o ? `That's ${esc(o.unit.n)}. ` : ''}${esc(t.unit.n)} is about <b>${int.format(km)} km</b> away, where the line leads. <b>+${pts}</b>`;
      if (point) onMiss?.(point, t.g.centroid, km); // a line from your guess to the answer
      flyTo(t, point);
    }
    if (o || point) onResult?.(pts >= 1000 || o?.key === t.key); // only for real guesses, not "Show me"
    S.results.push({ k: t.key, pts });
    el.querySelector('.qz-msg').innerHTML = msg;
    el.querySelector('.qz-score').textContent = int.format(total()) + ' pts';
    const dots = el.querySelectorAll('.qz-dots i'); dots[S.i].className = square(pts);
    const last = S.i === S.qs.length - 1;
    el.querySelector('.qz-act').innerHTML = `<button class="btn small primary" type="button" data-a="next">${last ? 'See results' : 'Next country'} →</button>`;
    el.querySelector('[data-a="next"]').onclick = next;
    el.querySelector('[data-a="next"]').focus({ preventScroll: true });
  }

  function next() {
    if (!S?.answered) return;
    S.i++;
    if (S.i >= S.qs.length) return finish();
    ask();
  }

  function finish() {
    S.finished = true; layer.clearMarks(); onMiss?.(null);
    if (S.mode === 'daily') store.set('ei-daily-' + S.day, { results: S.results, qs: S.qs });
    else { const best = store.get('ei-best') || 0; S.newBest = total() > best; if (S.newBest) store.set('ei-best', total()); }
    S.ms = Math.round(performance.now() - S.t0); S.fresh = true; // a just-finished game posts its score once
    renderEnd();
  }

  function shareText() {
    const grid = S.results.map(r => ({ perfect: '🟩', close: '🟨', near: '🟧', miss: '⬛' }[square(r.pts)])).join('');
    const title = S.mode === 'daily' ? `EarthInteractive Daily ${S.day}` : 'EarthInteractive · Find it';
    return `${title}\n${grid} ${int.format(total())}/${int.format(S.qs.length * 1000)}\n${shareBase()}?play=${S.mode}`;
  }

  function renderEnd() {
    const max = S.qs.length * 1000, sc = total();
    const right = S.results.filter(r => r.pts >= 1000).length;
    const verdict = sc >= max * 0.85 ? 'Cartographer level.' : sc >= max * 0.6 ? 'Seasoned traveller.' : sc >= max * 0.35 ? 'Getting your bearings.' : 'The world is big — try again!';
    el.innerHTML = `
      <div class="qz-top"><span class="qz-mode">${MODES[S.mode].label}${S.mode === 'daily' ? ' · ' + S.day : ''}</span><span class="qz-prog"></span><span></span>
        <button class="qz-x" type="button" aria-label="Close">✕</button></div>
      <div class="qz-end"><b>${int.format(sc)}</b><span>of ${int.format(max)} points</span></div>
      <p class="qz-verdict">${verdict} ${right} of ${S.qs.length} found exactly.${S.newBest ? ' <b>New personal best!</b>' : ''}${S.mode === 'daily' ? ' A new challenge arrives tomorrow.' : ''}</p>
      <div class="qz-dots big">${S.results.map(r => `<i class="${square(r.pts)}" title="${esc(layer.get(r.k)?.unit.n || r.k)}: ${r.pts} pts"></i>`).join('')}</div>
      <ul class="qz-review">${S.results.map(r => `<li><button type="button" data-k="${r.k}">${esc(layer.get(r.k)?.unit.n || r.k)}</button><span>${r.pts}</span></li>`).join('')}</ul>
      <div class="qz-board" hidden></div>
      <div class="qz-act">
        <button class="btn small ghost" type="button" data-a="share">Copy result</button>
        ${S.mode === 'daily' ? '<button class="btn small primary" type="button" data-a="classic">Play a free round</button>' : '<button class="btn small primary" type="button" data-a="again">Play again</button>'}
      </div>
      <pre class="qz-share" hidden></pre>`;
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    el.querySelector('.qz-x').onclick = exit;
    el.querySelector('[data-a="share"]').onclick = async e => {
      const txt = shareText();
      try { await navigator.clipboard.writeText(txt); e.target.textContent = 'Copied!'; }
      catch { const pre = el.querySelector('.qz-share'); pre.textContent = txt; pre.hidden = false; const r = document.createRange(); r.selectNodeContents(pre); getSelection().removeAllRanges(); getSelection().addRange(r); e.target.textContent = 'Select & copy below'; }
    };
    const again = el.querySelector('[data-a="again"], [data-a="classic"]');
    again.onclick = () => start('classic');
    el.querySelectorAll('.qz-review button').forEach(b => (b.onclick = () => { const o = layer.get(b.dataset.k); if (o) { layer.clearMarks(); onMiss?.(null); layer.setMark(o.key, 'target'); flyTo(o); } }));
    // leaderboard (stays hidden until a backend is configured in js/net/api.js)
    const board = createLeaderboard({ container: el.querySelector('.qz-board') });
    if (S.fresh) { S.fresh = false; board.submit({ game: S.mode, period: S.day, score: total(), details: { rounds: S.results }, durationMs: S.ms }); }
    else board.render(S.mode, S.day);
  }

  function exit() { S = null; el.hidden = true; layer.clearMarks(); onMiss?.(null); onMode(false); onExit?.(); }

  return {
    start, answer, exit, next,
    get active() { return !!S; },
    get waiting() { return !!S && !S.finished && !S.answered; },
    get canAdvance() { return !!S && !S.finished && S.answered; },
    dailyDone: () => !!store.get('ei-daily-' + todayKey()),
  };
}
