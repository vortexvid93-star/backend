/**
 * Génère la doc admin en 4 parties + index ADMIN-API-CONTRACT.md.
 * Usage: npm run docs:admin
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ADMIN_PARTS,
  collectOperations,
  buildAdminIntro,
  buildAdminPartIntro,
  formatOperation,
  renderTaggedOperations,
} from './openapi-markdown.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OPENAPI = join(ROOT, 'docs', 'openapi.json');
const OUT_INDEX = join(ROOT, 'docs', 'ADMIN-API-CONTRACT.md');
const OUT_ADMIN_DIR = join(ROOT, 'docs', 'admin');

function main() {
  if (!existsSync(OPENAPI)) {
    console.error('Manquant:', OPENAPI);
    console.error('Exécutez: npm run docs:openapi');
    process.exit(1);
  }

  mkdirSync(OUT_ADMIN_DIR, { recursive: true });

  const spec = JSON.parse(readFileSync(OPENAPI, 'utf8'));
  const { byTag } = collectOperations(spec, { pathPrefix: '/admin/' });

  let totalOps = 0;
  const partSummaries = [];

  for (const part of ADMIN_PARTS) {
    const partByTag = new Map(byTag);
    const parts = [buildAdminPartIntro(spec, part)];
    const { markdown, count } = renderTaggedOperations(spec, partByTag, part.tags);
    parts.push(markdown);
    parts.push(
      `\n---\n\n*Partie ${part.num} — ${count} opération(s) · [ADMIN-INTEGRATION.md](../../../apps/web/docs/ADMIN-INTEGRATION.md)*\n`,
    );

    const outPath = join(OUT_ADMIN_DIR, part.file);
    writeFileSync(outPath, parts.join(''), 'utf8');
    totalOps += count;
    partSummaries.push({ ...part, count, outPath });
    console.log('Écrit:', outPath, `(${count} ops)`);
  }

  const indexParts = [buildAdminIntro(spec)];
  indexParts.push('## Workflow back-office\n\n');
  indexParts.push(
    'Intégrer **partie par partie** dans `apps/web` (voir [ADMIN-INTEGRATION.md](../../apps/web/docs/ADMIN-INTEGRATION.md)).\n\n',
  );
  indexParts.push('| Partie | Document | Opérations | Intégration web |\n');
  indexParts.push('|--------|----------|:----------:|------------------|\n');
  for (const p of partSummaries) {
    const status =
      p.num === 1
        ? '**Terminée** (catégories + auteurs)'
        : 'À faire';
    indexParts.push(
      `| ${p.num} | [${p.file}](./admin/${p.file}) | ${p.count} | ${status} |\n`,
    );
  }
  indexParts.push(
    `\n---\n\n*Index généré — ${totalOps} opérations admin au total.*\n`,
  );
  indexParts.push(`*OpenAPI : \`docs/openapi.json\` · Swagger : \`/api/docs\`*\n`);

  writeFileSync(OUT_INDEX, indexParts.join(''), 'utf8');
  console.log('Écrit:', OUT_INDEX);
  console.log('Total opérations admin:', totalOps);
}

main();
