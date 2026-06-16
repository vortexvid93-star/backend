import pg from 'pg';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sqlFile = path.join(root, 'prisma', 'sql', 'check_constraints.sql');

const url =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  '';

if (!url) {
  console.error('DATABASE_URL ou DIRECT_DATABASE_URL requis.');
  process.exit(1);
}

console.log('Application des contraintes CHECK v2.3...');
const sql = fs.readFileSync(sqlFile, 'utf8');
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(sql);
await client.end();
console.log('Contraintes CHECK appliquées.');
