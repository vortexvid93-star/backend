# Référence API BiblioTech v2 — Frontend (condensée)

> **Document principal (complet, Swagger + exemples JSON)** : [FRONTEND-API-README.md](./FRONTEND-API-README.md) — à utiliser en priorité pour l’intégration frontend et les agents IA.

Document généré pour le **développeur frontend** : chaque endpoint décrit ce qu’il permet de faire, les **données envoyées**, le **format de réponse** et les **erreurs HTTP** possibles.

- **Swagger live** : `GET /api/docs` (schémas DTO à jour)
- **Régénération complète** : `npm run docs:frontend`
- **Cette version condensée** : `npm run docs:api-reference`

---

## Conventions globales

### Headers

| Header | Quand |
|--------|--------|
| `Authorization: Bearer <access_token>` | Routes protégées (sauf auth publique, plans, webhooks) |
| `Content-Type: application/json` | Body JSON |
| `Content-Type: multipart/form-data` | Uploads (`/me/photo`, `/admin/books`, badges…) |

### Pagination (listes)

**Query** : `page` (défaut 1), `limit` (défaut 20, max 100).

**Réponse** :

```json
{
  "data": [ /* éléments */ ],
  "meta": { "page": 1, "limit": 20, "total": 142, "total_pages": 8 }
}
```

### Erreur standard (NestJS)

```json
{
  "statusCode": 400,
  "message": "Message en français",
  "error": "Bad Request"
}
```

Parfois `message` est un **tableau** si plusieurs erreurs de validation.

### Tokens auth (réponses login / OTP)

```json
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
```

- `access_token` : ~15 min — header Bearer sur les routes protégées
- `refresh_token` : ~30 jours — **uniquement** `POST /auth/token/refresh` et `POST /auth/logout` (body)

### Gardes

| Libellé | Signification |
|---------|----------------|
| **Public** | Pas de JWT |
| **JWT** | `JwtAuthGuard` : JWT valide + compte **ACTIF** |
| **JWT*** | `JwtAuthenticatedGuard` : JWT valide, **PENDING** accepté |
| **Actif** | `ActiveAccountGuard` : compte **ACTIF** (souvent avec JWT*) |
| **Admin** | JWT + rôle `ADMIN` |

---

## Modèle d'accès : bibliothèques, livres, abonnement

> Référence métier alignée sur `books-access.eligibility.ts` et les enums Prisma. Version longue : [README §4.1](../README.md#41-bibliothèques-types-de-livres-et-abonnement).

### Deux axes à ne pas confondre

| Axe | Enum | Valeurs | Effet API |
|-----|------|---------|-----------|
| **Bibliothèque** (rayon) | `TypeBibliotheque` | `INTERNE`, `EXTERNE` | **INTERNE** : livres en base via `appartient` · **EXTERNE** : pas de catalogue (`GET .../books` → **400**), redirect `url_externe` |
| **Livre** (diffusion) | `TypeLivre` | `INTERNE`, `EXTERNE` | **INTERNE** : fichier (`cloudinary_public_id` / R2) · **EXTERNE** : `url_externe_livre`, `is_downloadable` toujours `false` |

Dans une **bibliothèque INTERNE**, le catalogue peut mélanger des livres **INTERNE** et **EXTERNE** (filtre query `type_livre` sur `GET /libraries/:id/books`).

### Abonnement et actions

| Action | Abonnement `ACTIF` (période en cours) |
|--------|--------------------------------------|
| Lister bibliothèques / livres, fiche `GET /books/:id` | Non requis — réponse inclut `peut_lire`, `peut_telecharger`, `raison_blocage`, `codes` |
| `GET/POST /books/:id/access`, `GET .../stream` | **Requis** pour **tous** les livres publiés (internes et externes avec URL) |
| `PATCH /books/:id/progress` | **Requis** |
| `POST .../comments`, `POST .../rate` | **Requis** + livre lié à une bib. **INTERNE** (RG commentaires) |

Aucune différence de plan (hebdo / mensuel / annuel) dans la logique d’accès aux livres : un seul critère « abonnement actif ».

### Lecture vs téléchargement

| `TypeLivre` | `acces_type` (fiche / check) | `type=LECTURE` | `type=TELECHARGEMENT` |
|-------------|------------------------------|----------------|----------------------|
| INTERNE | `CLOUDINARY` | OK si fichier présent + abonnement | OK si `is_downloadable` + progression existante |
| EXTERNE | `EXTERNE` | OK si `url_externe_livre` + abonnement → stream = redirect partenaire | Toujours bloqué (`NON_TELECHARGEABLE`) |

**Codes** (`GET /books/:id/access/check`) : `ABONNEMENT_REQUIS`, `LIVRE_INDISPONIBLE`, `RESSOURCE_MANQUANTE`, `NON_TELECHARGEABLE`, `PROGRESSION_REQUISE`.

**Réponse type** `access/check` :

```json
{
  "livre_id": "uuid",
  "type_acces_demande": "LECTURE",
  "peut_lire": true,
  "peut_telecharger": false,
  "eligible": true,
  "codes": [],
  "raison_blocage": null,
  "ressource_disponible": true,
  "acces_type": "EXTERNE",
  "type_livre": "EXTERNE",
  "is_downloadable": false
}
```

---

## 1. Santé


#### `GET /`

**Usage concret** : Vérifier que le serveur NestJS répond (monitoring minimal).

**Auth** : Public

**Réponse (succès)**
**200** — `string` : `"Hello World!"`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | — | Pas d’erreur métier attendue | |

#### `GET /health`

**Usage concret** : Sonde de santé : API + connectivité PostgreSQL (Kubernetes, UptimeRobot).

**Auth** : Public

**Réponse (succès)**
**200** — JSON :
```json
{ "status": "ok", "database": "up", "response_time_ms": 12 }
```

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `503` | `database` ≠ `up` (PostgreSQL inaccessible) | |


---

## 2. Authentification — `/auth`


#### `POST /auth/register`

**Usage concret** : Créer un compte par email **sans** mot de passe ; envoi OTP par email.

**Auth** : Public

**Entrée**
**Body JSON**
```json
{ "email": "user@example.com", "nom": "Dupont", "prenom": "Jean" }
```

**Réponse (succès)**
**201** — `{ "message": "OTP envoyé. Valide 10 minutes." }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |
| | `409` | « Email déjà associé à un compte existant. » (doublon email, ISBN, déjà inscrit au défi…) | |

#### `POST /auth/register/password`

**Usage concret** : Inscription avec mot de passe ; activation toujours par OTP ensuite.

**Auth** : Public

**Entrée**
**Body** : `email`, `nom`, `prenom`, `password` (8–128 caractères)

**Réponse (succès)**
**201** — message OTP (idem register)

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |
| | `409` | Email déjà utilisé | |

#### `POST /auth/otp/request`

**Usage concret** : Demander un code OTP (connexion email ou renvoi après inscription).

**Auth** : Public

**Entrée**
**Body** : `{ "email": "..." }`

**Réponse (succès)**
**200** — `{ "message": "..." }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `404` | « Email inconnu — utilisez POST /auth/register… » | |
| | `403` | « Compte suspendu. » | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /auth/otp/verify`

**Usage concret** : Valider le code OTP → **obtenir les tokens JWT** + activer le compte (`ACTIF`).

**Auth** : Public

**Entrée**
**Body** : `{ "email": "...", "code": "123456" }` (6 chiffres)

**Réponse (succès)**
**200** — `AuthTokensResponse` + `is_new_user: boolean`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `400` | « Code OTP incorrect ou expiré. » | |
| | `404` | Email inconnu | |
| | `403` | Compte suspendu | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /auth/google`

**Usage concret** : Connexion ou inscription via Google Sign-In (`id_token`, pas access_token OAuth).

**Auth** : Public

**Entrée**
**Body** : `{ "id_token": "<JWT Google>" }`

**Réponse (succès)**
**200** ou **201** — tokens + `is_new_user`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `400` | « id_token invalide ou expiré. » | |
| | `403` | Compte suspendu | |
| | `409` | Email déjà enregistré en LOCAL | |

#### `POST /auth/google/link`

**Usage concret** : Lier un compte Google à un compte BiblioTech déjà connecté.

**Auth** : JWT (ACTIF)

**Entrée**
**Body** : `{ "id_token": "..." }`

**Réponse (succès)**
**200** — `{ message, auth_provider, email_verified }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `400` | id_token invalide | |
| | `409` | Google déjà lié ailleurs | |

#### `POST /auth/password/add`

**Usage concret** : Ajouter un mot de passe à un compte créé par OTP/Google uniquement.

**Auth** : JWT

**Entrée**
**Body** : `{ "password": "..." }`

**Réponse (succès)**
**200** — `{ message }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `409` | Mot de passe déjà défini | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /auth/password/change`

**Usage concret** : Changer le mot de passe (utilisateur connecté).

**Auth** : JWT

**Entrée**
**Body** : `{ "currentPassword", "newPassword" }`

**Réponse (succès)**
**200** — `{ message }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `400` | Pas de MDP / MDP actuel incorrect | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /auth/password/login`

**Usage concret** : Connexion email + mot de passe classique.

**Auth** : Public

**Entrée**
**Body** : `{ "email", "password" }`

**Réponse (succès)**
**200** — tokens + `is_new_user: false`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `400` | « Identifiants incorrects. » | |
| | `403` | Suspendu ou PENDING (valider OTP) | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /auth/password/reset/request`

**Usage concret** : Mot de passe oublié — envoi OTP par email.

**Auth** : Public

**Entrée**
**Body** : `{ "email" }`

**Réponse (succès)**
**200** — message générique (sécurité)

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `404` | Email inconnu | |
| | `403` | Compte suspendu | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /auth/password/reset/confirm`

**Usage concret** : Confirmer reset avec code OTP + nouveau mot de passe → tokens.

**Auth** : Public

**Entrée**
**Body** : `{ "email", "code", "newPassword" }`

**Réponse (succès)**
**200** — tokens

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `400` | OTP invalide | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /auth/token/refresh`

**Usage concret** : Renouveler l’`access_token` expiré (intercepteur HTTP 401).

**Auth** : Public (body `refresh_token`)

**Entrée**
**Body** : `{ "refresh_token": "..." }`

**Réponse (succès)**
**200** — nouvelle paire access + refresh

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | Refresh invalide / expiré / révoqué | |
| | `403` | Compte suspendu | |

#### `POST /auth/logout`

**Usage concret** : Déconnexion : révoque le refresh token.

**Auth** : JWT + body refresh

**Entrée**
**Body** : `{ "refresh_token" }`

**Réponse (succès)**
**200** — `{ "message": "Déconnexion réussie." }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |


---

## 3. Profil — `/me`

Toutes les routes : **JWT (ACTIF)**.


#### `GET /me`

**Usage concret** : Écran « Mon compte » : profil complet (identité, photo, points, abonnement résumé).

**Auth** : JWT

**Réponse (succès)**
**200** — objet profil (`AuthUserSchema` enrichi)

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `404` | « Profil introuvable. » | |

#### `GET /me/dashboard`

**Usage concret** : Home connectée : agrégat lecture en cours, stats, badge récent, défis, nb notifications.

**Auth** : JWT

**Réponse (succès)**
**200** — `{ profil, stats, defis, nb_notifications_non_lues, badge_recent, ... }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |

#### `GET /me/reading`

**Usage concret** : Ma bibliothèque personnelle (livres en cours / terminés).

**Auth** : JWT

**Entrée**
**Query** : `statut?`, `sort?`, `page?`, `limit?`

**Réponse (succès)**
**200** — `{ data: livre + progression[], meta }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `PATCH /me`

**Usage concret** : Mettre à jour nom, bio, téléphone, préférences…

**Auth** : JWT

**Entrée**
**Body** (tous optionnels) : `nom`, `prenom`, `date_naissance`, `photo_profil_url`, `bio`, `genre`, `ecole`, `niveau`, `numero_telephone` (E.164)

**Réponse (succès)**
**200** — profil mis à jour

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `POST /me/photo`

**Usage concret** : Upload avatar utilisateur (Cloudinary).

**Auth** : JWT

**Entrée**
**multipart/form-data** — champ **`file`** (JPEG, PNG, WebP ; taille max configurée)

**Réponse (succès)**
**200** — profil avec `photo_profil_url`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `400` | Fichier manquant, type ou taille invalide | |
| | `502` | Erreur prestataire externe (PawaPay, Cloudinary) | |


---

## 4. Bibliothèques — `/libraries`

**JWT (ACTIF)** — collections éditoriales.

> Types de rayon et abonnement : [Modèle d'accès](#modèle-daccès-bibliothèques-livres-abonnement). Seule une bib. **INTERNE** expose des livres ; une bib. **EXTERNE** est un lien sortant sans catalogue.

| Endpoint | Usage | Entrée | Réponse 200 | Erreurs |
|----------|-------|--------|-------------|---------|
| `GET /libraries/summary` | Compteurs globaux (bannière explorer) | — | Stats agrégées | 401, 403 |
| `GET /libraries` | Grille de bibliothèques | `q?`, `type?`, `sort?`, `page?`, `limit?` | `{ data, meta }` | 401, 403, 400 |
| `GET /libraries/:id` | Fiche bibliothèque | Path `id` UUID | Détail + métadonnées | 401, 403, **404** « introuvable ou non active » |
| `GET /libraries/:id/stats` | Stats d’un rayon | Path `id` | Compteurs livres/auteurs | 404 |
| `GET /libraries/:id/categories` | Filtres catégories | Path `id` | Liste catégories + counts | 404 |
| `GET /libraries/:id/books` | Catalogue du rayon **INTERNE** (livres hébergés + liens externes) | `q?`, `type_livre?` (`INTERNE`\|`EXTERNE`), `categorie_id?`, `page?`, `limit?`, `sort?` | `{ data, meta }` | 404, **400** si bib. rayon **EXTERNE** |
| `GET /libraries/:id/books/in-progress` | Continuer dans ce rayon | `page?`, `limit?` | Livres + progression | 404, 400 EXTERNE |

---

## 5. Livres — `/books`

**JWT (ACTIF)** — catalogue, lecture, social.

> L’abonnement est exigé pour **ouvrir** un livre (jeton), pas pour le lister. Même règle pour un livre **EXTERNE** dans un rayon **INTERNE** (lecture = redirect partenaire, pas de téléchargement). Voir [Modèle d'accès](#modèle-daccès-bibliothèques-livres-abonnement).

### Catalogue


#### `GET /books`

**Usage concret** : Grille catalogue avec filtres. Sur `GET /books/:id` : `peut_lire`, `peut_telecharger`, `acces_type`, `raison_blocage` (selon abonnement et type de livre).

**Auth** : JWT

**Entrée**
**Query** : `q?`, `type_livre?`, `categorie_id?`, `auteur_id?`, `langue?`, `is_downloadable?`, `bibliotheque_id?`, `page?`, `limit?`, `sort?` (`recent`, `titre`, `nb_lectures`…)

**Réponse (succès)**
**200** — `{ data: LivreListItem[], meta }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `GET /books/:id`

**Usage concret** : Fiche livre détaillée (couverture, auteurs, note, bloc `acces`).

**Auth** : JWT

**Entrée**
**Path** : `id` (UUID livre)

**Réponse (succès)**
**200** — objet livre enrichi

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `404` | « Livre introuvable ou archivé. » | |

#### `GET /books/:id/access/check`

**Usage concret** : Avant « Lire » / « Télécharger » : évalue abonnement, ressource (fichier ou URL externe) et règles de téléchargement **sans** créer de jeton.

**Auth** : JWT

**Entrée**
**Query** : `type?` = `LECTURE` \| `TELECHARGEMENT` (optionnel — défaut = règles lecture)

**Réponse (succès)**
**200** — `{ livre_id, type_acces_demande, peut_lire, peut_telecharger, eligible, codes[], raison_blocage, ressource_disponible, acces_type, type_livre, is_downloadable }`  
(`acces_type` : `CLOUDINARY` \| `EXTERNE` \| `INDISPONIBLE`)

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |
| | `404` | Livre | |

#### `POST /books/:id/access`

**Usage concret** : Générer un jeton temporaire pour ouvrir le lecteur ou télécharger.

**Auth** : JWT

**Entrée**
**Query** : `type` **requis** — `LECTURE` ou `TELECHARGEMENT`

**Réponse (succès)**
**200** — `{ token, expires_at, type, stream_url?, expires_in_sec?, progression_creee? }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | « Abonnement actif requis. », quota épuisé, plan insuffisant | |
| | `404` | Livre ou ressource fichier indisponible | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `GET /books/:id/stream`

**Usage concret** : Ouvrir le média : **INTERNE** → 302 Cloudinary/R2 · **EXTERNE** → 302 `url_externe_livre` (partenaire). Jeton obtenu après contrôle d’abonnement.

**Auth** : Public (auth via query `token`)

**Entrée**
**Query** : `token` (requis), `validate?` (bool — si true, JSON au lieu de 302)

**Réponse (succès)**
**302** → URL fichier ; ou **200** `{ valid, redirect_url, message }` si `validate=true`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `404` | Token ou livre introuvable | |
| | `403` | Token ne correspond pas à l’utilisateur | |
| | `410` | Token expiré ou déjà utilisé | |

#### `PATCH /books/:id/progress`

**Usage concret** : Sauvegarder la page courante / durée de session (debounce lecteur).

**Auth** : JWT

**Entrée**
**Body** : `{ "page_actuelle": number, "duree_lecture_min?": number }`

**Réponse (succès)**
**200** — progression + éventuels événements (badge, défi)

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Abonnement requis | |
| | `404` | Pas de progression (ouvrir via /access d’abord) | |
| | `400` | Page non croissante / incohérente | |
| | `429` | « Vitesse de lecture anormale. » | |

#### `POST /books/:id/comments`

**Usage concret** : Publier un avis sur le livre.

**Auth** : JWT

**Entrée**
**Body** : `{ "contenu": "string" }`

**Réponse (succès)**
**201** — commentaire créé

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `400` | Livre non rattaché à une bibliothèque **INTERNE** (commentaires/notes) | |
| | `404` | Livre | |

#### `POST /books/:id/rate`

**Usage concret** : Noter le livre 1 à 5 étoiles.

**Auth** : JWT

**Entrée**
**Body** : `{ "valeur": 1-5 }`

**Réponse (succès)**
**200** / **201** — notation enregistrée

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |
| | `404` | Livre | |


**Autres routes livres** (même gardes JWT) :

| Route | Usage | Entrée | Réponse | Erreurs clés |
|-------|-------|--------|---------|--------------|
| `GET /books/access/recent` | Reprendre la lecture | `page?`, `limit?` | Liste paginée | 401, 403 |
| `GET /books/:id/resource` | Métadonnées fichier sans quota | Path `id` | `resource` | 404 |
| `GET /books/:id/access/active` | Réutiliser jeton valide | `type?` | token ou null | 403, 404 |
| `GET /books/:id/similar` | Carrousel similaires | `limit?` | Liste livres | 404 |
| `GET /books/:id/challenges` | Défis liés au livre | Path `id` | Liste défis | 404 |
| `GET /books/:id/progress` | Lire progression | Path `id` | Progression | 404 |
| `GET /books/:id/comments` | Fil d’avis | `page?`, `limit?` | `{ data, meta }` | 404 |
| `PATCH/DELETE .../comments/:commentId` | Modifier/supprimer **son** avis | `contenu?` | Commentaire | **403** pas auteur, 404 |

---

## 6. Plans & abonnements


#### `GET /plans`

**Usage concret** : Page tarifs (accessible avant connexion).

**Auth** : Public

**Réponse (succès)**
**200** — tableau de plans actifs (`HEBDOMADAIRE`, `MENSUEL`, `ANNUEL`, prix XOF…)

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |

#### `GET /subscriptions/current`

**Usage concret** : Savoir si l’utilisateur peut lire (bannière abonnement, guards UI).

**Auth** : JWT*

**Réponse (succès)**
**200** — abonnement actif ou `null`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |


| Route | Usage | Entrée | Réponse | Erreurs |
|-------|-------|--------|---------|---------|
| `GET /plans/:id` | Détail offre | Path UUID | Plan | **404** plan inactif |
| `GET /subscriptions/upcoming` | Renouvellement programmé | — | Abonnement futur ou null | 401 |
| `GET /subscriptions/summary` | Widget résumé | — | Objet condensé | 401 |
| `GET /subscriptions/compare` | Écran changer de plan | — | Plans + indicateurs upgrade | 401 |
| `GET /subscriptions/history` | Historique | `statut?`, `page?`, `limit?` | `{ data, meta }` | 401, 400 |

---

## 7. Paiements — PawaPay — `/payments`

**Intégration réelle** : `PAYMENT_PROVIDER=pawapay`.


#### `POST /payments/init`

**Usage concret** : Démarrer un paiement Mobile Money pour acheter un plan.

**Auth** : JWT* + Actif

**Entrée**
**Body** :
```json
{
  "plan_id": "uuid",
  "phonenumber": "242061234567",
  "operator": "MTN_MOMO_COG",
  "country": "CG"
}
```
`phonenumber` requis en mode PawaPay (ou profil rempli).

**Réponse (succès)**
**200** — `{ ref_transaction, payment_url, paiement_id, pawapay: { deposit_id } }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `400` | Plan invalide, montant min, téléphone manquant, paiement déjà en attente | |
| | `502` | Erreur prestataire externe (PawaPay, Cloudinary) | |

#### `GET /payments/status`

**Usage concret** : Polling après paiement (écran « en cours » / retour app).

**Auth** : JWT*

**Entrée**
**Query** : `transaction_id` (= `ref_transaction`)

**Réponse (succès)**
**200** — `{ statut: EN_ATTENTE|SUCCES|ECHEC, message, plan, abonnement_lie?, abonnement_actuel? }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `404` | Transaction introuvable | |
| | `403` | Transaction d’un autre utilisateur | |


| Route | Usage | Entrée | Réponse | Erreurs |
|-------|-------|--------|---------|---------|
| `GET /payments/checkout-preview` | Récap prix avant paiement | `plan_id` query | Montant, prorata, libellés | 400 plan, 401, 403 |
| `GET /payments/pending` | Paiements en cours | — | Liste | 401 |
| `GET /payments/return` | Page retour navigateur | `transaction_id?` | Statut UX | — |
| `POST /payments/mock/simulate` | **Debug seulement** (mock) | `transaction_id`, `outcome` | Abonnement activé | **400** si pas mock |

### Webhooks — `/api/webhooks/pawapay` (serveur PawaPay, pas le front)

| Route | Réponse | Note |
|-------|---------|------|
| `GET/POST .../deposits` | **200** vide | Active l’abonnement async |
| `POST .../payouts`, `refunds` | **200** vide | Log uniquement |

---

## 8. Découverte

**JWT (ACTIF)** — recherche, recommandations, notifications.


#### `GET /search`

**Usage concret** : Recherche full-text catalogue (titre, auteurs, ISBN…).

**Auth** : JWT

**Entrée**
**Query** : `q` **requis** (min. 2 caractères), `categorie_id?`, `langue?`, `page?`, `limit?`

**Réponse (succès)**
**200** — `{ data: livres[], meta }` + enregistrement historique

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | Compte `PENDING` (« Validez d'abord votre email via OTP. ») ou `BANNI` | |
| | `400` | « Terme trop court (minimum 2 caractères). » | |

#### `POST /recommendations/refresh`

**Usage concret** : Recalculer les suggestions (admin app / bouton actualiser).

**Auth** : JWT

**Entrée**
**Body** : `{ "limit?": 5-100 }`

**Réponse (succès)**
**200** — `{ upserted, summary }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |


| Route | Usage | Entrée | Erreurs clés |
|-------|-------|--------|--------------|
| `GET /recommendations` | Feed suggestions | `raison?`, `vu?`, `page?`… | 401, 403 |
| `GET /recommendations/:id` | Détail | Path UUID | 404, **403** autre user |
| `PATCH .../interact` | Marquer vu/cliqué | `vu?`, `clique?` (un true min.) | **400** si vide |
| `PATCH .../dismiss` | Masquer | — | 404, 403 |
| `GET /notifications` | Centre notifs | `lu?`, `type?`, `page?` | 401 |
| `PATCH /notifications/:id/read` | Marquer lue | Path UUID | 404, 403 |
| `DELETE /search/history/:id` | Supprimer suggestion | Path UUID | 404, 403 |

---

## 9. Gamification


#### `POST /challenges/:id/join`

**Usage concret** : Participer à un défi de lecture.

**Auth** : JWT

**Entrée**
**Path** : `id` (UUID défi)

**Réponse (succès)**
**201** — `{ defi_id, statut, progression }`

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `404` | « Défi introuvable. » | |
| | `400` | Défi terminé | |
| | `409` | Déjà inscrit | |


| Route | Usage | Réponse / erreurs |
|-------|-------|-------------------|
| `GET /challenges` | Liste défis | Paginé ; filtres `type?`, `inscrit?`… |
| `GET /challenges/recommended` | Suggestions | `limit?` |
| `GET /challenges/expiring` | Urgence fin proche | `days?` (défaut 7) |
| `GET /challenges/:id/progress` | Ma progression | 404 |
| `DELETE /challenges/:id/join` | Quitter | **400** si progression commencée |
| `GET /badges` | Galerie | `obtenu?`, pagination |
| `GET /badges/next` | Prochain à débloquer | 200 ou null |
| `GET /gamification/overview` | Hub gamification | Agrégat points/défis/badges |

---

## 10. Admin — `/admin/*`

**JWT + rôle ADMIN** sur toutes les routes (**46 opérations** documentées dans Swagger).

**Inventaire des routes** : [ADMIN-ROUTES-SWAGGER.md](./ADMIN-ROUTES-SWAGGER.md) · **Contrat envoi/réception** : [ADMIN-API-CONTRACT.md](./ADMIN-API-CONTRACT.md) · **Intégration dashboard** : [apps/web/docs/ADMIN-INTEGRATION.md](../../apps/web/docs/ADMIN-INTEGRATION.md).

Erreurs communes : **401**, **403** (non admin), **404**, **409** (doublons), **400** (validation fichier/ISBN).

| Tag Swagger | Préfixe | Opérations |
|-------------|---------|------------|
| Admin — Utilisateurs | `/admin/users` | 5 — liste, création, fiche, ban/unban |
| Admin — Livres | `/admin/books` | 6 — CRUD, archive, auteurs/catégories |
| Admin — Bibliothèques | `/admin/libraries` | 6 — CRUD, archive, associer/retirer livres |
| Admin — Plans | `/admin/plans` | 3 |
| Admin — Défis | `/admin/challenges` | 5 — CRUD, annulation, participants |
| Admin — Badges | `/admin/badges` | 3 — CRUD, upload `icone` |
| Admin — Catégories | `/admin/categories` | 4 |
| Admin — Auteurs | `/admin/auteurs` | 4 |
| Admin — Modération & abonnements | `/admin/comments`, `/admin/payments`, `/admin/subscriptions` | 6 |
| Admin — Statistiques | `/admin/stats/*` | 4 — dashboard, users, books, search-terms |

### Exemples détaillés admin


#### `POST /admin/books`

**Usage concret** : Créer un livre INTERNE avec fichier PDF/EPUB sur Cloudinary/R2.

**Auth** : Admin

**Entrée**
**multipart** : `file?`, `couverture?`, champs `titre`, `type_livre`, `isbn?`, `resume?`, `is_downloadable?`, …

**Réponse (succès)**
**201** — livre créé

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `401` | JWT absent, expiré, révoqué (« Token révoqué. », « Session invalide. ») | |
| | `403` | « Accès réservé aux administrateurs. » | |
| | `400` | Fichier / ISBN invalide | |
| | `409` | ISBN déjà existant | |
| | `502` | Erreur prestataire externe (PawaPay, Cloudinary) | |

#### `POST /admin/users`

**Usage concret** : Créer un compte administrateur.

**Auth** : Admin

**Entrée**
**Body** : `nom`, `prenom`, `email`, `password`

**Réponse (succès)**
**201** — utilisateur admin

**Erreurs possibles**

| HTTP | Message / cas |
|------|-------------|
| | `403` | « Accès réservé aux administrateurs. » | |
| | `409` | Email existant | |
| | `400` | Body/query invalide (ValidationPipe, champs interdits ou manquants) | |


---

*Fin de la référence — 156 opérations HTTP (46 admin). Pour les champs exacts des DTO, utiliser Swagger `/api/docs` ou [ADMIN-ROUTES-SWAGGER.md](./ADMIN-ROUTES-SWAGGER.md).*
