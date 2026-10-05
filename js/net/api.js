// Tiny client for the EarthInteractive API (server/). Never throws: every call resolves to a result
// object, or to null when there is no backend, the network is down or the request timed out — so the
// static site keeps working exactly as before.
import { cleanName, nameProblem } from './profanity.js';

/**
 * Where the API lives, without a trailing slash, e.g. 'https://earth-interactive-api.<account>.workers.dev'.
 * Empty = offline mode: no requests, every call resolves to null.
 * For testing without editing this file: localStorage.setItem('ei-api-base', 'http://localhost:8787').
 */
export const API_BASE = '';

const TIMEOUT_MS = 6000;
const PLAYER_KEY = 'ei-player';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const base = () => (store.get('ei-api-base') || API_BASE || '').replace(/\/+$/, '');

/** True when a backend is configured. */
export const online = () => !!base();

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;   // version 4, RFC 4122 variant
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let memo = null;   // keeps the same id for this visit even when localStorage is blocked

/**
 * This browser's anonymous player: { id, name }. The id is made once and kept in localStorage;
 * it is the player's only key, so it is never shown in the UI. name is null until one is saved.
 */
export function getPlayer() {
  if (memo) return { ...memo };
  const saved = store.get(PLAYER_KEY);
  memo = saved && typeof saved.id === 'string' ? { id: saved.id, name: saved.name || null } : { id: uuid(), name: null };
  if (!saved) store.set(PLAYER_KEY, memo);
  return { ...memo };
}

function savePlayer(p) { memo = { ...p }; store.set(PLAYER_KEY, memo); }

/** fetch → parsed JSON body (also for 4xx/5xx with a JSON body), or null on network error/timeout/offline. */
async function request(path, { method = 'GET', body } = {}) {
  const root = base();
  if (!root) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(root + path, {
      method, signal: ctl.signal, mode: 'cors', credentials: 'omit', cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return data && typeof data === 'object' ? data : { ok: false, error: 'http-' + res.status };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Claim or change the display name.
 * → { ok: true, name } | { ok: false, error: 'short'|'long'|'chars'|'profane'|'reserved'|'taken'|'rate-limit'|…, message }
 *   | null (offline / unreachable). Checked locally first, so a bad name never leaves the browser.
 */
export async function setName(name) {
  const clean = cleanName(name);
  const problem = nameProblem(clean);
  if (problem) return { ok: false, error: problem };
  const p = getPlayer();
  const res = await request('/api/name', { method: 'POST', body: { player: p.id, name: clean } });
  if (res?.ok) savePlayer({ ...p, name: res.name });
  return res;
}

/**
 * Submit a finished game. result: { game, period, score, details: { rounds: [{ k, pts }] }, durationMs }
 * → { ok: true, stored, duplicate, me: { rank, name, score, durationMs } } | { ok: false, error, message } | null.
 * error 'no-name': save a name first (setName), then submit again.
 */
export async function submitScore({ game, period, score, details, durationMs }) {
  const p = getPlayer();
  if (!online()) return null;
  if (!p.name) return { ok: false, error: 'no-name' };
  const body = { player: p.id, game, period, score, details, durationMs: Math.round(durationMs) };
  let res = await request('/api/scores', { method: 'POST', body });
  if (res?.error === 'no-player') {
    // the name is saved locally but the server doesn't know it (database reset, first run after going online)
    const claimed = await setName(p.name);
    if (!claimed?.ok) {
      if (claimed) savePlayer({ ...p, name: null });   // e.g. someone else took the name meanwhile
      return claimed && { ok: false, error: 'no-name', message: claimed.message };
    }
    res = await request('/api/scores', { method: 'POST', body });
  }
  return res;
}

/**
 * Top list for one game and period, plus this player's own rank when they have a score.
 * → { ok: true, game, period, top: [{ rank, name, score, durationMs }], me: {…} | null } | { ok: false, … } | null.
 */
export async function getLeaderboard({ game = 'daily', period, limit = 10 } = {}) {
  if (!online()) return null;
  const q = new URLSearchParams({ game, period, limit: String(limit), player: getPlayer().id });
  return request('/api/leaderboard?' + q);
}
