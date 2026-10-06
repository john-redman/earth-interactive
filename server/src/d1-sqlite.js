// A Cloudflare D1-compatible database over node:sqlite (built into Node >= 22.5, no npm packages).
// The Worker in src/index.js talks to `env.DB` through the D1 API (prepare → bind → first/all/run), so the
// same code runs on Cloudflare and on a plain Node server (node/server.mjs) or in tests.
// Node-only: never imported by the Worker, so wrangler does not bundle it.
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = new URL('../schema.sql', import.meta.url);

/**
 * Open (or create) a SQLite file and return a D1-like binding.
 *   file      — path to the database file, or ':memory:'
 *   schema    — apply schema.sql (every statement is IF NOT EXISTS, so this is safe on each start)
 *   busyMs    — how long a write waits for another connection's lock (e.g. a backup) before failing
 * → { prepare, batch, exec, close, raw } where raw is the underlying DatabaseSync (moderation, tests).
 */
export async function openD1(file, { schema = true, busyMs = 5000 } = {}) {
  const { DatabaseSync } = await import('node:sqlite');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA busy_timeout = ${Math.max(0, busyMs | 0)};`);
  db.exec('PRAGMA foreign_keys = ON;');            // D1 enforces foreign keys by default
  if (file !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');         // readers never block the writer; crash-safe
    db.exec('PRAGMA synchronous = NORMAL;');       // safe with WAL, much faster than FULL
  }
  if (schema) db.exec(fs.readFileSync(SCHEMA, 'utf8'));

  let closed = false;
  const cache = new Map();                          // SQL text → prepared statement
  const prep = sql => {
    let s = cache.get(sql);
    if (!s) { s = db.prepare(sql); cache.set(sql, s); }
    return s;
  };
  const plain = row => (row ? { ...row } : null);   // node:sqlite rows have a null prototype; D1's don't

  const stmt = (sql, params = []) => ({
    bind: (...p) => stmt(sql, p),
    first: async col => {
      const row = plain(prep(sql).get(...params));
      return col === undefined ? row : row?.[col] ?? null;
    },
    all: async () => ({ results: prep(sql).all(...params).map(plain), success: true, meta: {} }),
    raw: async () => prep(sql).all(...params).map(r => Object.values(r)),
    run: async () => {
      const r = prep(sql).run(...params);
      return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
    _run: () => prep(sql).run(...params),
  });

  return {
    prepare: sql => stmt(sql),
    /** Like D1: all statements in one transaction, rolled back if any fails. */
    batch: async list => {
      db.exec('BEGIN');
      try {
        const out = list.map(s => { const r = s._run(); return { success: true, meta: { changes: Number(r.changes) } }; });
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    exec: async sql => { db.exec(sql); return { count: 1 }; },
    close: () => {
      if (closed) return;
      closed = true;
      cache.clear();
      db.close();
    },
    raw: db,
  };
}
