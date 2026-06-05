/**
 * Utilitaires partagés : OpenAPI → markdown (contrats envoi/réception).
 * Utilisé par generate-frontend-api-readme.mjs et generate-admin-api-contract.mjs.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Schémas de réponse métier (mappers) quand Swagger ne détaille pas le JSON. */
const RESPONSE_SNIPPETS = {
  PaginatedMeta: { page: 1, limit: 20, total: 142, total_pages: 8 },
  LivreCatalogItem: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    titre: 'Le Petit Prince',
    isbn: '9782070612758',
    resume: 'Résumé…',
    couverture_url: 'https://res.cloudinary.com/…/cover.jpg',
    type_livre: 'EBOOK',
    is_downloadable: true,
    langue: 'fr',
    annee_publication: 1943,
    nombre_pages: 96,
    auteurs: [{ id: '…', nom: 'Saint-Exupéry', prenom: 'Antoine' }],
    categories: [{ id: '…', nom: 'Jeunesse' }],
    note_moyenne: 4.5,
    nb_lectures: 1200,
    can_stream: true,
    can_download: true,
  },
  BibliothequeListItem: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    nom: 'Littérature africaine',
    description: 'Romans et essais…',
    couverture_url: 'https://…',
    type: 'INTERNE',
    url_externe: null,
    nb_livres: 42,
  },
  AccessCheckResponse: {
    allowed: true,
    reason: null,
    subscription: { plan_nom: 'Mensuel', fin: '2025-06-22T00:00:00.000Z' },
  },
  BookAccessToken: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
    expires_at: '2025-05-22T12:00:00.000Z',
    type: 'LECTURE',
    stream_url: '/books/uuid/stream?token=…',
    expires_in_sec: 3600,
    progression_creee: true,
  },
  PaymentInitResponse: {
    ref_transaction: 'pay_abc123',
    payment_url: 'https://pay.pawapay.io/…',
    paiement_id: '550e8400-e29b-41d4-a716-446655440099',
    pawapay: { deposit_id: 'dep_xyz' },
  },
  PaymentStatusResponse: {
    statut: 'SUCCES',
    message: 'Paiement confirmé.',
    plan: { id: '…', nom: 'Mensuel', prix_xof: 2500 },
    abonnement_lie: { id: '…', debut: '2025-05-22', fin: '2025-06-22' },
    abonnement_actuel: null,
  },
};

function walkFiles(dir, suffix, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkFiles(p, suffix, acc);
    else if (p.endsWith(suffix)) acc.push(p);
  }
  return acc;
}

function inferTypeFromDecorators(decorators, tsType) {
  const d = decorators.join(' ');
  if (d.includes('@IsEmail')) return 'string (email)';
  if (d.includes('@IsUUID')) return 'string (uuid)';
  if (d.includes('@IsInt') || d.includes('@IsNumber')) return 'number';
  if (d.includes('@IsBoolean')) return 'boolean';
  if (d.includes('@IsDateString')) return 'string (YYYY-MM-DD)';
  if (d.includes('@IsEnum')) {
    const m = d.match(/@IsEnum\((\w+)/);
    return m ? `enum ${m[1]}` : 'enum';
  }
  const len = d.match(/@Length\((\d+)/);
  if (len) return `string (${len[1]} caractères)`;
  const min = d.match(/@Min\((\d+)/);
  if (min && d.includes('@IsInt')) return `number (min ${min[1]})`;
  return tsType.replace(/\s/g, '') || 'string';
}

function parseDtoSources() {
  const map = new Map();
  const files = [
    ...walkFiles(SRC, '.dto.ts'),
    ...walkFiles(join(SRC, 'common', 'swagger', 'schemas'), '.ts'),
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const chunks = content.split(/(?=export class )/);
    for (const chunk of chunks) {
      const cm = chunk.match(/^export class (\w+)/);
      if (!cm) continue;
      const className = cm[1];
      const fields = [];
      const lines = chunk.split('\n');
      let comment = '';
      let decorators = [];

      for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith('/**')) {
          comment = line.replace(/^\/\*\*\s*|\s*\*\/$/g, '').replace(/^\*\s?/gm, '').trim();
          continue;
        }
        if (line.startsWith('@')) {
          decorators.push(line);
          continue;
        }
        const fm = line.match(/^(\w+)(\?)?:\s*([^;]+);$/);
        if (fm) {
          const optional = Boolean(fm[2]) || decorators.some((x) => x.includes('@IsOptional'));
          fields.push({
            name: fm[1],
            required: !optional,
            type: inferTypeFromDecorators(decorators, fm[3]),
            description: comment,
            example: undefined,
          });
          comment = '';
          decorators = [];
        }
      }
      if (fields.length) map.set(className, fields);
    }
  }
  return map;
}

const DTO_FIELDS = parseDtoSources();

function schemaRefName(schema) {
  const ref = schema?.$ref ?? schema?.allOf?.[0]?.$ref;
  if (!ref) return null;
  return ref.split('/').pop();
}

function enrichSchema(spec, schema) {
  const merged = mergeSchema(spec, schema);
  if (!merged) return merged;
  const hasProps = merged.properties && Object.keys(merged.properties).length > 0;
  if (hasProps) return merged;

  const name = schemaRefName(schema) ?? schemaRefName(merged);
  if (name && DTO_FIELDS.has(name)) {
    const props = {};
    const required = [];
    for (const f of DTO_FIELDS.get(name)) {
      props[f.name] = {
        type: f.type.includes('number') ? 'number' : 'string',
        description: f.description,
        example: f.example,
      };
      if (f.required) required.push(f.name);
    }
    return { type: 'object', properties: props, required };
  }
  return merged;
}

export const WORKFLOW = [
  {
    num: 0,
    title: 'Guide d’intégration frontend',
    intro: true,
  },
  {
    num: 1,
    title: 'Santé & disponibilité',
    tags: ['Application'],
    workflow:
      'Vérifier que l’API répond avant toute intégration (`GET /health`).',
  },
  {
    num: 2,
    title: 'Authentification',
    tags: ['Authentification'],
    workflow:
      '1. Inscription (`POST /auth/register` ou `/register/password`) → OTP par email.\n' +
      '2. Validation OTP (`POST /auth/otp/verify`) → stocker `access_token` + `refresh_token`.\n' +
      '3. Intercepteur HTTP : sur 401, `POST /auth/token/refresh` puis rejouer la requête.\n' +
      '4. Déconnexion : `POST /auth/logout` + effacer les tokens locaux.',
  },
  {
    num: 3,
    title: 'Profil utilisateur — `/me`',
    tags: ['Profil utilisateur (/me)'],
    workflow:
      'Après login : `GET /me` ou `GET /me/dashboard` pour l’accueil. `PATCH /me` et `POST /me/photo` pour l’édition.',
  },
  {
    num: 4,
    title: 'Bibliothèques éditoriales — `/libraries`',
    tags: ['Bibliothèques'],
    workflow:
      'Explorer les rayons : `GET /libraries` → fiche `GET /libraries/:id` → livres `GET /libraries/:id/books`.',
  },
  {
    num: 5,
    title: 'Catalogue & lecture — `/books`',
    tags: ['Livres & lecture'],
    workflow:
      '1. `GET /books/:id` — fiche.\n' +
      '2. `GET /books/:id/access/check?type=LECTURE` — éligibilité.\n' +
      '3. `POST /books/:id/access?type=LECTURE` — jeton temporaire.\n' +
      '4. Lecteur : `GET /books/:id/stream?token=...` (302 vers le média).\n' +
      '5. `PATCH /books/:id/progress` — sauvegarde page (debounce).',
  },
  {
    num: 6,
    title: 'Plans & abonnements',
    tags: ['Plans d’abonnement', 'Abonnements'],
    workflow:
      '`GET /plans` (public) pour la page tarifs. `GET /subscriptions/current` pour savoir si l’utilisateur peut lire.',
  },
  {
    num: 7,
    title: 'Paiements Mobile Money — `/payments`',
    tags: ['Paiements'],
    workflow:
      '1. `GET /payments/checkout-preview?plan_id=` — récap.\n' +
      '2. `POST /payments/init` — lancer PawaPay.\n' +
      '3. Polling `GET /payments/status?transaction_id=` jusqu’à SUCCES/ECHEC.',
  },
  {
    num: 8,
    title: 'Découverte — recherche, recommandations, notifications',
    tags: ['Recherche', 'Recommandations', 'Notifications'],
    workflow:
      'Barre de recherche → `GET /search?q=`. Accueil suggestions → `GET /recommendations`. Cloche → `GET /notifications`.',
  },
  {
    num: 9,
    title: 'Gamification — défis & badges',
    tags: ['Défis & challenges', 'Badges', 'Gamification'],
    workflow:
      '`GET /gamification/overview` pour un hub. `POST /challenges/:id/join` pour participer.',
  },
  {
    num: 10,
    title: 'Administration — `/admin/*`',
    tags: [
      'Admin — Utilisateurs',
      'Admin — Livres',
      'Admin — Bibliothèques',
      'Admin — Auteurs',
      'Admin — Catégories',
      'Admin — Plans',
      'Admin — Défis',
      'Admin — Badges',
      'Admin — Modération & abonnements',
      'Admin — Statistiques',
    ],
    workflow:
      'Back-office uniquement (JWT rôle `ADMIN`). Non requis pour l’app mobile/web grand public.',
  },
];

export const ADMIN_TAGS =
  WORKFLOW.find((s) => s.num === 10)?.tags ?? [];

/** Découpage doc + intégration web en 4 parties. */
export const ADMIN_PARTS = [
  {
    num: 1,
    file: 'PARTIE-1-REFERENTIELS.md',
    title: 'Référentiels — Catégories & Auteurs',
    tags: ['Admin — Catégories', 'Admin — Auteurs'],
    routes: '/admin/categories, /admin/auteurs',
    webPages: 'Catégories, Auteurs',
  },
  {
    num: 2,
    file: 'PARTIE-2-CATALOGUE.md',
    title: 'Catalogue — Livres & Bibliothèques',
    tags: ['Admin — Livres', 'Admin — Bibliothèques'],
    routes: '/admin/books, /admin/libraries',
    webPages: 'Livres, Bibliothèques',
  },
  {
    num: 3,
    file: 'PARTIE-3-UTILISATEURS-MODERATION.md',
    title: 'Utilisateurs & modération',
    tags: [
      'Admin — Utilisateurs',
      'Admin — Modération & abonnements',
    ],
    routes: '/admin/users, /admin/comments, /admin/subscriptions, /admin/payments',
    webPages: 'Utilisateurs, Commentaires, Abonnements, Paiements',
  },
  {
    num: 4,
    file: 'PARTIE-4-MONETISATION-GAMIFICATION-STATS.md',
    title: 'Plans, gamification & statistiques',
    tags: [
      'Admin — Plans',
      'Admin — Défis',
      'Admin — Badges',
      'Admin — Statistiques',
    ],
    routes: '/admin/plans, /admin/challenges, /admin/badges, /admin/stats',
    webPages: 'Plans, Défis, Dashboard stats',
  },
];

const METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function resolveRef(spec, ref) {
  if (!ref?.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let cur = spec;
  for (const p of parts) {
    cur = cur?.[p];
    if (!cur) return null;
  }
  return cur;
}

function mergeSchema(spec, schema, depth = 0) {
  if (!schema || depth > 8) return schema;
  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    return resolved ? mergeSchema(spec, resolved, depth + 1) : schema;
  }
  if (schema.allOf) {
    return schema.allOf.reduce(
      (acc, s) => ({ ...acc, ...mergeSchema(spec, s, depth + 1) }),
      {},
    );
  }
  return schema;
}

function schemaType(spec, schema, depth = 0) {
  if (!schema || depth > 12) return 'any';
  const merged = mergeSchema(spec, schema);
  if (!merged) return 'any';

  if (merged.type === 'array') {
    const refName = schemaRefName(merged.items ?? schema.items);
    if (refName) return `array<${refName}>`;
    const inner = schemaType(spec, merged.items, depth + 1);
    return `array<${inner}>`;
  }

  const refName = schemaRefName(schema);
  if (refName && merged.properties && !merged.type) return refName;

  if (merged.enum) return merged.enum.map(String).join(' | ');
  if (merged.format && merged.type) return `${merged.type} (${merged.format})`;
  if (merged.type) return merged.type;
  if (merged.properties) return refName ?? 'object';
  return 'any';
}

/**
 * Aplatit un schéma OpenAPI en lignes de tableau (y compris tableaux et objets imbriqués).
 * Ex. : data[].livre_id, meta.page, top_5_livres[].titre
 */
function collectFields(spec, schema, prefix = '', depth = 0) {
  if (depth > 14) return [];
  const merged = enrichSchema(spec, schema);
  if (!merged?.properties) return [];

  const required = new Set(merged.required ?? []);
  const rows = [];

  for (const [name, propSchema] of Object.entries(merged.properties)) {
    const p = mergeSchema(spec, propSchema);
    const fullName = prefix ? `${prefix}.${name}` : name;
    const isRequired = required.has(name);
    const description = (p?.description ?? propSchema?.description ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    if (p?.type === 'array') {
      const items = mergeSchema(spec, p.items);
      const refName = schemaRefName(p.items);
      const itemType = refName ?? schemaType(spec, items, depth + 1);
      rows.push({
        name: fullName,
        type: `array<${itemType}>`,
        required: isRequired,
        description,
        example: p?.example ?? p?.examples?.[0],
      });
      if (items?.properties) {
        rows.push(...collectFields(spec, items, `${fullName}[]`, depth + 1));
      }
      continue;
    }

    if (p?.properties && (!p.type || p.type === 'object')) {
      const refName = schemaRefName(propSchema);
      rows.push({
        name: fullName,
        type: refName ?? 'object',
        required: isRequired,
        description,
        example: p?.example,
      });
      rows.push(...collectFields(spec, p, fullName, depth + 1));
      continue;
    }

    rows.push({
      name: fullName,
      type: schemaType(spec, p, depth),
      required: isRequired,
      description,
      example: p?.example ?? p?.examples?.[0],
    });
  }

  return rows;
}

function exampleFromSchema(spec, schema, depth = 0) {
  if (!schema || depth > 6) return null;
  const name = schemaRefName(schema);
  if (name && RESPONSE_SNIPPETS[name]) return RESPONSE_SNIPPETS[name];
  if (name === 'AuthTokensResponseSchema') {
    return {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
      refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'jean.dupont@example.com',
        role: 'USER',
        statut: 'ACTIF',
        personne: { nom: 'Dupont', prenom: 'Jean', points: 120 },
      },
      is_new_user: true,
    };
  }
  if (name === 'MessageResponseSchema') {
    return { message: 'OTP envoyé. Valide 10 minutes.' };
  }
  const merged = enrichSchema(spec, schema);
  if (!merged) return null;
  if (merged.example !== undefined) return merged.example;
  if (merged.enum) return merged.enum[0];

  switch (merged.type) {
    case 'string':
      return merged.format === 'uuid'
        ? '550e8400-e29b-41d4-a716-446655440000'
        : merged.format === 'email'
          ? 'user@example.com'
          : merged.format === 'date'
            ? '2024-06-15'
            : merged.format === 'date-time'
              ? '2024-06-15T10:30:00.000Z'
              : 'string';
    case 'integer':
    case 'number':
      return merged.minimum ?? 1;
    case 'boolean':
      return true;
    case 'array':
      return [exampleFromSchema(spec, merged.items, depth + 1)];
    case 'object':
    default:
      if (merged.properties) {
        const obj = {};
        for (const [k, v] of Object.entries(merged.properties)) {
          obj[k] = exampleFromSchema(spec, v, depth + 1);
        }
        return obj;
      }
      return {};
  }
}

function authLabel(security) {
  if (!security || security.length === 0) return '**Public** (pas de JWT)';
  const keys = security.flatMap((s) => Object.keys(s));
  if (keys.includes('access-token')) return '**JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)';
  return '**Authentifié** — voir Swagger';
}

function formatParams(spec, parameters) {
  if (!parameters?.length) return '';
  const rows = parameters.map((p) => {
    const schema = mergeSchema(spec, p.schema);
    return {
      name: p.name,
      in: p.in,
      required: p.required === true,
      type: schemaType(spec, schema),
      description: (p.description ?? schema?.description ?? '').trim(),
      example: p.example ?? schema?.example,
    };
  });

  let md = '\n**Paramètres**\n\n';
  md += '| Nom | Emplacement | Obligatoire | Type | Description |\n';
  md += '|-----|-------------|:-----------:|------|-------------|\n';
  for (const r of rows) {
    md += `| \`${r.name}\` | ${r.in} | ${r.required ? '**Oui**' : 'Non'} | ${r.type} | ${r.description || '—'} |\n`;
  }
  return md;
}

function formatBody(spec, requestBody) {
  if (!requestBody) return '';
  const content = requestBody.content?.['application/json'] ?? requestBody.content?.['multipart/form-data'];
  if (!content?.schema) {
    if (requestBody.content?.['multipart/form-data']) {
      return '\n**Body** : `multipart/form-data` — voir description de l’endpoint (champ fichier `file` ou `icone`, etc.).\n';
    }
    return '';
  }

  const schema = enrichSchema(spec, content.schema);
  const fields = collectFields(spec, schema);
  const required = requestBody.required !== false;

  let md = `\n**Body** (${required ? 'JSON requis' : 'JSON optionnel'})\n\n`;

  if (fields.length) {
    md += '| Champ | Obligatoire | Type | Description | Exemple |\n';
    md += '|-------|:-----------:|------|-------------|--------|\n';
    for (const f of fields) {
      const ex = f.example !== undefined ? `\`${JSON.stringify(f.example)}\`` : '—';
      md += `| \`${f.name}\` | ${f.required ? '**Oui**' : 'Non'} | ${f.type} | ${f.description || '—'} | ${ex} |\n`;
    }
  } else {
    md += '_Schéma non exposé dans Swagger — voir le code DTO ou tester via `/api/docs`._\n';
  }

  const example = exampleFromSchema(spec, schema);
  if (example && Object.keys(example).length) {
    md += '\n**Exemple de requête**\n\n```json\n';
    md += JSON.stringify(example, null, 2);
    md += '\n```\n';
  }

  return md;
}

function formatResponses(spec, responses, routeExamples = null) {
  if (!responses) return '';
  let md = '\n**Réponses**\n\n';

  const codes = Object.keys(responses).sort((a, b) => Number(a) - Number(b));

  for (const code of codes) {
    const r = responses[code];
    const desc = r.description ?? '';
    md += `#### HTTP ${code}${desc ? ` — ${desc}` : ''}\n\n`;

    if (routeExamples?.[code] && Number(code) < 400) {
      md += '**Exemple de réponse**\n\n```json\n';
      md += JSON.stringify(routeExamples[code], null, 2);
      md += '\n```\n\n';
      continue;
    }

    const json =
      r.content?.['application/json']?.schema ??
      r.content?.['application/json']?.examples?.default?.value;

    if (json && typeof json === 'object' && !json.type && !json.$ref && !json.properties) {
      md += '```json\n' + JSON.stringify(json, null, 2) + '\n```\n\n';
      continue;
    }

    const schema = r.content?.['application/json']?.schema;
    if (schema) {
      const merged = enrichSchema(spec, schema);
      const fields = collectFields(spec, merged);
      const snippetKey = schemaRefName(schema);
      const routeExample = routeExamples?.[code];
      if (routeExample && Number(code) < 400) {
        md += '**Exemple de réponse**\n\n```json\n';
        md += JSON.stringify(routeExample, null, 2);
        md += '\n```\n\n';
      } else if (snippetKey && RESPONSE_SNIPPETS[snippetKey] && Number(code) < 400) {
        md += '**Exemple de réponse**\n\n```json\n';
        md += JSON.stringify(RESPONSE_SNIPPETS[snippetKey], null, 2);
        md += '\n```\n\n';
      } else if (fields.length && Number(code) < 400) {
        md += '| Champ | Type | Description |\n|-------|------|-------------|\n';
        for (const f of fields) {
          md += `| \`${f.name}\` | ${f.type} | ${f.description || '—'} |\n`;
        }
        md += '\n**Exemple de réponse**\n\n```json\n';
        md += JSON.stringify(exampleFromSchema(spec, merged), null, 2);
        md += '\n```\n\n';
      } else if (merged?.description) {
        md += `${merged.description}\n\n`;
      }
    } else if (Number(code) === 302) {
      md += 'Redirection HTTP vers l’URL du média (`Location`).\n\n';
    } else if (Number(code) >= 400) {
      md += 'Erreur NestJS standard :\n\n```json\n';
      md += JSON.stringify(
        {
          statusCode: Number(code),
          message: desc || 'Message métier en français',
          error: code === '400' ? 'Bad Request' : 'Error',
        },
        null,
        2,
      );
      md += '\n```\n\n';
    }
  }

  return md;
}

/** Exemples JSON ciblés par route (réponses métier non typées dans Swagger). */
const ROUTE_RESPONSE_EXAMPLES = {
  'GET /books/{id}/access/check': {
    '200': RESPONSE_SNIPPETS.AccessCheckResponse,
  },
  'POST /books/{id}/access': {
    '200': RESPONSE_SNIPPETS.BookAccessToken,
  },
  'POST /payments/init': {
    '200': RESPONSE_SNIPPETS.PaymentInitResponse,
  },
  'GET /payments/status': {
    '200': RESPONSE_SNIPPETS.PaymentStatusResponse,
  },
};

export function formatOperation(spec, method, path, op) {
  const m = method.toUpperCase();
  const routeKey = `${m} ${path}`;
  let md = `### \`${m} ${path}\`\n\n`;
  if (op.summary) md += `**Résumé** : ${op.summary}\n\n`;
  if (op.description) {
    md += op.description.split('\n').map((l) => l.trim()).filter(Boolean).join('\n\n') + '\n\n';
  }
  md += `**Authentification** : ${authLabel(op.security)}\n`;
  md += formatParams(spec, op.parameters);
  md += formatBody(spec, op.requestBody);
  md += formatResponses(spec, op.responses, ROUTE_RESPONSE_EXAMPLES[routeKey]);
  md += '---\n\n';
  return md;
}

function primaryTag(op, workflow = WORKFLOW) {
  const tags = op.tags ?? [];
  for (const section of workflow) {
    for (const t of section.tags ?? []) {
      if (tags.includes(t)) return t;
    }
  }
  return tags[0] ?? 'Sans tag';
}

export function collectOperations(spec, { workflow = WORKFLOW, pathPrefix = null } = {}) {
  const byTag = new Map();
  const seen = new Set();

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    if (pathPrefix && !path.startsWith(pathPrefix)) continue;
    for (const method of METHOD_ORDER) {
      const op = methods[method];
      if (!op) continue;
      const key = `${method}:${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const tag = primaryTag(op, workflow);
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push({ method, path, op });
    }
  }

  for (const ops of byTag.values()) {
    ops.sort((a, b) => {
      const pa = a.path.localeCompare(b.path);
      if (pa !== 0) return pa;
      return METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
    });
  }

  let totalOps = 0;
  for (const ops of byTag.values()) totalOps += ops.length;
  return { byTag, totalOps };
}

export function buildIntro(spec) {
  const desc = spec.info?.description ?? '';
  return `# BiblioTech API v2 — Guide intégration frontend

> **Document de référence pour le développeur frontend** (et agents IA).  
> Texte informatif généré depuis **Swagger / OpenAPI** (\`http://localhost:3000/api/docs\`).  
> Les champs des requêtes viennent des DTOs backend (plugin \`@nestjs/swagger\` + \`class-validator\`).  
> Régénérer : \`npm run docs:frontend\` (build + export \`docs/openapi.json\`).  
> **Note** : Swagger UI (\`/api/docs\`) affiche toujours les schémas complets avec références ; ce README détaille les mêmes champs en tableaux (y compris \`data[].champ\` pour les listes paginées).

**Version API** : ${spec.info?.version ?? '2.0.0'}

---

## Comment utiliser ce fichier

1. **Ordre des sections** = ordre d’implémentation recommandé (auth → profil → bibliothèques → lecture → abonnement…).
2. Pour chaque route : champs **obligatoires** / **facultatifs**, types, **exemples JSON** requête/réponse.
3. Copier une section entière dans votre agent IA pour générer services API, types TypeScript, écrans.
4. Swagger live reste la source pour tester : \`GET /api/docs\` + bouton **Authorize** (\`Bearer <access_token>\`).

---

## Configuration client

| Élément | Valeur |
|---------|--------|
| Base URL dev | \`http://localhost:3000\` (variable \`PORT\`) |
| Préfixe API | Aucun préfixe global — routes à la racine (\`/auth\`, \`/books\`, …) |
| CORS dev | \`localhost:5173\`, \`3000\`, \`4200\` |
| Header auth | \`Authorization: Bearer <access_token>\` |
| Content-Type JSON | \`application/json\` |
| Uploads | \`multipart/form-data\` (champ \`file\` ou \`icone\`) |

### Durée de vie des tokens

| Token | Durée | Usage |
|-------|-------|-------|
| \`access_token\` | ~15 min | Toutes les routes protégées |
| \`refresh_token\` | ~30 jours | Uniquement \`POST /auth/token/refresh\` et \`POST /auth/logout\` (body) |

### Pagination (toutes les listes)

**Query** : \`page\` (défaut 1), \`limit\` (défaut 20, max 100).

\`\`\`json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 142, "total_pages": 8 }
}
\`\`\`

### Erreur HTTP standard (NestJS)

\`\`\`json
{
  "statusCode": 400,
  "message": "Message en français (ou tableau de messages)",
  "error": "Bad Request"
}
\`\`\`

### Gardes d’accès

| Libellé | Comportement |
|---------|----------------|
| **Public** | Pas de JWT |
| **JWT** | Token valide + compte \`ACTIF\` |
| **JWT*** | Token valide, compte \`PENDING\` accepté (abonnements/paiements) |

---

## Parcours utilisateur (vue d’ensemble)

\`\`\`
[Inscription OTP] → [Login tokens] → [GET /me/dashboard]
       ↓
[GET /libraries] → [GET /libraries/:id/books] → [GET /books/:id]
       ↓
[access/check] → [POST /access] → [stream?token=] → [PATCH /progress]
       ↓
[GET /plans] → [POST /payments/init] → [GET /payments/status]
\`\`\`

---

${desc ? `## Description plateforme (Swagger)\n\n${desc}\n\n---\n\n` : ''}`;
}

export function buildAdminIntro(spec) {
  return `# BiblioTech API — Contrat admin (envoi / réception)

> **Référence back-office** avant intégration du dashboard admin (\`apps/web\`).  
> Généré depuis **OpenAPI** (\`docs/openapi.json\`) — **46 opérations** sous \`/admin/*\`.  
> Régénérer : \`npm run docs:admin\` (depuis \`backend/\`).  
> Inventaire des routes : [ADMIN-ROUTES-SWAGGER.md](./ADMIN-ROUTES-SWAGGER.md) · Swagger live : \`http://localhost:3000/api/docs\`

**Version API** : ${spec.info?.version ?? '2.0.0'}

---

## Authentification (toutes les routes admin)

| Élément | Valeur |
|---------|--------|
| Header | \`Authorization: Bearer <access_token>\` |
| Rôle | \`ADMIN\` (compte \`ACTIF\`) |
| Obtention du token | \`POST /auth/password/login\` avec un compte admin |
| Swagger UI | Bouton **Authorize** → \`Bearer <token>\` |

Réponses d’échec communes : **401** (JWT invalide), **403** (non admin ou banni).

---

## Conventions

| Sujet | Détail |
|-------|--------|
| Base URL dev | \`http://localhost:3000\` (variable \`PORT\`) |
| Préfixe | \`/admin/...\` (pas de \`/api/v1\`) |
| Listes paginées | Query \`page\` (défaut 1), \`limit\` (défaut 20, max 100) |
| Enveloppe liste | \`{ "data": [...], "meta": { "page", "limit", "total", "total_pages" } }\` |
| JSON | \`Content-Type: application/json\` |
| Uploads | \`multipart/form-data\` — livres (\`file\`, \`couverture\`), badges (\`icone\`) |

### Erreur HTTP standard (NestJS)

\`\`\`json
{
  "statusCode": 400,
  "message": "Message en français",
  "error": "Bad Request"
}
\`\`\`

---

## Documentation en 4 parties

| Partie | Fichier | Contenu |
|--------|---------|---------|
| 1 | [admin/PARTIE-1-REFERENTIELS.md](./admin/PARTIE-1-REFERENTIELS.md) | Catégories, Auteurs |
| 2 | [admin/PARTIE-2-CATALOGUE.md](./admin/PARTIE-2-CATALOGUE.md) | Livres, Bibliothèques |
| 3 | [admin/PARTIE-3-UTILISATEURS-MODERATION.md](./admin/PARTIE-3-UTILISATEURS-MODERATION.md) | Users, modération |
| 4 | [admin/PARTIE-4-MONETISATION-GAMIFICATION-STATS.md](./admin/PARTIE-4-MONETISATION-GAMIFICATION-STATS.md) | Plans, défis, stats |

Matrice d’intégration : [apps/web/docs/ADMIN-INTEGRATION.md](../../apps/web/docs/ADMIN-INTEGRATION.md).

---

`;
}

export function buildAdminPartIntro(spec, part) {
  return `# Partie ${part.num} — ${part.title}

> Contrat envoi/réception (OpenAPI). **Routes** : ${part.routes}  
> **Écrans web** : ${part.webPages}  
> Index : [ADMIN-API-CONTRACT.md](../ADMIN-API-CONTRACT.md) · Régénérer : \`npm run docs:admin\`

**Version API** : ${spec.info?.version ?? '2.0.0'}

---

`;
}

/**
 * Génère le markdown des opérations pour une liste de tags Swagger.
 */
export function renderTaggedOperations(spec, byTag, tags) {
  const parts = [];
  let count = 0;
  for (const tag of tags) {
    const ops = byTag.get(tag);
    if (!ops?.length) continue;
    parts.push(`## ${tag}\n\n`);
    for (const { method, path, op } of ops) {
      parts.push(formatOperation(spec, method, path, op));
      count++;
    }
    byTag.delete(tag);
  }
  return { markdown: parts.join(''), count };
}
