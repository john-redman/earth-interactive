// Leaderboard panel for the quiz results: a name field (checked as you type) and today's top 10, with
// your own row highlighted. Renders nothing when no API is configured (js/net/api.js API_BASE).
import { online, getPlayer, setName, submitScore, getLeaderboard } from './net/api.js';
import { cleanName, nameProblem, NAME_MESSAGES, NAME_MAX } from './net/profanity.js';
import { generateName } from './net/names.js';

const int = new Intl.NumberFormat('en-US');
const TITLES = { daily: 'Daily leaderboard', classic: 'Find it · today' };
const SCORE_ERRORS = {
  'too-fast': 'Score not added: that was too fast to count.',
  'bad-period': 'Score not added: that game has closed.',
  'rate-limit': 'Too many tries. Wait a minute and try again.',
  banned: 'This name can’t post scores.',
};
let uid = 0;

/** Loads css/leaderboard.css once (next to this module), so index.html needs no change. */
function ensureStyles() {
  if (document.querySelector('link[data-lb-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../css/leaderboard.css', import.meta.url).href;
  link.dataset.lbCss = '';
  document.head.append(link);
}

const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/**
 * createLeaderboard({ container, limit = 10 }) → { submit(result), render(game, period), el }
 *   submit({ game, period, score, details, durationMs }) — posts a finished game (asks for a name first
 *     if needed), then shows the board. render(game, period) — just shows the board.
 *   Both resolve when done and never throw.
 */
export function createLeaderboard({ container, limit = 10 }) {
  if (!container) throw new Error('createLeaderboard: container is required');
  if (!online()) { container.hidden = true; return { submit: async () => null, render: async () => null, el: null }; }
  ensureStyles();

  const id = 'lb' + ++uid;
  const el = h('section', 'lb');
  el.setAttribute('aria-labelledby', id + '-t');
  el.innerHTML = `
    <div class="lb-head"><h3 class="lb-title" id="${id}-t">Leaderboard</h3><button class="lb-link" type="button" hidden>Change name</button></div>
    <form class="lb-form" novalidate hidden>
      <label class="lb-label" for="${id}-n">Your name on the leaderboard</label>
      <div class="lb-row">
        <input class="lb-input" id="${id}-n" name="name" type="text" maxlength="${NAME_MAX}" autocomplete="nickname"
          autocapitalize="off" spellcheck="false" aria-describedby="${id}-m" required>
        <button class="btn small ghost lb-shuffle" type="button" title="Suggest another name">Shuffle</button>
        <button class="btn small primary" type="submit">Save</button>
      </div>
      <p class="lb-msg" id="${id}-m" aria-live="polite"></p>
    </form>
    <ol class="lb-list"></ol>
    <p class="lb-status" aria-live="polite"></p>`;
  container.replaceChildren(el);
  container.hidden = false;

  const $ = s => el.querySelector(s);
  const form = $('.lb-form'), input = $('.lb-input'), msg = $('.lb-msg'), list = $('.lb-list'), status = $('.lb-status');
  const rename = $('.lb-link');
  let current = null;   // { game, period } on screen
  let pending = null;   // a result waiting for a name
  let token = 0;        // ignores out-of-date responses

  const say = text => { status.textContent = text || ''; status.hidden = !text; };
  function showProblem(code, force) {
    const show = code && (force || code !== 'short');   // don't nag while the first letters are typed
    msg.textContent = show ? (NAME_MESSAGES[code] || 'Pick a different name.') : '';
    input.setAttribute('aria-invalid', show ? 'true' : 'false');
  }
  function openForm(prompt) {
    form.hidden = false; rename.hidden = true;
    input.value = getPlayer().name || generateName(); // start with a witty suggestion; typing replaces it
    showProblem(null);
    msg.textContent = prompt || '';
    input.focus({ preventScroll: true }); input.select();
  }
  function closeForm() { form.hidden = true; rename.hidden = !getPlayer().name; showProblem(null); }

  input.addEventListener('input', () => showProblem(nameProblem(input.value)));
  rename.addEventListener('click', () => openForm());
  el.querySelector('.lb-shuffle').addEventListener('click', () => { input.value = generateName(); showProblem(null); input.focus({ preventScroll: true }); });
  rename.hidden = !getPlayer().name;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = cleanName(input.value);
    const problem = nameProblem(name);
    if (problem) { showProblem(problem, true); input.focus(); return; }
    const btn = form.querySelector('button'); btn.disabled = true; msg.textContent = 'Saving…';
    const res = await setName(name);
    btn.disabled = false;
    if (!res) { msg.textContent = 'Can’t reach the leaderboard right now. Try again later.'; return; }
    if (!res.ok) { showProblem(res.error, true); if (!NAME_MESSAGES[res.error]) msg.textContent = res.message || 'That didn’t work. Try again.'; return; }
    closeForm();
    if (pending) { const r = pending; pending = null; await submit(r); }
    else if (current) await render(current.game, current.period);
  });

  function row(r, me) {
    const li = h('li', 'lb-item' + (me ? ' me' : ''));
    if (me) li.setAttribute('aria-current', 'true');
    li.append(h('span', 'lb-rank', String(r.rank)), h('span', 'lb-name', r.name), h('span', 'lb-score', int.format(r.score)));
    if (me) li.querySelector('.lb-name').append(h('span', 'lb-you', ' (you)'));
    return li;
  }

  /** Show the top list for a game and period ('YYYY-MM-DD'). */
  async function render(game, period) {
    current = { game, period };
    $('.lb-title').textContent = TITLES[game] || 'Leaderboard';
    const t = ++token;
    list.setAttribute('aria-busy', 'true');
    if (!list.children.length) say('Loading…');
    const res = await getLeaderboard({ game, period, limit });
    if (t !== token) return null;
    list.removeAttribute('aria-busy');
    if (!res?.ok) { list.replaceChildren(); say('Leaderboard unavailable right now.'); return res; }
    const me = res.me;
    const rows = res.top.map(r => row(r, me && r.rank === me.rank));
    if (me && me.rank > res.top.length) rows.push(h('li', 'lb-gap', '…'), row(me, true));
    list.replaceChildren(...rows);
    say(res.top.length ? '' : 'No scores yet. Be the first.');
    return res;
  }

  /** Post a finished game, then show the board. Asks for a name first if this player has none. */
  async function submit(result) {
    current = { game: result.game, period: result.period };
    if (!getPlayer().name) {
      pending = result;
      openForm('Add a name to put your score on the board.');
      return render(result.game, result.period);
    }
    say('Saving your score…');
    const res = await submitScore(result);
    if (res?.error === 'no-name') { pending = result; openForm(res.message || 'Pick a name to put your score on the board.'); }
    const out = await render(result.game, result.period);
    if (!res) say('Can’t reach the leaderboard right now. Your score is saved on this device.');
    else if (!res.ok && res.error !== 'no-name') say(SCORE_ERRORS[res.error] || res.message || 'Score not added.');
    return out;
  }

  return { submit, render, el };
}
