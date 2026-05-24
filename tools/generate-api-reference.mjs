/**
 * Génère docs/API-REFERENCE.md — référence frontend (entrées, sorties, erreurs).
 * Usage: node tools/generate-api-reference.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'API-REFERENCE.md');

function ep(method, path, opts) {
  const lines = [];
  lines.push(`#### \`${method} ${path}\``);
  lines.push('');
  lines.push(`**Usage concret** : ${opts.usage}`);
  lines.push('');
  lines.push(`**Auth** : ${opts.auth}`);
  if (opts.in) {
    lines.push('');
    lines.push('**Entrée**');
    lines.push(opts.in);
  }
  if (opts.out) {
    lines.push('');
    lines.push('**Réponse (succès)**');
    lines.push(opts.out);
  }
  lines.push('');
  lines.push('**Erreurs possibles**');
  lines.push('');
  lines.push('| HTTP | Message / cas |');
  lines.push('|------|-------------|');
  for (const e of opts.errors) {
    lines.push(`| ${e} |`);
  }
  lines.push('');
  return lines.join('\n');
}

const err = {
  val: '| `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) |',
  valShort: '| `400` | Paramètres invalides |',
  unauth: '| `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») |',
  forbidPending: '| `403` | Compte `PENDING` (« Validez d\'abord votre email via OTP. ») ou `BANNI` |',
  forbid: '| `403` | Accès refusé (ressource autre utilisateur, règle métier) |',
  notFound: '| `404` | Ressource introuvable |',
  conflict: '| `409` | Conflit (doublon email, ISBN, déjà inscrit au défi…) |',
  gone: '| `410` | Jeton de lecture expiré ou déjà consommé |',
  tooMany: '| `429` | Trop de requêtes (progression lecture anormale) |',
  badGateway: '| `502` | Erreur prestataire externe (PawaPay, Cloudinary) |',
  admin: '| `403` | « Accès réservé aux administrateurs. » |',
};

const parts = [];

parts.push(`# Référence API BiblioTech v2 — Frontend

Document généré pour le **développeur frontend** : chaque endpoint décrit ce qu’il permet de faire, les **données envoyées**, le **format de réponse** et les **erreurs HTTP** possibles.

- **Swagger live** : \`GET /api/docs\` (schémas DTO à jour)
- **Source** : régénérer avec \`node tools/generate-api-reference.mjs\` après changement d’API

---

## Conventions globales

### Headers

| Header | Quand |
|--------|--------|
| \`Authorization: Bearer <access_token>\` | Routes protégées (sauf auth publique, plans, webhooks) |
| \`Content-Type: application/json\` | Body JSON |
| \`Content-Type: multipart/form-data\` | Uploads (\`/me/photo\`, \`/admin/books\`, badges…) |

### Pagination (listes)

**Query** : \`page\` (défaut 1), \`limit\` (défaut 20, max 100).

**Réponse** :

\`\`\`json
{
  "data": [ /* éléments */ ],
  "meta": { "page": 1, "limit": 20, "total": 142, "total_pages": 8 }
}
\`\`\`

### Erreur standard (NestJS)

\`\`\`json
{
  "statusCode": 400,
  "message": "Message en français",
  "error": "Bad Request"
}
\`\`\`

Parfois \`message\` est un **tableau** si plusieurs erreurs de validation.

### Tokens auth (réponses login / OTP)

\`\`\`json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "statut": "ACTIF",
    "personne": { "nom": "Dupont", "prenom": "Jean", "points": 120 }
  },
  "is_new_user": true
}
\`\`\`

- \`access_token\` : ~15 min — header Bearer sur les routes protégées
- \`refresh_token\` : ~30 jours — **uniquement** \`POST /auth/token/refresh\` et \`POST /auth/logout\` (body)

### Gardes

| Libellé | Signification |
|---------|----------------|
| **Public** | Pas de JWT |
| **JWT** | \`JwtAuthGuard\` : JWT valide + compte **ACTIF** |
| **JWT*** | \`JwtAuthenticatedGuard\` : JWT valide, **PENDING** accepté |
| **Actif** | \`ActiveAccountGuard\` : compte **ACTIF** (souvent avec JWT*) |
| **Admin** | JWT + rôle \`ADMIN\` |

---

## 1. Santé

`);

parts.push(
  ep('GET', '/', {
    usage: 'Vérifier que le serveur NestJS répond (monitoring minimal).',
    auth: 'Public',
    out: '**200** — `string` : `"Hello World!"`',
    errors: ['| — | Pas d’erreur métier attendue |'],
  }),
);

parts.push(
  ep('GET', '/health', {
    usage: 'Sonde de santé : API + connectivité PostgreSQL (Kubernetes, UptimeRobot).',
    auth: 'Public',
    out: '**200** — JSON :\n```json\n{ "status": "ok", "database": "up", "response_time_ms": 12 }\n```',
    errors: [
      '| `503` | \`database\` ≠ \`up\` (PostgreSQL inaccessible) |',
    ],
  }),
);

parts.push('\n---\n\n## 2. Authentification — `/auth`\n\n');

const authEndpoints = [
  [
    'POST',
    '/auth/register',
    {
      usage: 'Créer un compte par email **sans** mot de passe ; envoi OTP par email.',
      auth: 'Public',
      in: '**Body JSON**\n```json\n{ "email": "user@example.com", "nom": "Dupont", "prenom": "Jean" }\n```',
      out: '**201** — `{ "message": "OTP envoyé. Valide 10 minutes." }`',
      errors: [err.val, err.conflict.replace('Conflit', '« Email déjà associé à un compte existant. »')],
    },
  ],
  [
    'POST',
    '/auth/register/password',
    {
      usage: 'Inscription avec mot de passe ; activation toujours par OTP ensuite.',
      auth: 'Public',
      in: '**Body** : `email`, `nom`, `prenom`, `password` (8–128 caractères)',
      out: '**201** — message OTP (idem register)',
      errors: [err.val, '| `409` | Email déjà utilisé |'],
    },
  ],
  [
    'POST',
    '/auth/otp/request',
    {
      usage: 'Demander un code OTP (connexion email ou renvoi après inscription).',
      auth: 'Public',
      in: '**Body** : `{ "email": "..." }`',
      out: '**200** — `{ "message": "..." }`',
      errors: [
        '| `404` | « Email inconnu — utilisez POST /auth/register… » |',
        '| `403` | « Compte suspendu. » |',
        err.val,
      ],
    },
  ],
  [
    'POST',
    '/auth/otp/verify',
    {
      usage: 'Valider le code OTP → **obtenir les tokens JWT** + activer le compte (`ACTIF`).',
      auth: 'Public',
      in: '**Body** : `{ "email": "...", "code": "123456" }` (6 chiffres)',
      out: '**200** — `AuthTokensResponse` + `is_new_user: boolean`',
      errors: [
        '| `400` | « Code OTP incorrect ou expiré. » |',
        '| `404` | Email inconnu |',
        '| `403` | Compte suspendu |',
        err.val,
      ],
    },
  ],
  [
    'POST',
    '/auth/google',
    {
      usage: 'Connexion ou inscription via Google Sign-In (`id_token`, pas access_token OAuth).',
      auth: 'Public',
      in: '**Body** : `{ "id_token": "<JWT Google>" }`',
      out: '**200** ou **201** — tokens + `is_new_user`',
      errors: [
        '| `400` | « id_token invalide ou expiré. » |',
        '| `403` | Compte suspendu |',
        '| `409` | Email déjà enregistré en LOCAL |',
      ],
    },
  ],
  [
    'POST',
    '/auth/google/link',
    {
      usage: 'Lier un compte Google à un compte BiblioTech déjà connecté.',
      auth: 'JWT (ACTIF)',
      in: '**Body** : `{ "id_token": "..." }`',
      out: '**200** — `{ message, auth_provider, email_verified }`',
      errors: [err.unauth, err.forbidPending, '| `400` | id_token invalide |', '| `409` | Google déjà lié ailleurs |'],
    },
  ],
  [
    'POST',
    '/auth/password/add',
    {
      usage: 'Ajouter un mot de passe à un compte créé par OTP/Google uniquement.',
      auth: 'JWT',
      in: '**Body** : `{ "password": "..." }`',
      out: '**200** — `{ message }`',
      errors: [err.unauth, '| `409` | Mot de passe déjà défini |', err.val],
    },
  ],
  [
    'POST',
    '/auth/password/change',
    {
      usage: 'Changer le mot de passe (utilisateur connecté).',
      auth: 'JWT',
      in: '**Body** : `{ "currentPassword", "newPassword" }`',
      out: '**200** — `{ message }`',
      errors: [
        err.unauth,
        '| `400` | Pas de MDP / MDP actuel incorrect |',
        err.val,
      ],
    },
  ],
  [
    'POST',
    '/auth/password/login',
    {
      usage: 'Connexion email + mot de passe classique.',
      auth: 'Public',
      in: '**Body** : `{ "email", "password" }`',
      out: '**200** — tokens + `is_new_user: false`',
      errors: [
        '| `400` | « Identifiants incorrects. » |',
        '| `403` | Suspendu ou PENDING (valider OTP) |',
        err.val,
      ],
    },
  ],
  [
    'POST',
    '/auth/password/reset/request',
    {
      usage: 'Mot de passe oublié — envoi OTP par email.',
      auth: 'Public',
      in: '**Body** : `{ "email" }`',
      out: '**200** — message générique (sécurité)',
      errors: ['| `404` | Email inconnu |', '| `403` | Compte suspendu |', err.val],
    },
  ],
  [
    'POST',
    '/auth/password/reset/confirm',
    {
      usage: 'Confirmer reset avec code OTP + nouveau mot de passe → tokens.',
      auth: 'Public',
      in: '**Body** : `{ "email", "code", "newPassword" }`',
      out: '**200** — tokens',
      errors: ['| `400` | OTP invalide |', err.val],
    },
  ],
  [
    'POST',
    '/auth/token/refresh',
    {
      usage: 'Renouveler l’`access_token` expiré (intercepteur HTTP 401).',
      auth: 'Public (body `refresh_token`)',
      in: '**Body** : `{ "refresh_token": "..." }`',
      out: '**200** — nouvelle paire access + refresh',
      errors: ['| `401` | Refresh invalide / expiré / révoqué |', '| `403` | Compte suspendu |'],
    },
  ],
  [
    'POST',
    '/auth/logout',
    {
      usage: 'Déconnexion : révoque le refresh token.',
      auth: 'JWT + body refresh',
      in: '**Body** : `{ "refresh_token" }`',
      out: '**200** — `{ "message": "Déconnexion réussie." }`',
      errors: [err.unauth],
    },
  ],
];

for (const [m, p, o] of authEndpoints) parts.push(ep(m, p, o));

parts.push(`
---

## 3. Profil — \`/me\`

Toutes les routes : **JWT (ACTIF)**.

`);

parts.push(
  ep('GET', '/me', {
    usage: 'Écran « Mon compte » : profil complet (identité, photo, points, abonnement résumé).',
    auth: 'JWT',
    out: '**200** — objet profil (\`AuthUserSchema\` enrichi)',
    errors: [err.unauth, err.forbidPending, '| `404` | « Profil introuvable. » |'],
  }),
);

parts.push(
  ep('GET', '/me/dashboard', {
    usage: 'Home connectée : agrégat lecture en cours, stats, badge récent, défis, nb notifications.',
    auth: 'JWT',
    out: '**200** — `{ profil, stats, defis, nb_notifications_non_lues, badge_recent, ... }`',
    errors: [err.unauth, err.forbidPending],
  }),
);

parts.push(
  ep('GET', '/me/reading', {
    usage: 'Ma bibliothèque personnelle (livres en cours / terminés).',
    auth: 'JWT',
    in: '**Query** : `statut?`, `sort?`, `page?`, `limit?`',
    out: '**200** — `{ data: livre + progression[], meta }`',
    errors: [err.unauth, err.forbidPending, err.val],
  }),
);

parts.push(
  ep('PATCH', '/me', {
    usage: 'Mettre à jour nom, bio, téléphone, préférences…',
    auth: 'JWT',
    in: '**Body** (tous optionnels) : `nom`, `prenom`, `date_naissance`, `photo_profil_url`, `bio`, `genre`, `ecole`, `niveau`, `numero_telephone` (E.164)',
    out: '**200** — profil mis à jour',
    errors: [err.unauth, err.forbidPending, err.val],
  }),
);

parts.push(
  ep('POST', '/me/photo', {
    usage: 'Upload avatar utilisateur (Cloudinary).',
    auth: 'JWT',
    in: '**multipart/form-data** — champ **`file`** (JPEG, PNG, WebP ; taille max configurée)',
    out: '**200** — profil avec `photo_profil_url`',
    errors: [
      err.unauth,
      err.forbidPending,
      '| `400` | Fichier manquant, type ou taille invalide |',
      err.badGateway,
    ],
  }),
);

parts.push(`
---

## 4. Bibliothèques — \`/libraries\`

**JWT (ACTIF)** — collections éditoriales.

| Endpoint | Usage | Entrée | Réponse 200 | Erreurs |
|----------|-------|--------|-------------|---------|
| \`GET /libraries/summary\` | Compteurs globaux (bannière explorer) | — | Stats agrégées | 401, 403 |
| \`GET /libraries\` | Grille de bibliothèques | \`q?\`, \`type?\`, \`sort?\`, \`page?\`, \`limit?\` | \`{ data, meta }\` | 401, 403, 400 |
| \`GET /libraries/:id\` | Fiche bibliothèque | Path \`id\` UUID | Détail + métadonnées | 401, 403, **404** « introuvable ou non active » |
| \`GET /libraries/:id/stats\` | Stats d’un rayon | Path \`id\` | Compteurs livres/auteurs | 404 |
| \`GET /libraries/:id/categories\` | Filtres catégories | Path \`id\` | Liste catégories + counts | 404 |
| \`GET /libraries/:id/books\` | Catalogue du rayon | \`q?\`, \`type_livre?\`, \`categorie_id?\`, \`page?\`, \`limit?\`, \`sort?\` | \`{ data, meta }\` | 404, **400** si bib **EXTERNE** |
| \`GET /libraries/:id/books/in-progress\` | Continuer dans ce rayon | \`page?\`, \`limit?\` | Livres + progression | 404, 400 EXTERNE |

---

## 5. Livres — \`/books\`

**JWT (ACTIF)** — catalogue, lecture, social.

### Catalogue

`);

parts.push(
  ep('GET', '/books', {
    usage: 'Grille catalogue avec filtres ; chaque item a `can_stream`, `can_download`.',
    auth: 'JWT',
    in: '**Query** : `q?`, `type_livre?`, `categorie_id?`, `auteur_id?`, `langue?`, `is_downloadable?`, `bibliotheque_id?`, `page?`, `limit?`, `sort?` (`recent`, `titre`, `nb_lectures`…)',
    out: '**200** — `{ data: LivreListItem[], meta }`',
    errors: [err.unauth, err.forbidPending, err.val],
  }),
);

parts.push(
  ep('GET', '/books/:id', {
    usage: 'Fiche livre détaillée (couverture, auteurs, note, bloc `acces`).',
    auth: 'JWT',
    in: '**Path** : `id` (UUID livre)',
    out: '**200** — objet livre enrichi',
    errors: [err.unauth, '| `404` | « Livre introuvable ou archivé. » |'],
  }),
);

parts.push(
  ep('GET', '/books/:id/access/check', {
    usage: 'Avant le bouton « Lire » : vérifie abonnement et quotas **sans** consommer de jeton.',
    auth: 'JWT',
    in: '**Query** : `type` = `LECTURE` \\| `TELECHARGEMENT`',
    out: '**200** — `{ allowed: boolean, reason?: string, subscription?: {...} }`',
    errors: [err.unauth, err.val, '| `404` | Livre |'],
  }),
);

parts.push(
  ep('POST', '/books/:id/access', {
    usage: 'Générer un jeton temporaire pour ouvrir le lecteur ou télécharger.',
    auth: 'JWT',
    in: '**Query** : `type` **requis** — `LECTURE` ou `TELECHARGEMENT`',
    out: '**200** — `{ token, expires_at, type, stream_url?, expires_in_sec?, progression_creee? }`',
    errors: [
      err.unauth,
      '| `403` | « Abonnement actif requis. », quota épuisé, plan insuffisant |',
      '| `404` | Livre ou ressource fichier indisponible |',
      err.val,
    ],
  }),
);

parts.push(
  ep('GET', '/books/:id/stream', {
    usage: 'Ouvrir le fichier média : redirection Cloudinary/R2 ou validation du token.',
    auth: 'Public (auth via query `token`)',
    in: '**Query** : `token` (requis), `validate?` (bool — si true, JSON au lieu de 302)',
    out: '**302** → URL fichier ; ou **200** `{ valid, redirect_url, message }` si `validate=true`',
    errors: [
      '| `404` | Token ou livre introuvable |',
      '| `403` | Token ne correspond pas à l’utilisateur |',
      '| `410` | Token expiré ou déjà utilisé |',
    ],
  }),
);

parts.push(
  ep('PATCH', '/books/:id/progress', {
    usage: 'Sauvegarder la page courante / durée de session (debounce lecteur).',
    auth: 'JWT',
    in: '**Body** : `{ "page_actuelle": number, "duree_lecture_min?": number }`',
    out: '**200** — progression + éventuels événements (badge, défi)',
    errors: [
      err.unauth,
      '| `403` | Abonnement requis |',
      '| `404` | Pas de progression (ouvrir via /access d’abord) |',
      '| `400` | Page non croissante / incohérente |',
      '| `429` | « Vitesse de lecture anormale. » |',
    ],
  }),
);

parts.push(
  ep('POST', '/books/:id/comments', {
    usage: 'Publier un avis sur le livre.',
    auth: 'JWT',
    in: '**Body** : `{ "contenu": "string" }`',
    out: '**201** — commentaire créé',
    errors: [err.unauth, '| `400` | Règles bibliothèque (EXTERNE) |', '| `404` | Livre |'],
  }),
);

parts.push(
  ep('POST', '/books/:id/rate', {
    usage: 'Noter le livre 1 à 5 étoiles.',
    auth: 'JWT',
    in: '**Body** : `{ "valeur": 1-5 }`',
    out: '**200** / **201** — notation enregistrée',
    errors: [err.unauth, err.val, '| `404` | Livre |'],
  }),
);

parts.push(`
**Autres routes livres** (même gardes JWT) :

| Route | Usage | Entrée | Réponse | Erreurs clés |
|-------|-------|--------|---------|--------------|
| \`GET /books/access/recent\` | Reprendre la lecture | \`page?\`, \`limit?\` | Liste paginée | 401, 403 |
| \`GET /books/:id/resource\` | Métadonnées fichier sans quota | Path \`id\` | \`resource\` | 404 |
| \`GET /books/:id/access/active\` | Réutiliser jeton valide | \`type?\` | token ou null | 403, 404 |
| \`GET /books/:id/similar\` | Carrousel similaires | \`limit?\` | Liste livres | 404 |
| \`GET /books/:id/challenges\` | Défis liés au livre | Path \`id\` | Liste défis | 404 |
| \`GET /books/:id/progress\` | Lire progression | Path \`id\` | Progression | 404 |
| \`GET /books/:id/comments\` | Fil d’avis | \`page?\`, \`limit?\` | \`{ data, meta }\` | 404 |
| \`PATCH/DELETE .../comments/:commentId\` | Modifier/supprimer **son** avis | \`contenu?\` | Commentaire | **403** pas auteur, 404 |

---

## 6. Plans & abonnements

`);

parts.push(
  ep('GET', '/plans', {
    usage: 'Page tarifs (accessible avant connexion).',
    auth: 'Public',
    out: '**200** — tableau de plans actifs (`HEBDOMADAIRE`, `MENSUEL`, `ANNUEL`, prix XOF…)',
    errors: [err.val],
  }),
);

parts.push(
  ep('GET', '/subscriptions/current', {
    usage: 'Savoir si l’utilisateur peut lire (bannière abonnement, guards UI).',
    auth: 'JWT*',
    out: '**200** — abonnement actif ou `null`',
    errors: [err.unauth],
  }),
);

parts.push(`
| Route | Usage | Entrée | Réponse | Erreurs |
|-------|-------|--------|---------|---------|
| \`GET /plans/:id\` | Détail offre | Path UUID | Plan | **404** plan inactif |
| \`GET /subscriptions/upcoming\` | Renouvellement programmé | — | Abonnement futur ou null | 401 |
| \`GET /subscriptions/summary\` | Widget résumé | — | Objet condensé | 401 |
| \`GET /subscriptions/compare\` | Écran changer de plan | — | Plans + indicateurs upgrade | 401 |
| \`GET /subscriptions/history\` | Historique | \`statut?\`, \`page?\`, \`limit?\` | \`{ data, meta }\` | 401, 400 |

---

## 7. Paiements — PawaPay — \`/payments\`

**Intégration réelle** : \`PAYMENT_PROVIDER=pawapay\`.

`);

parts.push(
  ep('POST', '/payments/init', {
    usage: 'Démarrer un paiement Mobile Money pour acheter un plan.',
    auth: 'JWT* + Actif',
    in: '**Body** :\n```json\n{\n  "plan_id": "uuid",\n  "phonenumber": "242061234567",\n  "operator": "MTN_MOMO_COG",\n  "country": "CG"\n}\n```\n`phonenumber` requis en mode PawaPay (ou profil rempli).',
    out: '**200** — `{ ref_transaction, payment_url, paiement_id, pawapay: { deposit_id } }`',
    errors: [
      err.unauth,
      err.forbidPending,
      '| `400` | Plan invalide, montant min, téléphone manquant, paiement déjà en attente |',
      err.badGateway,
    ],
  }),
);

parts.push(
  ep('GET', '/payments/status', {
    usage: 'Polling après paiement (écran « en cours » / retour app).',
    auth: 'JWT*',
    in: '**Query** : `transaction_id` (= `ref_transaction`)',
    out: '**200** — `{ statut: EN_ATTENTE|SUCCES|ECHEC, message, plan, abonnement_lie?, abonnement_actuel? }`',
    errors: [
      err.unauth,
      '| `404` | Transaction introuvable |',
      '| `403` | Transaction d’un autre utilisateur |',
    ],
  }),
);

parts.push(`
| Route | Usage | Entrée | Réponse | Erreurs |
|-------|-------|--------|---------|---------|
| \`GET /payments/checkout-preview\` | Récap prix avant paiement | \`plan_id\` query | Montant, prorata, libellés | 400 plan, 401, 403 |
| \`GET /payments/pending\` | Paiements en cours | — | Liste | 401 |
| \`GET /payments/return\` | Page retour navigateur | \`transaction_id?\` | Statut UX | — |
| \`POST /payments/mock/simulate\` | **Debug seulement** (mock) | \`transaction_id\`, \`outcome\` | Abonnement activé | **400** si pas mock |

### Webhooks — \`/api/webhooks/pawapay\` (serveur PawaPay, pas le front)

| Route | Réponse | Note |
|-------|---------|------|
| \`GET/POST .../deposits\` | **200** vide | Active l’abonnement async |
| \`POST .../payouts\`, \`refunds\` | **200** vide | Log uniquement |

---

## 8. Découverte

**JWT (ACTIF)** — recherche, recommandations, notifications.

`);

parts.push(
  ep('GET', '/search', {
    usage: 'Recherche full-text catalogue (titre, auteurs, ISBN…).',
    auth: 'JWT',
    in: '**Query** : `q` **requis** (min. 2 caractères), `categorie_id?`, `langue?`, `page?`, `limit?`',
    out: '**200** — `{ data: livres[], meta }` + enregistrement historique',
    errors: [
      err.unauth,
      err.forbidPending,
      '| `400` | « Terme trop court (minimum 2 caractères). » |',
    ],
  }),
);

parts.push(
  ep('POST', '/recommendations/refresh', {
    usage: 'Recalculer les suggestions (admin app / bouton actualiser).',
    auth: 'JWT',
    in: '**Body** : `{ "limit?": 5-100 }`',
    out: '**200** — `{ upserted, summary }`',
    errors: [err.unauth, err.val],
  }),
);

parts.push(`
| Route | Usage | Entrée | Erreurs clés |
|-------|-------|--------|--------------|
| \`GET /recommendations\` | Feed suggestions | \`raison?\`, \`vu?\`, \`page?\`… | 401, 403 |
| \`GET /recommendations/:id\` | Détail | Path UUID | 404, **403** autre user |
| \`PATCH .../interact\` | Marquer vu/cliqué | \`vu?\`, \`clique?\` (un true min.) | **400** si vide |
| \`PATCH .../dismiss\` | Masquer | — | 404, 403 |
| \`GET /notifications\` | Centre notifs | \`lu?\`, \`type?\`, \`page?\` | 401 |
| \`PATCH /notifications/:id/read\` | Marquer lue | Path UUID | 404, 403 |
| \`DELETE /search/history/:id\` | Supprimer suggestion | Path UUID | 404, 403 |

---

## 9. Gamification

`);

parts.push(
  ep('POST', '/challenges/:id/join', {
    usage: 'Participer à un défi de lecture.',
    auth: 'JWT',
    in: '**Path** : `id` (UUID défi)',
    out: '**201** — `{ defi_id, statut, progression }`',
    errors: [
      err.unauth,
      '| `404` | « Défi introuvable. » |',
      '| `400` | Défi terminé |',
      '| `409` | Déjà inscrit |',
    ],
  }),
);

parts.push(`
| Route | Usage | Réponse / erreurs |
|-------|-------|-------------------|
| \`GET /challenges\` | Liste défis | Paginé ; filtres \`type?\`, \`inscrit?\`… |
| \`GET /challenges/recommended\` | Suggestions | \`limit?\` |
| \`GET /challenges/expiring\` | Urgence fin proche | \`days?\` (défaut 7) |
| \`GET /challenges/:id/progress\` | Ma progression | 404 |
| \`DELETE /challenges/:id/join\` | Quitter | **400** si progression commencée |
| \`GET /badges\` | Galerie | \`obtenu?\`, pagination |
| \`GET /badges/next\` | Prochain à débloquer | 200 ou null |
| \`GET /gamification/overview\` | Hub gamification | Agrégat points/défis/badges |

---

## 10. Admin — \`/admin/*\`

**JWT + rôle ADMIN** sur toutes les routes.

Erreurs communes : **401**, **403** (non admin), **404**, **409** (doublons), **400** (validation fichier/ISBN).

| Préfixe | Usage back-office |
|--------|-------------------|
| \`/admin/users\` | Liste, création admin, fiche, ban/unban |
| \`/admin/books\` | CRUD livres, multipart \`file\` + \`couverture\`, catégories/auteurs |
| \`/admin/libraries\` | CRUD bibliothèques, associer livres |
| \`/admin/plans\` | CRUD tarifs |
| \`/admin/challenges\` | CRUD défis, participants, annulation |
| \`/admin/badges\` | CRUD badges, upload \`icone\` |
| \`/admin/categories\`, \`/admin/auteurs\` | Référentiels |
| \`/admin/comments\` | Modération avis |
| \`/admin/subscriptions\` | Liste, annulation |
| \`/admin/payments\` | Suivi transactions |
| \`/admin/stats/*\` | Dashboard, analytics livres/users/recherche |

### Exemples détaillés admin

`);

parts.push(
  ep('POST', '/admin/books', {
    usage: 'Créer un livre INTERNE avec fichier PDF/EPUB sur Cloudinary/R2.',
    auth: 'Admin',
    in: '**multipart** : `file?`, `couverture?`, champs `titre`, `type_livre`, `isbn?`, `resume?`, `is_downloadable?`, …',
    out: '**201** — livre créé',
    errors: [
      err.unauth,
      err.admin,
      '| `400` | Fichier / ISBN invalide |',
      '| `409` | ISBN déjà existant |',
      err.badGateway,
    ],
  }),
);

parts.push(
  ep('POST', '/admin/users', {
    usage: 'Créer un compte administrateur.',
    auth: 'Admin',
    in: '**Body** : `nom`, `prenom`, `email`, `password`',
    out: '**201** — utilisateur admin',
    errors: [err.admin, '| `409` | Email existant |', err.val],
  }),
);

parts.push(`
---

*Fin de la référence — ~130 endpoints. Pour les champs exacts des DTO, utiliser Swagger \`/api/docs\`.*
`);

writeFileSync(OUT, parts.join('\n'), 'utf8');
console.log('Written:', OUT);
