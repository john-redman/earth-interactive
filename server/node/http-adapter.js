// Bridges node:http and the WHATWG fetch API: IncomingMessage → Request, Response → ServerResponse.
import { Readable } from 'node:stream';

/** Read the request body, refusing anything over maxBytes (→ null). */
async function readBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * The client's IP for rate limiting. With trustProxy, the last X-Forwarded-For entry (added by our own
 * reverse proxy; earlier entries come from the client and can be forged), else the socket address.
 */
export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
    if (xff.length) return xff.at(-1);
  }
  return req.socket.remoteAddress || 'unknown';
}

/** IncomingMessage → Request, or { tooLarge: true } when the body exceeds maxBytes. */
export async function toRequest(req, { maxBytes = 65_536 } = {}) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.startsWith(':') || k === 'cf-connecting-ip') continue;   // only Cloudflare may set that one
    for (const one of Array.isArray(v) ? v : [v]) headers.append(k, one);
  }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await readBody(req, maxBytes);
    if (!body) return { tooLarge: true };
    init.body = body;
  }
  return { request: new Request(url, init) };
}

/** Stream a Response into a ServerResponse. */
export async function sendResponse(res, response) {
  const headers = {};
  response.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(response.status, headers);
  if (!response.body || res.req?.method === 'HEAD') { res.end(); return; }
  await new Promise((resolve, reject) => {
    Readable.fromWeb(response.body).on('error', reject).pipe(res).on('finish', resolve).on('error', reject);
  });
}
