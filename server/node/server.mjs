// Self-hosted EarthInteractive API: the Cloudflare Worker's fetch handler (src/index.js) on node:http,
// with a SQLite file (src/d1-sqlite.js) in place of D1 and an in-memory rate limiter in place of the
// Rate Limiting binding. No npm packages; Node 22+.
//
//   node node/server.mjs            settings from the environment or server/.env (see deploy/.env.example)
//
// PORT (8787) · HOST (127.0.0.1; 0.0.0.0 in Docker) · DB_PATH (data/earth.db) · ALLOWED_ORIGINS ·
// TRUST_PROXY (1 behind Caddy) · RATE_WRITE_PER_MIN (10) · RATE_READ_PER_MIN (120)
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';
import { openD1 } from '../src/d1-sqlite.js';
import { createRateLimiter } from './rate-limit.js';
import { toRequest, sendResponse, clientIp } from './http-adapter.js';
import { loadEnvFile, readConfig } from './config.js';

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
};

/**
 * Open the database and start listening. → { server, db, port, url, close() }.
 * close() stops accepting connections, finishes in-flight requests (up to graceMs), then closes the DB.
 */
export async function start(config = readConfig(), { log = console } = {}) {
  const db = await openD1(config.dbPath);
  const env = {
    DB: db,
    ALLOWED_ORIGINS: config.allowedOrigins,
    RL_WRITE: config.writePerMin ? createRateLimiter({ limit: config.writePerMin }) : undefined,
    RL_READ: config.readPerMin ? createRateLimiter({ limit: config.readPerMin }) : undefined,
  };
  const pending = new Set();   // ctx.waitUntil promises, awaited on shutdown

  const server = http.createServer(async (req, res) => {
    try {
      const { request, tooLarge } = await toRequest(req);
      // the rest of the body is never read, so close the connection instead of keeping it alive
      if (tooLarge) return json(res, 413, { ok: false, error: 'too-large', message: 'Request too large.' }, { Connection: 'close' });
      const ctx = {
        clientIp: clientIp(req, config.trustProxy),
        waitUntil(p) { const q = Promise.resolve(p).catch(() => {}); pending.add(q); q.finally(() => pending.delete(q)); },
        passThroughOnException() {},
      };
      await sendResponse(res, await worker.fetch(request, env, ctx));
    } catch (err) {
      log.error(err);
      if (!res.headersSent) json(res, 500, { ok: false, error: 'server', message: 'Something went wrong.' });
      else res.destroy();
    }
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 65_000;   // longer than Caddy's idle timeout, so the proxy closes first

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => { server.off('error', reject); resolve(); });
  });
  const { port } = server.address();
  const host = config.host.includes(':') ? `[${config.host}]` : config.host;

  let closing = null;
  const close = (graceMs = 10_000) => closing ??= (async () => {
    const done = new Promise(resolve => server.close(resolve));
    server.closeIdleConnections();
    const timer = setTimeout(() => server.closeAllConnections(), graceMs);
    await done;
    clearTimeout(timer);
    await Promise.allSettled([...pending]);
    db.close();                         // checkpoints the WAL into the main file
  })();

  return { server, db, port, url: `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`, close };
}

// Entry point: `node node/server.mjs`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  loadEnvFile();
  const config = readConfig();
  const app = await start(config);
  console.log(`EarthInteractive API on ${app.url} (db ${config.dbPath}, trust proxy ${config.trustProxy ? 'on' : 'off'})`);
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.once(sig, async () => {
      console.log(`${sig}: shutting down`);
      try { await app.close(); process.exit(0); }
      catch (err) { console.error(err); process.exit(1); }
    });
  }
}
