// Recreates the local test database: Supabase stand-in + every migration, in order.
// LOCAL / CI ONLY. Refuses to run against anything but a database named *_test.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/goalz_test';

export async function resetTestDb() {
  const url = new URL(TEST_DB_URL);
  const dbName = url.pathname.slice(1);
  if (!/_test$/.test(dbName))
    throw new Error(`Refusing to reset "${dbName}": name must end in _test.`);

  const adminUrl = new URL(TEST_DB_URL);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`drop database if exists "${dbName}" with (force)`);
  await admin.query(`create database "${dbName}"`);
  await admin.end();

  const db = new pg.Client({ connectionString: TEST_DB_URL });
  await db.connect();
  try {
    await db.query(await readFile(path.join(here, '../tests/supabase-stub.sql'), 'utf8'));
    const dir = path.join(here, '../migrations');
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
      try {
        await db.query(await readFile(path.join(dir, file), 'utf8'));
      } catch (e) {
        throw new Error(`Migration ${file} failed: ${e.message}`, { cause: e });
      }
    }
  } finally {
    await db.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await resetTestDb();
  console.log('Test database ready.');
}
