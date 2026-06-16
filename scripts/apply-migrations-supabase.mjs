import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const url =
  process.env.DATABASE_URL ??
  'postgresql://postgres:bilinks%402020@db.bggfwkcuhvszavfnnsve.supabase.co:5432/postgres?schema=public&sslmode=require';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'migrations');
const dirs = fs
  .readdirSync(root)
  .filter((d) => fs.statSync(path.join(root, d)).isDirectory())
  .sort();

const client = new pg.Client({ connectionString: url });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  )
`);

for (const dir of dirs) {
  const migrationName = dir;
  const { rows } = await client.query(
    'SELECT 1 FROM _prisma_migrations WHERE migration_name = $1',
    [migrationName],
  );
  if (rows.length) {
    console.log('Skip (deja applique):', migrationName);
    continue;
  }

  const sqlPath = path.join(root, dir, 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex').slice(0, 64);

  console.log('Application:', migrationName);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
       VALUES ($1, $2, now(), $3, 1)`,
      [crypto.randomUUID(), checksum, migrationName],
    );
    await client.query('COMMIT');
    console.log('OK:', migrationName);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Echec:', migrationName, err instanceof Error ? err.message : err);
    throw err;
  }
}

await client.end();
console.log('Toutes les migrations sont appliquees sur Supabase.');
