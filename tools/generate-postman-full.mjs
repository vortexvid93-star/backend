/**
 * Génère postman/BiblioTech-Complet-Tests.postman_collection.json
 * Usage: node tools/generate-postman-full.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'postman', 'BiblioTech-Complet-Tests.postman_collection.json');

const SCRIPTS = {
  saveUserToken: [
    "pm.test('Status OK', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
    "if (pm.response.code === 200 || pm.response.code === 201) {",
    "  const j = pm.response.json();",
    "  if (j.access_token) pm.collectionVariables.set('access_token', j.access_token.trim());",
    "  if (j.refresh_token) pm.collectionVariables.set('refresh_token', j.refresh_token.trim());",
    "}",
  ],
  saveAdminToken: [
    "pm.test('Status OK', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
    "if (pm.response.code === 200) {",
    "  const j = pm.response.json();",
    "  if (j.access_token) pm.collectionVariables.set('admin_access_token', j.access_token.trim());",
    "  pm.test('Role ADMIN', () => pm.expect(j.user?.role).to.eql('ADMIN'));",
    "}",
  ],
  status2xx: ["pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));"],
  needUserToken: [
    "if (!pm.collectionVariables.get('access_token')) throw new Error('Lancez 00 → Login utilisateur');",
  ],
  needAdminToken: [
    "if (!pm.collectionVariables.get('admin_access_token')) throw new Error('Lancez 00 → Login admin');",
  ],
  saveBookId: [
    ...['pm.test(\'2xx\', () => pm.expect(pm.response.code).to.be.within(200, 299));'],
    "const j = pm.response.json();",
    "const id = j.id || j.data?.[0]?.id;",
    "if (id) pm.collectionVariables.set('book_id', id);",
  ],
  savePlanId: [
    "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
    "const j = pm.response.json();",
    "const p = j.data?.[0] || j;",
    "if (p?.id) pm.collectionVariables.set('plan_id', p.id);",
  ],
  saveRefTransaction: [
    "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
    "const j = pm.response.json();",
    "if (j.ref_transaction) pm.collectionVariables.set('ref_transaction', j.ref_transaction);",
  ],
  saveLectureToken: [
    "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
    "const j = pm.response.json();",
    "if (j.token) pm.collectionVariables.set('lecture_token', j.token);",
  ],
  savePawaPayInit: [
    "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
    "const j = pm.response.json();",
    "if (j.ref_transaction) pm.collectionVariables.set('ref_transaction', j.ref_transaction);",
    "if (j.pawapay?.deposit_id) pm.collectionVariables.set('deposit_id', j.pawapay.deposit_id);",
    "console.log('PawaPay init — ref:', j.ref_transaction, '| deposit:', j.pawapay?.deposit_id);",
  ],
};

function testScript(name) {
  return [{ listen: 'test', script: { exec: SCRIPTS[name] || SCRIPTS.status2xx, type: 'text/javascript' } }];
}
function preScript(name) {
  return [{ listen: 'prerequest', script: { exec: SCRIPTS[name], type: 'text/javascript' } }];
}

const BEARER_USER = {
  type: 'bearer',
  bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
};
const BEARER_ADMIN = {
  type: 'bearer',
  bearer: [{ key: 'token', value: '{{admin_access_token}}', type: 'string' }],
};

function req(name, method, path, opts = {}) {
  const url = path.startsWith('http') ? path : `{{baseUrl}}${path}`;
  const item = {
    name,
    request: {
      method,
      header: opts.headers || [],
      url,
      description: opts.description || '',
    },
  };
  if (opts.noAuth) {
    item.request.auth = { type: 'noauth' };
  } else if (opts.authAdmin) {
    item.request.auth = BEARER_ADMIN;
  } else if (opts.authUser) {
    item.request.auth = BEARER_USER;
  }
  if (opts.body) {
    item.request.header.push({ key: 'Content-Type', value: 'application/json' });
    item.request.body = { mode: 'raw', raw: opts.body };
  }
  if (opts.formdata) {
    item.request.body = { mode: 'formdata', formdata: opts.formdata };
  }
  const events = [];
  if (opts.pre) events.push(...preScript(opts.pre).map((e) => e));
  if (opts.test) events.push(...testScript(opts.test).map((e) => e));
  else if (opts.testScripts) {
    events.push({
      listen: 'test',
      script: { exec: opts.testScripts, type: 'text/javascript' },
    });
  } else if (!opts.noTest) events.push(...testScript('status2xx'));
  if (events.length) item.event = events;
  return item;
}

function folder(name, description, items, auth) {
  const f = { name, description: description || '', item: items };
  if (auth === 'user') {
    f.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }] };
  }
  if (auth === 'admin') {
    f.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{admin_access_token}}', type: 'string' }] };
  }
  return f;
}

const collection = {
  auth: BEARER_USER,
  info: {
    _postman_id: 'bibliotech-complet-tests-v1',
    name: 'BiblioTech — Tests complets API',
    description:
      "Collection **unique** couvrant tous les endpoints BiblioTech v2.\n\n## Paiements = **PawaPay** (intégration réelle)\n`.env` : `PAYMENT_PROVIDER=pawapay` + `PAWAPAY_API_TOKEN` + **ngrok** sur `PAWAPAY_PUBLIC_BASE_URL`.\nDashboard PawaPay → Deposits : `{publicBaseUrl}/api/webhooks/pawapay/deposits`\n\nLe dossier **06 — Paiements PawaPay** teste le vrai flux Mobile Money (sandbox).\nLe dossier **11 — Mock (optionnel)** existe seulement si `PAYMENT_PROVIDER=mock` (sans ngrok).\n\n## Démarrage\n1. `npm run start:dev` + seed + ngrok → copier l’URL dans `publicBaseUrl`\n2. Login utilisateur (dossier 00)\n3. Dossier **06** puis **10** (E2E PawaPay : attendre ~20 s avant GET /payments/status)\n\n## Variables\n`access_token`, `publicBaseUrl`, `phonenumber`, `ref_transaction`, `deposit_id`, …",
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000' },
    { key: 'user_email', value: 'password@biblio.tech' },
    { key: 'user_password', value: 'MonMotDePasse123' },
    { key: 'admin_email', value: 'admin@biblio.tech' },
    { key: 'admin_password', value: 'MonMotDePasse123' },
    { key: 'otp_email', value: 'otp@biblio.tech' },
    { key: 'otp_code', value: '123456' },
    { key: 'access_token', value: '' },
    { key: 'refresh_token', value: '' },
    { key: 'admin_access_token', value: '' },
    { key: 'book_id', value: '' },
    { key: 'library_id', value: '' },
    { key: 'plan_id', value: '' },
    { key: 'ref_transaction', value: '' },
    { key: 'lecture_token', value: '' },
    { key: 'challenge_id', value: '' },
    { key: 'badge_id', value: '' },
    { key: 'recommendation_id', value: '' },
    { key: 'notification_id', value: '' },
    { key: 'comment_id', value: '' },
    { key: 'category_id', value: '' },
    { key: 'author_id', value: '' },
    { key: 'target_user_id', value: '' },
    { key: 'admin_plan_id', value: '' },
    { key: 'admin_badge_id', value: '' },
    { key: 'publicBaseUrl', value: 'https://VOTRE-ID.ngrok-free.app' },
    { key: 'phonenumber', value: '242063456789' },
    { key: 'phonenumber_mtn', value: '242063456789' },
    { key: 'phonenumber_airtel', value: '242053456789' },
    { key: 'provider', value: 'MTN_MOMO_COG' },
    { key: 'deposit_id', value: '' },
  ],
  item: [
    folder('00 — Prérequis (à lancer en premier)', 'Connexion + remplissage des tokens.', [
      req('GET /health', 'GET', '/health', {
        noAuth: true,
        testScripts: [
          "pm.test('DB up', () => {",
          "  pm.response.to.have.status(200);",
          "  pm.expect(pm.response.json().database).to.eql('up');",
          "});",
        ],
      }),
      req('GET / (ping)', 'GET', '/', { noAuth: true }),
      req('Login utilisateur → access_token', 'POST', '/auth/password/login', {
        noAuth: true,
        body: JSON.stringify({ email: '{{user_email}}', password: '{{user_password}}' }, null, 2).replace(
          /"{{(\w+)}}"/g,
          '{{$1}}',
        ),
        test: 'saveUserToken',
        description: 'Compte seed ou créé via register/password. Si 404 → créer le compte (dossier 01).',
      }),
      req('Login admin → admin_access_token', 'POST', '/auth/password/login', {
        noAuth: true,
        body: '{\n  "email": "{{admin_email}}",\n  "password": "{{admin_password}}"\n}',
        test: 'saveAdminToken',
        description: "SQL: UPDATE auth SET role='ADMIN', statut='ACTIF' WHERE email='{{admin_email}}';",
      }),
      req('GET /plans → plan_id', 'GET', '/plans', {
        noAuth: true,
        test: 'savePlanId',
      }),
      req('GET /books → book_id', 'GET', '/books?page=1&limit=5', {
        pre: 'needUserToken',
        authUser: true,
        testScripts: [
          "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
          "const j = pm.response.json();",
          "if (j.data?.[0]?.id) pm.collectionVariables.set('book_id', j.data[0].id);",
        ],
      }),
      req('GET /libraries → library_id', 'GET', '/libraries?page=1&limit=5', {
        pre: 'needUserToken',
        authUser: true,
        testScripts: [
          "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
          "const j = pm.response.json();",
          "if (j.data?.[0]?.id) pm.collectionVariables.set('library_id', j.data[0].id);",
        ],
      }),
    ]),

    folder('01 — Auth', 'Routes publiques sauf logout/refresh (tokens dans body).', [
      req('POST /auth/register', 'POST', '/auth/register', {
        noAuth: true,
        body: '{\n  "email": "{{otp_email}}",\n  "nom": "Test",\n  "prenom": "OTP"\n}',
      }),
      req('POST /auth/register/password', 'POST', '/auth/register/password', {
        noAuth: true,
        body: '{\n  "email": "newuser@biblio.tech",\n  "nom": "Nouveau",\n  "prenom": "User",\n  "password": "MonMotDePasse123"\n}',
      }),
      req('POST /auth/otp/request', 'POST', '/auth/otp/request', {
        noAuth: true,
        body: '{\n  "email": "{{otp_email}}"\n}',
      }),
      req('POST /auth/otp/verify', 'POST', '/auth/otp/verify', {
        noAuth: true,
        body: '{\n  "email": "{{otp_email}}",\n  "code": "{{otp_code}}"\n}',
        test: 'saveUserToken',
        description: 'Récupérer le code dans les logs serveur ou email Resend.',
      }),
      req('POST /auth/password/login', 'POST', '/auth/password/login', {
        noAuth: true,
        body: '{\n  "email": "{{user_email}}",\n  "password": "{{user_password}}"\n}',
        test: 'saveUserToken',
      }),
      req('POST /auth/password/reset/request', 'POST', '/auth/password/reset/request', {
        noAuth: true,
        body: '{\n  "email": "{{user_email}}"\n}',
      }),
      req('POST /auth/password/reset/confirm', 'POST', '/auth/password/reset/confirm', {
        noAuth: true,
        body: '{\n  "email": "{{user_email}}",\n  "code": "{{otp_code}}",\n  "newPassword": "MonMotDePasse123"\n}',
      }),
      req('POST /auth/token/refresh', 'POST', '/auth/token/refresh', {
        noAuth: true,
        body: '{\n  "refresh_token": "{{refresh_token}}"\n}',
        test: 'saveUserToken',
      }),
      req('POST /auth/logout', 'POST', '/auth/logout', {
        body: '{\n  "refresh_token": "{{refresh_token}}"\n}',
        pre: 'needUserToken',
      }),
      req('POST /auth/google (manuel)', 'POST', '/auth/google', {
        noAuth: true,
        body: '{\n  "id_token": "COLLEZ_ID_TOKEN_GOOGLE"\n}',
        noTest: true,
        description: 'Optionnel — nécessite un vrai id_token Google.',
      }),
      req('POST /auth/google/link', 'POST', '/auth/google/link', {
        pre: 'needUserToken',
        body: '{\n  "id_token": "COLLEZ_ID_TOKEN_GOOGLE"\n}',
        noTest: true,
      }),
      req('POST /auth/password/add', 'POST', '/auth/password/add', {
        pre: 'needUserToken',
        body: '{\n  "password": "MonMotDePasse123"\n}',
      }),
      req('POST /auth/password/change', 'POST', '/auth/password/change', {
        pre: 'needUserToken',
        body: '{\n  "currentPassword": "{{user_password}}",\n  "newPassword": "MonMotDePasse123"\n}',
      }),
    ]),

    folder(
      '02 — Profil /me',
      'JWT utilisateur actif.',
      [
        req('GET /me', 'GET', '/me', { pre: 'needUserToken' }),
        req('GET /me/dashboard', 'GET', '/me/dashboard', { pre: 'needUserToken' }),
        req('GET /me/reading', 'GET', '/me/reading?page=1&limit=10', { pre: 'needUserToken' }),
        req('GET /me/activity', 'GET', '/me/activity?page=1&limit=10', { pre: 'needUserToken' }),
        req('GET /me/completion', 'GET', '/me/completion', { pre: 'needUserToken' }),
        req('GET /me/actions', 'GET', '/me/actions', { pre: 'needUserToken' }),
        req('PATCH /me', 'PATCH', '/me', {
          pre: 'needUserToken',
          body: '{\n  "bio": "Profil test Postman"\n}',
        }),
        req('GET /me/badges/summary', 'GET', '/me/badges/summary', { pre: 'needUserToken' }),
        req('GET /me/badges', 'GET', '/me/badges', { pre: 'needUserToken' }),
        req('GET /me/challenges/summary', 'GET', '/me/challenges/summary', { pre: 'needUserToken' }),
        req('GET /me/challenges', 'GET', '/me/challenges', { pre: 'needUserToken' }),
        req('GET /me/challenges/:defiId', 'GET', '/me/challenges/{{challenge_id}}', {
          pre: 'needUserToken',
          noTest: true,
        }),
        req('GET /me/stats', 'GET', '/me/stats', { pre: 'needUserToken' }),
        req('GET /me/stats/reading', 'GET', '/me/stats/reading', { pre: 'needUserToken' }),
        req('GET /me/stats/social', 'GET', '/me/stats/social', { pre: 'needUserToken' }),
        req('GET /me/comments', 'GET', '/me/comments?page=1&limit=10', { pre: 'needUserToken' }),
        req('GET /me/ratings', 'GET', '/me/ratings?page=1&limit=10', { pre: 'needUserToken' }),
        req('POST /me/photo (multipart)', 'POST', '/me/photo', {
          pre: 'needUserToken',
          noTest: true,
          formdata: [
            { key: 'file', type: 'file', src: [], description: 'Sélectionner une image JPG/PNG' },
          ],
          description: 'Nécessite CLOUDINARY_URL. Sélectionner un fichier sur le champ file.',
        }),
        req('DELETE /me/photo', 'DELETE', '/me/photo', { pre: 'needUserToken' }),
      ],
      'user',
    ),

    folder(
      '03 — Bibliothèques',
      '',
      [
        req('GET /libraries/summary', 'GET', '/libraries/summary', { pre: 'needUserToken' }),
        req('GET /libraries', 'GET', '/libraries?page=1&limit=10', { pre: 'needUserToken' }),
        req('GET /libraries/:id', 'GET', '/libraries/{{library_id}}', { pre: 'needUserToken' }),
        req('GET /libraries/:id/stats', 'GET', '/libraries/{{library_id}}/stats', { pre: 'needUserToken' }),
        req('GET /libraries/:id/categories', 'GET', '/libraries/{{library_id}}/categories', {
          pre: 'needUserToken',
        }),
        req('GET /libraries/:id/books/in-progress', 'GET', '/libraries/{{library_id}}/books/in-progress', {
          pre: 'needUserToken',
        }),
        req('GET /libraries/:id/books', 'GET', '/libraries/{{library_id}}/books?page=1&limit=10', {
          pre: 'needUserToken',
        }),
      ],
      'user',
    ),

    folder(
      '04 — Livres & lecture',
      'Abonnement actif requis pour /access. Type: LECTURE | TELECHARGEMENT',
      [
        req('GET /books', 'GET', '/books?page=1&limit=10&sort=recent', { pre: 'needUserToken' }),
        req('GET /books?q=SEED', 'GET', '/books?q=SEED&limit=5', { pre: 'needUserToken' }),
        req('GET /books/access/recent', 'GET', '/books/access/recent?page=1&limit=5', { pre: 'needUserToken' }),
        req('GET /books/:id', 'GET', '/books/{{book_id}}', { pre: 'needUserToken' }),
        req('GET /books/:id/resource', 'GET', '/books/{{book_id}}/resource', { pre: 'needUserToken' }),
        req('GET /books/:id/similar', 'GET', '/books/{{book_id}}/similar?limit=5', { pre: 'needUserToken' }),
        req('GET /books/:id/challenges', 'GET', '/books/{{book_id}}/challenges', { pre: 'needUserToken' }),
        req('GET /books/:id/access/check?type=LECTURE', 'GET', '/books/{{book_id}}/access/check?type=LECTURE', {
          pre: 'needUserToken',
        }),
        req('GET /books/:id/access/active?type=LECTURE', 'GET', '/books/{{book_id}}/access/active?type=LECTURE', {
          pre: 'needUserToken',
        }),
        req('POST /books/:id/access?type=LECTURE', 'POST', '/books/{{book_id}}/access?type=LECTURE', {
          pre: 'needUserToken',
          test: 'saveLectureToken',
        }),
        req('GET /books/:id/stream?validate=true', 'GET', '/books/{{book_id}}/stream?token={{lecture_token}}&validate=true', {
          noAuth: true,
          description: 'Pas de Bearer — jeton lecture en query (?token=).',
        }),
        req('GET /books/:id/access?type=TELECHARGEMENT', 'GET', '/books/{{book_id}}/access?type=TELECHARGEMENT', {
          pre: 'needUserToken',
        }),
        req('GET /books/:id/progress', 'GET', '/books/{{book_id}}/progress', { pre: 'needUserToken' }),
        req('PATCH /books/:id/progress', 'PATCH', '/books/{{book_id}}/progress', {
          pre: 'needUserToken',
          body: '{\n  "page_actuelle": 5,\n  "duree_lecture_min": 10\n}',
        }),
        req('GET /books/:id/comments', 'GET', '/books/{{book_id}}/comments?page=1&limit=10', { pre: 'needUserToken' }),
        req('POST /books/:id/comments', 'POST', '/books/{{book_id}}/comments', {
          pre: 'needUserToken',
          body: '{\n  "contenu": "Commentaire test Postman"\n}',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "if (pm.response.code === 201) pm.collectionVariables.set('comment_id', pm.response.json().id);",
          ],
        }),
        req('PATCH /books/:id/comments/:commentId', 'PATCH', '/books/{{book_id}}/comments/{{comment_id}}', {
          pre: 'needUserToken',
          body: '{\n  "contenu": "Commentaire modifié"\n}',
          noTest: true,
        }),
        req('POST /books/:id/rate', 'POST', '/books/{{book_id}}/rate', {
          pre: 'needUserToken',
          body: '{\n  "valeur": 4\n}',
        }),
        req('PATCH /books/:id/rate', 'PATCH', '/books/{{book_id}}/rate', {
          pre: 'needUserToken',
          body: '{\n  "valeur": 5\n}',
        }),
      ],
      'user',
    ),

    folder('05 — Plans & abonnements', '', [
      req('GET /plans', 'GET', '/plans', { noAuth: true }),
      req('GET /plans/:id', 'GET', '/plans/{{plan_id}}', { noAuth: true }),
      req('GET /subscriptions/current', 'GET', '/subscriptions/current', { pre: 'needUserToken' }),
      req('GET /subscriptions/upcoming', 'GET', '/subscriptions/upcoming', { pre: 'needUserToken' }),
      req('GET /subscriptions/summary', 'GET', '/subscriptions/summary', { pre: 'needUserToken' }),
      req('GET /subscriptions/compare', 'GET', '/subscriptions/compare', { pre: 'needUserToken' }),
      req('GET /subscriptions/history', 'GET', '/subscriptions/history?page=1&limit=10', { pre: 'needUserToken' }),
    ], 'user'),

    folder(
      '06 — Paiements PawaPay (intégration réelle)',
      '`.env` : PAYMENT_PROVIDER=pawapay, PAWAPAY_API_TOKEN, PAWAPAY_PUBLIC_BASE_URL (= publicBaseUrl ngrok). Callback dashboard → /api/webhooks/pawapay/deposits. Sandbox : callback COMPLETED auto en ~3–20 s.',
      [
        req('GET webhook deposits (ping ngrok)', 'GET', '{{publicBaseUrl}}/api/webhooks/pawapay/deposits', {
          noAuth: true,
          description: 'Doit répondre 200. Si échec → ngrok arrêté ou publicBaseUrl incorrect.',
        }),
        req('GET /payments/checkout-preview', 'GET', '/payments/checkout-preview?plan_id={{plan_id}}', {
          pre: 'needUserToken',
          authUser: true,
        }),
        req('POST /payments/init — MTN (MTN_MOMO_COG)', 'POST', '/payments/init', {
          pre: 'needUserToken',
          authUser: true,
          body: '{\n  "plan_id": "{{plan_id}}",\n  "phonenumber": "{{phonenumber_mtn}}",\n  "operator": "MTN_MOMO_COG",\n  "country": "CG"\n}',
          test: 'savePawaPayInit',
        }),
        req('POST /payments/init — Airtel (AIRTEL_COG)', 'POST', '/payments/init', {
          pre: 'needUserToken',
          authUser: true,
          body: '{\n  "plan_id": "{{plan_id}}",\n  "phonenumber": "{{phonenumber_airtel}}",\n  "operator": "AIRTEL_COG",\n  "country": "CG"\n}',
          test: 'savePawaPayInit',
        }),
        req('POST /payments/init — auto opérateur', 'POST', '/payments/init', {
          pre: 'needUserToken',
          authUser: true,
          body: '{\n  "plan_id": "{{plan_id}}",\n  "phonenumber": "{{phonenumber}}",\n  "country": "CG"\n}',
          test: 'savePawaPayInit',
        }),
        req('GET /payments/pending', 'GET', '/payments/pending', { pre: 'needUserToken', authUser: true }),
        req('GET /payments/status (sync API PawaPay)', 'GET', '/payments/status?transaction_id={{ref_transaction}}', {
          pre: 'needUserToken',
          authUser: true,
          description: 'Lancer 20–30 s après init (callback + réconciliation auto backend). Statut attendu : SUCCES.',
        }),
        req('GET /payments/return', 'GET', '/payments/return?transaction_id={{ref_transaction}}', { noAuth: true }),
        req('GET /subscriptions/current (après paiement)', 'GET', '/subscriptions/current', {
          pre: 'needUserToken',
          authUser: true,
        }),
        req('POST callback dépôt COMPLETED (test manuel)', 'POST', '/api/webhooks/pawapay/deposits', {
          noAuth: true,
          body: '{\n  "depositId": "{{deposit_id}}",\n  "status": "COMPLETED",\n  "clientReferenceId": "{{ref_transaction}}",\n  "amount": "4900",\n  "currency": "XAF",\n  "country": "COG",\n  "payer": {\n    "type": "MMO",\n    "accountDetails": {\n      "phoneNumber": "{{phonenumber}}",\n      "provider": "{{provider}}"\n    }\n  },\n  "created": "2025-05-15T07:38:56Z"\n}',
          description: 'Si le callback sandbox n’arrive pas : simuler le webhook PawaPay à la main.',
        }),
      ],
      'user',
    ),

    folder(
      '07 — Découverte',
      '',
      [
        req('POST /recommendations/refresh', 'POST', '/recommendations/refresh', {
          pre: 'needUserToken',
          body: '{\n  "limit": 30\n}',
        }),
        req('GET /recommendations', 'GET', '/recommendations?page=1&limit=10', {
          pre: 'needUserToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "const j = pm.response.json();",
            "if (j.data?.[0]) {",
            "  pm.collectionVariables.set('recommendation_id', j.data[0].id);",
            "  if (j.data[0].livre?.id) pm.collectionVariables.set('book_id', j.data[0].livre.id);",
            "}",
          ],
        }),
        req('GET /recommendations/summary', 'GET', '/recommendations/summary', { pre: 'needUserToken' }),
        req('GET /recommendations/picks', 'GET', '/recommendations/picks?limit=5', { pre: 'needUserToken' }),
        req('GET /recommendations/by-reason', 'GET', '/recommendations/by-reason', { pre: 'needUserToken' }),
        req('GET /recommendations/for-book/:livreId', 'GET', '/recommendations/for-book/{{book_id}}', {
          pre: 'needUserToken',
        }),
        req('GET /recommendations/:id', 'GET', '/recommendations/{{recommendation_id}}', { pre: 'needUserToken', noTest: true }),
        req('PATCH /recommendations/:id/interact', 'PATCH', '/recommendations/{{recommendation_id}}/interact', {
          pre: 'needUserToken',
          body: '{\n  "action": "VIEW"\n}',
          noTest: true,
        }),
        req('PATCH /recommendations/:id/dismiss', 'PATCH', '/recommendations/{{recommendation_id}}/dismiss', {
          pre: 'needUserToken',
        }),
        req('PATCH /recommendations/mark-all-seen', 'PATCH', '/recommendations/mark-all-seen', { pre: 'needUserToken' }),
        req('GET /search', 'GET', '/search?q=SEED&page=1&limit=10', { pre: 'needUserToken' }),
        req('GET /search/history', 'GET', '/search/history', { pre: 'needUserToken' }),
        req('PATCH /search/history/:id/click', 'PATCH', '/search/history/{{search_history_id}}/click', {
          pre: 'needUserToken',
          noTest: true,
        }),
        req('GET /notifications', 'GET', '/notifications?page=1&limit=10', {
          pre: 'needUserToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "const j = pm.response.json();",
            "if (j.data?.[0]?.id) pm.collectionVariables.set('notification_id', j.data[0].id);",
          ],
        }),
        req('PATCH /notifications/read-all', 'PATCH', '/notifications/read-all', { pre: 'needUserToken' }),
        req('PATCH /notifications/:id/read', 'PATCH', '/notifications/{{notification_id}}/read', {
          pre: 'needUserToken',
          noTest: true,
        }),
      ],
      'user',
    ),

    folder(
      '08 — Gamification',
      '',
      [
        req('GET /gamification/overview', 'GET', '/gamification/overview', { pre: 'needUserToken' }),
        req('GET /challenges', 'GET', '/challenges?page=1&limit=10', {
          pre: 'needUserToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "const j = pm.response.json();",
            "if (j.data?.[0]?.id) pm.collectionVariables.set('challenge_id', j.data[0].id);",
          ],
        }),
        req('GET /challenges/recommended', 'GET', '/challenges/recommended', { pre: 'needUserToken' }),
        req('GET /challenges/expiring', 'GET', '/challenges/expiring', { pre: 'needUserToken' }),
        req('GET /challenges/:id', 'GET', '/challenges/{{challenge_id}}', { pre: 'needUserToken' }),
        req('GET /challenges/:id/stats', 'GET', '/challenges/{{challenge_id}}/stats', { pre: 'needUserToken' }),
        req('GET /challenges/:id/progress', 'GET', '/challenges/{{challenge_id}}/progress', { pre: 'needUserToken' }),
        req('POST /challenges/:id/join', 'POST', '/challenges/{{challenge_id}}/join', { pre: 'needUserToken' }),
        req('DELETE /challenges/:id/join', 'DELETE', '/challenges/{{challenge_id}}/join', { pre: 'needUserToken' }),
        req('GET /badges', 'GET', '/badges', {
          pre: 'needUserToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "const j = pm.response.json();",
            "const list = j.data || j;",
            "if (Array.isArray(list) && list[0]?.id) pm.collectionVariables.set('badge_id', list[0].id);",
          ],
        }),
        req('GET /badges/next', 'GET', '/badges/next', { pre: 'needUserToken' }),
        req('GET /badges/:id', 'GET', '/badges/{{badge_id}}', { pre: 'needUserToken', noTest: true }),
        req('GET /badges/:id/path', 'GET', '/badges/{{badge_id}}/path', { pre: 'needUserToken', noTest: true }),
      ],
      'user',
    ),

    folder(
      '09 — Admin',
      'JWT role ADMIN. Création livre : sélectionner un fichier PDF sur POST /admin/books.',
      [
        req('GET /admin/users', 'GET', '/admin/users?page=1&limit=10', {
          pre: 'needAdminToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "const j = pm.response.json();",
            "const u = j.data?.find(x => x.role === 'USER') || j.data?.[0];",
            "if (u?.id) pm.collectionVariables.set('target_user_id', u.id);",
          ],
        }),
        req('GET /admin/users/:id', 'GET', '/admin/users/{{target_user_id}}', { pre: 'needAdminToken', noTest: true }),
        req('PATCH /admin/users/:id/ban', 'PATCH', '/admin/users/{{target_user_id}}/ban', {
          pre: 'needAdminToken',
          body: '{\n  "motif": "Test modération"\n}',
          noTest: true,
          description: 'Ne pas bannir votre compte de test principal.',
        }),
        req('GET /admin/books', 'GET', '/admin/books?page=1&limit=5', { pre: 'needAdminToken' }),
        req('GET /admin/libraries', 'GET', '/admin/libraries?page=1&limit=10', { pre: 'needAdminToken' }),
        req('GET /admin/auteurs', 'GET', '/admin/auteurs?page=1&limit=10', {
          pre: 'needAdminToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "if (pm.response.json().data?.[0]?.id) pm.collectionVariables.set('author_id', pm.response.json().data[0].id);",
          ],
        }),
        req('GET /admin/categories', 'GET', '/admin/categories?page=1&limit=10', {
          pre: 'needAdminToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "if (pm.response.json().data?.[0]?.id) pm.collectionVariables.set('category_id', pm.response.json().data[0].id);",
          ],
        }),
        req('GET /admin/plans', 'GET', '/admin/plans', {
          pre: 'needAdminToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "const j = pm.response.json();",
            "const p = j.data?.[0] || j[0];",
            "if (p?.id) pm.collectionVariables.set('admin_plan_id', p.id);",
          ],
        }),
        req('GET /admin/challenges', 'GET', '/admin/challenges?page=1&limit=10', { pre: 'needAdminToken' }),
        req('GET /admin/badges', 'GET', '/admin/badges', {
          pre: 'needAdminToken',
          testScripts: [
            "pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));",
            "const j = pm.response.json();",
            "const b = j.data?.[0] || j[0];",
            "if (b?.id) pm.collectionVariables.set('admin_badge_id', b.id);",
          ],
        }),
        req('GET /admin/comments', 'GET', '/admin/comments?page=1&limit=10', { pre: 'needAdminToken' }),
        req('GET /admin/subscriptions', 'GET', '/admin/subscriptions?page=1&limit=10', { pre: 'needAdminToken' }),
        req('GET /admin/payments', 'GET', '/admin/payments?page=1&limit=10', { pre: 'needAdminToken' }),
        req('GET /admin/stats/dashboard', 'GET', '/admin/stats/dashboard', { pre: 'needAdminToken' }),
        req('GET /admin/stats/books', 'GET', '/admin/stats/books?periode=30j', { pre: 'needAdminToken' }),
        req('GET /admin/stats/users', 'GET', '/admin/stats/users?periode=30j', { pre: 'needAdminToken' }),
        req('GET /admin/stats/search-terms', 'GET', '/admin/stats/search-terms?periode=30j', { pre: 'needAdminToken' }),
        req('GET /api/webhooks/pawapay/deposits (ping local)', 'GET', '/api/webhooks/pawapay/deposits', {
          noAuth: true,
          description: 'Ping sans ngrok (localhost). Pour PawaPay réel, utiliser publicBaseUrl dans dossier 06.',
        }),
      ],
      'admin',
    ),

    folder(
      '10 — Parcours E2E PawaPay',
      'Collection Runner : delay **5000 ms** entre étapes 4→6 (attente callback). `.env` = pawapay + ngrok.',
      [
        req('1. Health', 'GET', '/health', { noAuth: true }),
        req('2. Login user', 'POST', '/auth/password/login', {
          noAuth: true,
          body: '{\n  "email": "{{user_email}}",\n  "password": "{{user_password}}"\n}',
          test: 'saveUserToken',
        }),
        req('3. GET /plans', 'GET', '/plans', { noAuth: true, test: 'savePlanId' }),
        req('4. Ping webhook ngrok', 'GET', '{{publicBaseUrl}}/api/webhooks/pawapay/deposits', { noAuth: true }),
        req('5. POST /payments/init (PawaPay)', 'POST', '/payments/init', {
          pre: 'needUserToken',
          authUser: true,
          body: '{\n  "plan_id": "{{plan_id}}",\n  "phonenumber": "{{phonenumber}}",\n  "operator": "{{provider}}",\n  "country": "CG"\n}',
          test: 'savePawaPayInit',
        }),
        req('6. GET /payments/status — relancer si EN_ATTENTE', 'GET', '/payments/status?transaction_id={{ref_transaction}}', {
          pre: 'needUserToken',
          authUser: true,
          description: 'Attendre 20 s après étape 5. Relancer jusqu’à statut SUCCES.',
        }),
        req('7. GET /subscriptions/current', 'GET', '/subscriptions/current', { pre: 'needUserToken', authUser: true }),
        req('8. GET /books → book_id', 'GET', '/books?limit=1', {
          pre: 'needUserToken',
          authUser: true,
          testScripts: [
            "const j = pm.response.json();",
            "if (j.data?.[0]?.id) pm.collectionVariables.set('book_id', j.data[0].id);",
            "pm.test('book_id', () => pm.expect(pm.collectionVariables.get('book_id')).to.be.a('string').and.not.empty);",
          ],
        }),
        req('9. POST /books/:id/access', 'POST', '/books/{{book_id}}/access?type=LECTURE', {
          pre: 'needUserToken',
          authUser: true,
          test: 'saveLectureToken',
        }),
        req('10. GET /books/:id/stream validate', 'GET', '/books/{{book_id}}/stream?token={{lecture_token}}&validate=true', {
          noAuth: true,
        }),
        req('11. GET /me/dashboard', 'GET', '/me/dashboard', { pre: 'needUserToken', authUser: true }),
      ],
    ),

    folder(
      '11 — Paiements mock (optionnel, sans PawaPay)',
      'Uniquement si `.env` → `PAYMENT_PROVIDER=mock`. Pas d’intégration réelle — debug local sans ngrok.',
      [
        req('POST /payments/init (mock)', 'POST', '/payments/init', {
          pre: 'needUserToken',
          authUser: true,
          body: '{\n  "plan_id": "{{plan_id}}"\n}',
          test: 'saveRefTransaction',
        }),
        req('POST /payments/mock/simulate SUCCESS', 'POST', '/payments/mock/simulate', {
          noAuth: true,
          body: '{\n  "transaction_id": "{{ref_transaction}}",\n  "outcome": "success"\n}',
        }),
        req('GET /payments/status', 'GET', '/payments/status?transaction_id={{ref_transaction}}', {
          pre: 'needUserToken',
          authUser: true,
        }),
      ],
      'user',
    ),
  ],
};

// Fix login body - use template strings properly
const loginUser = collection.item[0].item.find((i) => i.name.includes('Login utilisateur'));
loginUser.request.body = {
  mode: 'raw',
  raw: '{\n  "email": "{{user_email}}",\n  "password": "{{user_password}}"\n}',
};

writeFileSync(OUT, JSON.stringify(collection, null, 2), 'utf8');
console.log('Written:', OUT);
console.log('Folders:', collection.item.length);
let count = 0;
for (const f of collection.item) count += f.item?.length || 0;
console.log('Requests:', count);
