import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sqlFile = path.join(root, 'prisma', 'sql', 'check_constraints.sql');

console.log('Application des contraintes CHECK v2.3...');
execSync(`npx prisma db execute --file "${sqlFile}"`, {
  cwd: root,
  stdio: 'inherit',
});
console.log('Contraintes CHECK appliquées.');
