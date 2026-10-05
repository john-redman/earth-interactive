// Online backup of the SQLite database: `VACUUM INTO` writes a consistent, compact copy while the server
// keeps running, the copy is integrity-checked and gzipped, and only the newest BACKUP_KEEP (14) are kept.
//
//   node node/backup.mjs            settings from the environment or server/.env:
//                                   DB_PATH, BACKUP_DIR (default: <db folder>/backups), BACKUP_KEEP
// Restore: stop the server, `gunzip -c earth-<stamp>.db.gz > earth.db`, delete earth.db-wal/-shm, start.
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadEnvFile, readConfig } from './config.js';

const PREFIX = 'earth-';
const SUFFIX = '.db.gz';

/** → { file, bytes, removed: [names] } */
export async function backup({ dbPath, backupDir, keep = 14, now = new Date() }) {
  const { DatabaseSync } = await import('node:sqlite');
  if (!fs.existsSync(dbPath)) throw new Error(`No database at ${dbPath}`);
  const dir = backupDir || path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true, mode: 0o755 });

  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');   // 20261005T031500Z
  const tmp = path.join(dir, `.${PREFIX}${stamp}.db`);
  const file = path.join(dir, `${PREFIX}${stamp}${SUFFIX}`);
  fs.rmSync(tmp, { force: true });

  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA busy_timeout = 10000;');
    db.prepare('VACUUM INTO ?').run(tmp);
  } finally {
    db.close();
  }

  const copy = new DatabaseSync(tmp, { readOnly: true });
  let ok;
  try { ok = copy.prepare('PRAGMA quick_check').get()?.quick_check; }
  finally { copy.close(); }
  if (ok !== 'ok') { fs.rmSync(tmp, { force: true }); throw new Error(`Backup failed its integrity check: ${ok}`); }

  await pipeline(fs.createReadStream(tmp), createGzip({ level: 9 }), fs.createWriteStream(file, { mode: 0o644 }));
  fs.rmSync(tmp, { force: true });

  const all = fs.readdirSync(dir).filter(n => n.startsWith(PREFIX) && n.endsWith(SUFFIX)).sort();   // stamps sort by time
  const removed = all.slice(0, Math.max(0, all.length - keep));
  for (const n of removed) fs.rmSync(path.join(dir, n));
  return { file, bytes: fs.statSync(file).size, removed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  loadEnvFile();
  const c = readConfig();
  try {
    const r = await backup({ dbPath: c.dbPath, backupDir: c.backupDir, keep: c.backupKeep });
    console.log(`Backup ${r.file} (${r.bytes} bytes)${r.removed.length ? `, removed ${r.removed.join(', ')}` : ''}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
