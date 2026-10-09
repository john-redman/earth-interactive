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

/** Daily Challenges finished in a row up to and including `day` (the results live on this device). */
export function dailyStreak(day = todayKey()) {
  const d = new Date(day + 'T12:00:00'); let n = 0; // local noon: never trips over a daylight-saving hour
  while (n < 3660 && store.get('ei-daily-' + todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** "in 6 h" / "in 40 min": time left until the next local midnight, when the next Daily Challenge opens. */
export function untilTomorrow(now = new Date()) {
  const next = new Date(now); next.setHours(24, 0, 0, 0);
  const min = Math.max(1, Math.round((next - now) / 6e4));
  return min >= 90 ? `in ${Math.round(min / 60)} h` : `in ${min} min`;
}

const MODES = {
  classic: { label: 'Find it', count: 10, tiers: [400e3, 400e3, 400e3, 80e3, 80e3, 80e3, 80e3, 5e3, 5e3, 5e3] },
  daily:   { label: 'Daily Challenge', count: 5, tiers: [400e3, 150e3, 50e3, 15e3, 2e3] },
};

/** How long a result stays up before the game moves on (ms): a miss has a line to follow and a distance to read. */
const TAP = matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click';
export const AUTO_MS = { right: 2600, miss: 5200, shown: 4200 };

/** Points for a miss fall off with distance; a hint halves the maximum. */
const pointsFor = (km, hinted) => Math.round((hinted ? 500 : 1000) * Math.exp(-km / 1500));
const square = pts => (pts >= 1000 ? 'perfect' : pts >= 500 ? 'close' : pts >= 100 ? 'near' : 'miss');

export function createQuiz({ data, layer, globe, flyTo, onExit, onMode, onMiss, onResult, anchorOf = o => o.g.centroid }) {
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
      <p class="qz-msg" aria-live="polite">${TAP} it on the globe. You can spin and zoom first.</p>
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
      const km = point ? Math.round(point.clone().normalize().angleTo(anchorOf(t)) * KM) : null; // to a point on its land
      pts = km == null ? 0 : pointsFor(km, S.hinted);
      if (o) layer.setMark(o.key, 'bad');
      layer.setMark(t.key, 'target');
      msg = km == null
        ? `Here it is: <b>${esc(t.unit.n)}</b>, outlined in white.`
        : `<span class="qz-no">Not quite.</span> ${o ? `That's ${esc(o.unit.n)}. ` : ''}${esc(t.unit.n)} is about <b>${int.format(km)} km</b> away, where the line leads. <b>+${pts}</b>`;
      if (point) onMiss?.(point, anchorOf(t), km); // a line from your guess to the answer
      flyTo(t, point);
    }
    if (o || point) onResult?.(pts >= 1000 || o?.key === t.key); // only for real guesses, not "Show me"
    S.results.push({ k: t.key, pts });
    el.querySelector('.qz-msg').innerHTML = msg;
    el.querySelector('.qz-score').textContent = int.format(total()) + ' pts';
    const dots = el.querySelectorAll('.qz-dots i'); dots[S.i].className = square(pts);
    const last = S.i === S.qs.length - 1;
    // the result shows for a moment, then the game moves on by itself; the button fills up as the timer, can be
    // pressed to go on at once, and pointing at the panel holds it (CSS pauses the fill)
    const ms = o?.key === t.key ? AUTO_MS.right : point ? AUTO_MS.miss : AUTO_MS.shown;
    el.querySelector('.qz-act').innerHTML = `<button class="btn small primary qz-next" type="button" data-a="next" style="--auto:${ms}ms"><span class="qz-fill" aria-hidden="true"></span><span>${last ? 'See results' : 'Next country'} →</span></button>`;
    const btn = el.querySelector('[data-a="next"]');
    btn.onclick = next;
    btn.querySelector('.qz-fill').addEventListener('animationend', () => { if (S?.answered && !S.finished) next(); });
    btn.focus({ preventScroll: true });
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
    const streak = S.mode === 'daily' ? dailyStreak(S.day) : 0;
    const title = S.mode === 'daily' ? `EarthInteractive Daily ${S.day}${streak >= 2 ? ` · ${streak} days in a row` : ''}` : 'EarthInteractive · Find it';
    return `${title}\n${grid} ${int.format(total())}/${int.format(S.qs.length * 1000)}\n${shareBase()}?play=${S.mode}`;
  }

  function renderEnd() {
    const max = S.qs.length * 1000, sc = total();
    const right = S.results.filter(r => r.pts >= 1000).length;
    const verdict = sc >= max * 0.85 ? 'Cartographer level.' : sc >= max * 0.6 ? 'Seasoned traveller.' : sc >= max * 0.35 ? 'Getting your bearings.' : 'The world is big — try again!';
    const streak = S.mode === 'daily' ? dailyStreak(S.day) : 0;
    const daily = S.mode !== 'daily' ? '' : `${streak >= 2 ? ` <b>${streak} days in a row.</b>` : ''} ${S.day === todayKey() ? `The next challenge opens ${untilTomorrow()}.` : 'A new challenge is waiting today.'}`;
    // phones: the share sheet (messages, socials); computers: the clipboard
    const sheet = TAP === 'Tap' && !!navigator.share;
    el.innerHTML = `
      <div class="qz-top"><span class="qz-mode">${MODES[S.mode].label}${S.mode === 'daily' ? ' · ' + S.day : ''}</span><span class="qz-prog"></span><span></span>
        <button class="qz-x" type="button" aria-label="Close">✕</button></div>
      <div class="qz-end"><b>${int.format(sc)}</b><span>of ${int.format(max)} points</span></div>
      <p class="qz-verdict">${verdict} ${right} of ${S.qs.length} found exactly.${S.newBest ? ' <b>New personal best!</b>' : ''}${daily}</p>
      <div class="qz-dots big">${S.results.map(r => `<i class="${square(r.pts)}" title="${esc(layer.get(r.k)?.unit.n || r.k)}: ${r.pts} pts"></i>`).join('')}</div>
      <ul class="qz-review">${S.results.map(r => `<li><button type="button" data-k="${r.k}">${esc(layer.get(r.k)?.unit.n || r.k)}</button><span>${r.pts}</span></li>`).join('')}</ul>
      <div class="qz-board" hidden></div>
      <div class="qz-act">
        <button class="btn small ghost" type="button" data-a="share">${sheet ? 'Share result' : 'Copy result'}</button>
        ${S.mode === 'daily' ? '<button class="btn small primary" type="button" data-a="classic">Play a free round</button>' : '<button class="btn small primary" type="button" data-a="again">Play again</button>'}
      </div>
      <pre class="qz-share" hidden></pre>`;
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    el.querySelector('.qz-x').onclick = exit;
    el.querySelector('[data-a="share"]').onclick = async e => {
      const txt = shareText();
      if (sheet) {
        try { await navigator.share({ text: txt }); return; }
        catch (err) { if (err?.name === 'AbortError') return; } // closed the sheet; anything else falls back to copying
      }
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
