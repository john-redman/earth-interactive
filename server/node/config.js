// Settings for the self-hosted server, read from the process environment and an optional .env file.
// Real environment variables win over the file (process.loadEnvFile never overrides them).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));

/** Load ENV_FILE, or server/.env when it exists. Safe to call more than once. */
export function loadEnvFile(env = process.env) {
  const file = env.ENV_FILE || path.join(SERVER_DIR, '.env');
  if (fs.existsSync(file)) process.loadEnvFile(file);
  return file;
}

const int = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const flag = v => /^(1|true|yes|on)$/i.test(String(v ?? '').trim());

/** → plain settings object; every field has a sensible default for local development. */
export function readConfig(env = process.env) {
  return {
    port: int(env.PORT, 8787),
    host: env.HOST || '127.0.0.1',
    dbPath: path.resolve(SERVER_DIR, env.DB_PATH || 'data/earth.db'),
    allowedOrigins: env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173',
    // Behind a reverse proxy (Caddy) the socket address is the proxy's, so the client IP comes from the
    // last X-Forwarded-For entry, which the proxy adds. Never enable this when the port is open directly
    // to the internet: anyone could then fake their IP and dodge the rate limits.
    trustProxy: flag(env.TRUST_PROXY),
    writePerMin: int(env.RATE_WRITE_PER_MIN, 10),
    readPerMin: int(env.RATE_READ_PER_MIN, 120),
    backupDir: env.BACKUP_DIR ? path.resolve(SERVER_DIR, env.BACKUP_DIR) : null,
    backupKeep: int(env.BACKUP_KEEP, 14) || 14,
  };
}
