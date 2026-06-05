/**
 * Génère docs/FRONTEND-API-README.md depuis docs/openapi.json (Swagger).
 * Usage: npm run docs:frontend
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WORKFLOW,
  collectOperations,
  formatOperation,
  buildIntro,
} from './openapi-markdown.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OPENAPI = join(ROOT, 'docs', 'openapi.json');
const OUT = join(ROOT, 'docs', 'FRONTEND-API-README.md');

function main() {
  if (!existsSync(OPENAPI)) {
    console.error('Manquant:', OPENAPI);
    console.error('Exécutez: npm run docs:openapi');
    process.exit(1);
  }

  const spec = JSON.parse(readFileSync(OPENAPI, 'utf8'));
  const { byTag, totalOps: opCount } = collectOperations(spec);
  const parts = [buildIntro(spec)];

  let totalOps = 0;

  for (const section of WORKFLOW) {
    if (section.intro) continue;

    parts.push(`## Étape ${section.num} — ${section.title}\n\n`);
    if (section.workflow) {
      parts.push('**Workflow frontend**\n\n');
      parts.push(section.workflow + '\n\n');
    }

    for (const tag of section.tags ?? []) {
      const ops = byTag.get(tag);
      if (!ops?.length) continue;
      parts.push(`### Tag Swagger : ${tag}\n\n`);
      for (const { method, path, op } of ops) {
        parts.push(formatOperation(spec, method, path, op));
        totalOps++;
      }
      byTag.delete(tag);
    }
    parts.push('\n');
  }

  const remaining = [...byTag.entries()].filter(([, ops]) => ops.length);
  if (remaining.length) {
    parts.push('## Autres endpoints\n\n');
    for (const [tag, ops] of remaining) {
      parts.push(`### ${tag}\n\n`);
      for (const { method, path, op } of ops) {
        parts.push(formatOperation(spec, method, path, op));
        totalOps++;
      }
    }
  }

  parts.push(`\n---\n\n*Document généré automatiquement — ${opCount} opérations documentées.*\n`);
  parts.push(`*OpenAPI : \`docs/openapi.json\` · Swagger UI : \`/api/docs\`*\n`);

  writeFileSync(OUT, parts.join(''), 'utf8');
  console.log('Écrit:', OUT);
  console.log('Opérations:', totalOps);
}

main();
