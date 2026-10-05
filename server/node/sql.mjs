// Run SQL against the self-hosted database, for moderation (docs/backend.md → Managing the data).
//   node node/sql.mjs "SELECT name, banned FROM players LIMIT 20"
//   docker compose exec api node node/sql.mjs "…"            (Docker setup, from server/deploy)
// Several statements separated by ';' run in one transaction. SELECTs print a table; other
// statements print the number of rows changed. Safe while the server runs (WAL + busy timeout).
import { fileURLToPath } from 'node:url';
import { loadEnvFile, readConfig } from './config.js';

export async function runSql(dbPath, sql) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(dbPath);
  const out = [];
  try {
    db.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
    db.exec('BEGIN IMMEDIATE');
    // split on ';' outside quotes
    const parts = sql.match(/(?:[^;'"]|'[^']*'|"[^"]*")+/g)?.map(s => s.trim()).filter(Boolean) ?? [];
    for (const part of parts) {
      const st = db.prepare(part);
      if (/^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(part)) out.push({ rows: st.all().map(r => ({ ...r })) });
      else out.push({ changes: Number(st.run().changes) });
    }
    db.exec('COMMIT');
  } catch (err) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw err;
  } finally {
    db.close();
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sql = process.argv.slice(2).join(' ');
  if (!sql.trim()) { console.error('Usage: node node/sql.mjs "<SQL>"'); process.exit(2); }
  loadEnvFile();
  try {
    for (const r of await runSql(readConfig().dbPath, sql)) {
      if (r.rows) r.rows.length ? console.table(r.rows) : console.log('(no rows)');
      else console.log(`${r.changes} row(s) changed`);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
