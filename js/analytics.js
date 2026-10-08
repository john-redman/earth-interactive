// Privacy-friendly page and event counts with GoatCounter (https://www.goatcounter.com): no cookies,
// no personal data, so no consent banner. Does nothing until GOATCOUNTER_CODE is set, on localhost,
// or inside the native app.
//
// Keep GOATCOUNTER_CODE equal to `goatcounter` in tools/site.config.mjs (the page build checks it).
export const GOATCOUNTER_CODE = '';

const enabled = !!GOATCOUNTER_CODE
  && typeof window !== 'undefined'
  && window.EI_PLATFORM !== 'native'
  && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

const queue = [];

if (enabled) {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  s.onload = () => { while (queue.length) send(queue.shift()); };
  document.head.append(s);
}

function send(e) {
  try { window.goatcounter?.count?.(e); } catch { /* blocked or offline: counts are best effort */ }
}

/** Count an event, e.g. track('compare', 'FRA,DEU'). Shows in GoatCounter as the path `name`. */
export function track(name, title = '') {
  if (!enabled) return;
  const e = { path: name, title: title || name, event: true };
  if (window.goatcounter?.count) send(e); else if (queue.length < 50) queue.push(e);
}

/**
 * Errors from visitors' devices, so bugs on real phones show up: each distinct message once per visit, at most 10,
 * as an event path like `error/TypeError: x is undefined @ main.js:120`. No personal data, only the message and file.
 */
const reported = new Set();
function reportError(msg, file, line) {
  const key = `${String(msg).slice(0, 120)}${file ? ` @ ${String(file).split('/').pop()}:${line || 0}` : ''}`;
  if (reported.has(key) || reported.size >= 10) return;
  reported.add(key);
  track(`error/${key}`, 'JavaScript error');
}
if (enabled) {
  addEventListener('error', e => reportError(e.message || e.error?.message || 'error', e.filename, e.lineno));
  addEventListener('unhandledrejection', e => reportError(`promise: ${e.reason?.message || e.reason}`));
}
