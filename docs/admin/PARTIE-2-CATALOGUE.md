# Partie 2 — Catalogue — Livres & Bibliothèques

> Contrat envoi/réception (OpenAPI). **Routes** : /admin/books, /admin/libraries  
> **Écrans web** : Livres, Bibliothèques  
> Index : [ADMIN-API-CONTRACT.md](../ADMIN-API-CONTRACT.md) · Régénérer : `npm run docs:admin`

**Version API** : 2.0.0

---

## Admin — Livres

### `GET /admin/books`

**Résumé** : Liste admin de tous les livres

Tous statuts (PUBLIE / ARCHIVE). Ne retourne jamais `cloudinary_public_id` ni `url_externe_livre`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | PUBLIE | ARCHIVE | — |
| `type_livre` | query | Non | INTERNE | EXTERNE | — |
| `is_downloadable` | query | Non | boolean | — |
| `q` | query | Non | string | Recherche sur le titre du livre. |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminBookListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].isbn` | object | — |
| `data[].type_livre` | INTERNE | EXTERNE | — |
| `data[].is_downloadable` | boolean | — |
| `data[].statut` | PUBLIE | ARCHIVE | — |
| `data[].langue` | object | — |
| `data[].nb_lectures` | number | — |
| `data[].note_moyenne` | object | — |
| `data[].auteurs` | array<AuteurBriefSchema> | — |
| `data[].auteurs[].id` | string (uuid) | — |
| `data[].auteurs[].nom` | string | — |
| `data[].auteurs[].prenom` | string | — |
| `data[].categories` | array<CategorieBriefSchema> | — |
| `data[].categories[].id` | string (uuid) | — |
| `data[].categories[].nom` | string | — |
| `meta` | PaginationMetaSchema | — |
| `meta.page` | number | Page courante (base 1). |
| `meta.limit` | number | Nombre d’éléments par page. |
| `meta.total` | number | Nombre total d’éléments correspondant aux filtres. |
| `meta.total_pages` | number | Nombre total de pages. |

**Exemple de réponse**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "isbn": {},
      "type_livre": "INTERNE",
      "is_downloadable": true,
      "statut": "PUBLIE",
      "langue": {},
      "nb_lectures": 1,
      "note_moyenne": {},
      "auteurs": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "nom": "string",
          "prenom": "string"
        }
      ],
      "categories": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "nom": "string"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "total_pages": 8
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

---

### `POST /admin/books`

**Résumé** : Créer un livre

**multipart/form-data** : INTERNE → `file` (PDF/EPUB/MOBI, Cloudinary raw) ; EXTERNE → `url_externe_livre` ; optionnel → `couverture` (image PNG/JPEG/WebP/SVG → URL Cloudinary dans `couverture_url`).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `file` | Non | string (binary) | Fichier du livre (PDF, EPUB, MOBI) — obligatoire si type_livre=INTERNE. Max 50 Mo. | — |
| `couverture` | Non | string (binary) | Image de couverture (PNG, JPEG, WebP, SVG) — upload Cloudinary → couverture_url. | — |
| `titre` | **Oui** | string | — | — |
| `type_livre` | **Oui** | INTERNE | EXTERNE | — | — |
| `url_externe_livre` | Non | string | Obligatoire si type_livre=EXTERNE. | — |
| `is_downloadable` | Non | boolean | — | — |
| `isbn` | Non | string | — | — |
| `resume` | Non | string | — | — |
| `langue` | Non | string | — | — |
| `annee_publication` | Non | integer | — | — |
| `nombre_pages` | Non | integer | — | — |

**Exemple de requête**

```json
{
  "file": "string",
  "couverture": "string",
  "titre": "string",
  "type_livre": "INTERNE",
  "url_externe_livre": "string",
  "is_downloadable": true,
  "isbn": "string",
  "resume": "string",
  "langue": "string",
  "annee_publication": 1,
  "nombre_pages": 1
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `titre` | string | — |
| `type_livre` | string | — |
| `statut` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "titre": "string",
  "type_livre": "string",
  "statut": "string"
}
```

#### HTTP 400 — Contrainte ressource violée.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Contrainte ressource violée.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 409 — ISBN déjà utilisé.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "ISBN déjà utilisé.",
  "error": "Error"
}
```

---

### `PATCH /admin/books/{id}`

**Résumé** : Modifier un livre

`type_livre` non modifiable. INTERNE : `file` pour remplacer le livre ; `couverture` pour remplacer l’image (Cloudinary).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `file` | Non | string (binary) | Fichier du livre (PDF, EPUB, MOBI) — obligatoire si type_livre=INTERNE. Max 50 Mo. | — |
| `couverture` | Non | string (binary) | Image de couverture (PNG, JPEG, WebP, SVG) — upload Cloudinary → couverture_url. | — |
| `titre` | Non | string | — | — |
| `type_livre` | Non | INTERNE | EXTERNE | — | — |
| `url_externe_livre` | Non | string | Obligatoire si type_livre=EXTERNE. | — |
| `is_downloadable` | Non | boolean | — | — |
| `isbn` | Non | string | — | — |
| `resume` | Non | string | — | — |
| `langue` | Non | string | — | — |
| `annee_publication` | Non | integer | — | — |
| `nombre_pages` | Non | integer | — | — |

**Exemple de requête**

```json
{
  "file": "string",
  "couverture": "string",
  "titre": "string",
  "type_livre": "INTERNE",
  "url_externe_livre": "string",
  "is_downloadable": true,
  "isbn": "string",
  "resume": "string",
  "langue": "string",
  "annee_publication": 1,
  "nombre_pages": 1
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `updatedAt` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "updatedAt": "2024-06-15T10:30:00.000Z"
}
```

#### HTTP 400 — Contrainte ressource violée.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Contrainte ressource violée.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404 — Livre introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Livre introuvable.",
  "error": "Error"
}
```

#### HTTP 409 — ISBN déjà utilisé.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "ISBN déjà utilisé.",
  "error": "Error"
}
```

---

### `PATCH /admin/books/{id}/archive`

**Résumé** : Archiver un livre

Passe `statut` à ARCHIVE (hors catalogue utilisateur). Les tokens et progressions existants ne sont pas supprimés.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `statut` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "statut": "string"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404 — Livre introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Livre introuvable.",
  "error": "Error"
}
```

---

### `POST /admin/books/{id}/authors`

**Résumé** : Remplacer tous les auteurs d’un livre

REPLACE ALL atomique. Auteurs actifs uniquement (`deleted_at IS NULL`).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `auteur_ids` | **Oui** | array<string (uuid)> | Liste complète des auteurs (vide = tout retirer). | — |

**Exemple de requête**

```json
{
  "auteur_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ]
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `auteurs` | array<AuteurBriefSchema> | — |
| `auteurs[].id` | string (uuid) | — |
| `auteurs[].nom` | string | — |
| `auteurs[].prenom` | string | — |

**Exemple de réponse**

```json
{
  "auteurs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "prenom": "string"
    }
  ]
}
```

#### HTTP 400 — Auteur invalide ou archivé.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Auteur invalide ou archivé.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404 — Livre introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Livre introuvable.",
  "error": "Error"
}
```

---

### `POST /admin/books/{id}/categories`

**Résumé** : Remplacer toutes les catégories d’un livre

REPLACE ALL atomique. Catégories actives uniquement (`deleted_at IS NULL`).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `categorie_ids` | **Oui** | array<string (uuid)> | Liste complète des catégories (vide = tout retirer). | — |

**Exemple de requête**

```json
{
  "categorie_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ]
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `categories` | array<CategorieBriefSchema> | — |
| `categories[].id` | string (uuid) | — |
| `categories[].nom` | string | — |

**Exemple de réponse**

```json
{
  "categories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string"
    }
  ]
}
```

#### HTTP 400 — Catégorie invalide ou archivée.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Catégorie invalide ou archivée.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404 — Livre introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Livre introuvable.",
  "error": "Error"
}
```

---

## Admin — Bibliothèques

### `GET /admin/libraries`

**Résumé** : Liste admin des bibliothèques

Tous statuts (ACTIVE, ARCHIVEE). Filtres `statut`, `type`, pagination `page` / `limit`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | ACTIVE | ARCHIVEE | — |
| `type` | query | Non | INTERNE | EXTERNE | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminLibraryListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].nom` | string | — |
| `data[].type` | INTERNE | EXTERNE | — |
| `data[].statut` | ACTIVE | ARCHIVEE | — |
| `data[].nb_livres` | number | — |
| `data[].url_externe` | object | — |
| `meta` | PaginationMetaSchema | — |
| `meta.page` | number | Page courante (base 1). |
| `meta.limit` | number | Nombre d’éléments par page. |
| `meta.total` | number | Nombre total d’éléments correspondant aux filtres. |
| `meta.total_pages` | number | Nombre total de pages. |

**Exemple de réponse**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "type": "INTERNE",
      "statut": "ACTIVE",
      "nb_livres": 1,
      "url_externe": {}
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "total_pages": 8
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

---

### `POST /admin/libraries`

**Résumé** : Créer une bibliothèque

INTERNE → `url_externe` interdit. EXTERNE → `url_externe` obligatoire (chk_bibliotheque_url). `statut=ACTIVE` par défaut.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | **Oui** | string | — | — |
| `type` | **Oui** | INTERNE | EXTERNE | — | — |
| `url_externe` | Non | string | — | — |
| `description` | Non | string | — | — |
| `couverture_url` | Non | string | — | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "type": "INTERNE",
  "url_externe": "string",
  "description": "string",
  "couverture_url": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `nom` | string | — |
| `type` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "string",
  "type": "string"
}
```

#### HTTP 400 — url_externe manquante (EXTERNE) ou présente (INTERNE).

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "url_externe manquante (EXTERNE) ou présente (INTERNE).",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

---

### `DELETE /admin/libraries/{bibId}/books/{bookId}`

**Résumé** : Retirer un livre d’une bibliothèque

Supprime une ligne dans `appartient`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `bibId` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque. |
| `bookId` | path | **Oui** | string (uuid) | Identifiant UUID du livre. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `message` | string | — |

**Exemple de réponse**

```json
{
  "message": "Opération réussie."
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Message métier en français",
  "error": "Error"
}
```

---

### `PATCH /admin/libraries/{id}`

**Résumé** : Modifier une bibliothèque

Mise à jour partielle. Le `type` n’est pas modifiable après création.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | Non | string | — | — |
| `description` | Non | string | — | — |
| `couverture_url` | Non | string | — | — |
| `url_externe` | Non | string | Uniquement pour une bibliothèque déjà EXTERNE (contrainte chk_bibliotheque_url). | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "description": "string",
  "couverture_url": "string",
  "url_externe": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `updatedAt` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "updatedAt": "2024-06-15T10:30:00.000Z"
}
```

#### HTTP 400 — Violation contrainte url.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Violation contrainte url.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Message métier en français",
  "error": "Error"
}
```

---

### `PATCH /admin/libraries/{id}/archive`

**Résumé** : Archiver une bibliothèque

Passe `statut` à ARCHIVEE (masquée du catalogue utilisateur).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `statut` | string | — |

**Exemple de réponse**

```json
{
  "statut": "string"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Message métier en français",
  "error": "Error"
}
```

---

### `POST /admin/libraries/{id}/books`

**Résumé** : Associer des livres (INTERNE)

INSERT avec ignore des doublons (`skipDuplicates`). HTTP 400 si bibliothèque EXTERNE (RG29).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `livre_ids` | **Oui** | array<string (uuid)> | — | — |

**Exemple de requête**

```json
{
  "livre_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ]
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `added` | number | — |

**Exemple de réponse**

```json
{
  "added": 1
}
```

#### HTTP 400 — Bibliothèque EXTERNE.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Bibliothèque EXTERNE.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Rôle insuffisant (ADMIN requis) ou compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Rôle insuffisant (ADMIN requis) ou compte banni.",
  "error": "Error"
}
```

#### HTTP 404 — Bibliothèque ou au moins un livre introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Bibliothèque ou au moins un livre introuvable.",
  "error": "Error"
}
```

---


---

*Partie 2 — 12 opération(s) · [ADMIN-INTEGRATION.md](../../../apps/web/docs/ADMIN-INTEGRATION.md)*
