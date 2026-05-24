/**
 * Exporte OpenAPI depuis le build compilé (plugin @nestjs/swagger actif).
 * Usage: npm run build && node tools/dump-openapi.mjs
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'openapi.json');
const DIST_APP = join(ROOT, 'dist', 'src', 'app.module.js');
const DIST_SWAGGER = join(ROOT, 'dist', 'src', 'common', 'swagger', 'setup-swagger.js');

async function main() {
  if (!existsSync(DIST_APP)) {
    console.error('Build manquant. Exécutez: npm run build');
    process.exit(1);
  }

  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import(pathToFileURL(DIST_APP).href);
  const { createSwaggerDocument } = await import(pathToFileURL(DIST_SWAGGER).href);

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  const document = createSwaggerDocument(app);
  writeFileSync(OUT, JSON.stringify(document, null, 2), 'utf8');
  await app.close();

  const schemas = document.components?.schemas ?? {};
  const empty = Object.entries(schemas).filter(
    ([, s]) => s.type === 'object' && (!s.properties || Object.keys(s.properties).length === 0),
  );

  console.log('OpenAPI écrit:', OUT);
  console.log('Paths:', Object.keys(document.paths ?? {}).length);
  console.log('Schémas:', Object.keys(schemas).length, '| vides:', empty.length);
  if (empty.length) {
    console.log('Schémas encore vides:', empty.map(([k]) => k).join(', '));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
