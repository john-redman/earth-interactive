import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

let hasSqlite = true;
try { await import('node:sqlite'); } catch { hasSqlite = false; }
const { openD1 } = await import('../src/d1-sqlite.js');
const { backup } = await import('../node/backup.mjs');

test('backup: consistent copy of a live WAL database, rotation keeps the newest', { skip: !hasSqlite && 'node:sqlite not available' }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ei-bak-'));
  const dbPath = path.join(dir, 'earth.db');
  const db = await openD1(dbPath);            // stays open, like the running server
  t.after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  await db.prepare('INSERT INTO players (id, name, name_key, created_at, updated_at) VALUES (?1, ?2, ?3, 1, 1)')
    .bind('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ada', 'ada').run();

  const backupDir = path.join(dir, 'backups');
  let last;
  for (let i = 0; i < 4; i++) last = await backup({ dbPath, backupDir, keep: 3, now: new Date(Date.UTC(2026, 9, 1 + i, 3)) });
  const names = fs.readdirSync(backupDir).sort();
  assert.deepEqual(names, ['earth-20261002T030000Z.db.gz', 'earth-20261003T030000Z.db.gz', 'earth-20261004T030000Z.db.gz']);
  assert.deepEqual(last.removed, ['earth-20261001T030000Z.db.gz']);

  // the backup opens as a normal SQLite database with the data in it
  const restored = path.join(dir, 'restored.db');
  fs.writeFileSync(restored, gunzipSync(fs.readFileSync(last.file)));
  const { DatabaseSync } = await import('node:sqlite');
  const copy = new DatabaseSync(restored, { readOnly: true });
  assert.equal(copy.prepare('SELECT name FROM players').get().name, 'Ada');
  copy.close();
});
