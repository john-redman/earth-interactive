// Minimal stand-in for a Cloudflare D1 binding, backed by node:sqlite (Node >= 22.5), so the Worker can be
// tested against the real schema.sql without wrangler. Covers only what src/index.js uses.
import fs from 'node:fs';

export async function createD1() {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');   // D1 enforces foreign keys by default
  db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, params = []) => ({
    bind: (...p) => stmt(sql, p),
    first: async () => db.prepare(sql).get(...params) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...params), success: true }),
    run: async () => { const r = db.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: sql => stmt(sql), raw: db };
}
