# Partie 1 — Référentiels — Catégories & Auteurs

> Contrat envoi/réception (OpenAPI). **Routes** : /admin/categories, /admin/auteurs  
> **Écrans web** : Catégories, Auteurs  
> Index : [ADMIN-API-CONTRACT.md](../ADMIN-API-CONTRACT.md) · Régénérer : `npm run docs:admin`

**Version API** : 2.0.0

---

## Admin — Catégories

### `GET /admin/categories`

**Résumé** : Liste admin des catégories

Catégories actives (`deleted_at IS NULL`). `nb_livres` = nombre de liaisons `appartenir`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `q` | query | Non | string | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminCategorieListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].nom` | string | — |
| `data[].description` | object | — |
| `data[].nb_livres` | number | — |
| `data[].createdAt` | string (date-time) | — |
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
      "description": {},
      "nb_livres": 1,
      "createdAt": "2024-06-15T10:30:00.000Z"
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

### `POST /admin/categories`

**Résumé** : Créer une catégorie

Nom unique (`categorie.nom` @unique, max 100 car.).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | **Oui** | string | — | — |
| `description` | Non | string | — | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "description": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `nom` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "string"
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

#### HTTP 409 — Nom déjà utilisé.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Nom déjà utilisé.",
  "error": "Error"
}
```

---

### `PATCH /admin/categories/{id}`

**Résumé** : Modifier une catégorie

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la catégorie. |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | Non | string | — | — |
| `description` | Non | string | — | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "description": "string"
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

#### HTTP 409 — Nom déjà utilisé.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Nom déjà utilisé.",
  "error": "Error"
}
```

---

### `DELETE /admin/categories/{id}`

**Résumé** : Supprimer une catégorie (soft delete)

Pose `deleted_at`. HTTP 409 si un défi `statut=ACTIF` référence cette catégorie.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la catégorie. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `deleted_at` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "deleted_at": "2024-06-15T10:30:00.000Z"
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

#### HTTP 409 — Catégorie référencée par un défi actif.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Catégorie référencée par un défi actif.",
  "error": "Error"
}
```

---

## Admin — Auteurs

### `GET /admin/auteurs`

**Résumé** : Liste admin des auteurs

Auteurs actifs uniquement (`deleted_at IS NULL`). Recherche `q` sur le nom.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `q` | query | Non | string | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminAuteurListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].nom` | string | — |
| `data[].prenom` | object | — |
| `data[].bio` | object | — |
| `data[].createdAt` | string (date-time) | — |
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
      "prenom": {},
      "bio": {},
      "createdAt": "2024-06-15T10:30:00.000Z"
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

### `POST /admin/auteurs`

**Résumé** : Créer un auteur

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | **Oui** | string | — | — |
| `prenom` | Non | string | — | — |
| `bio` | Non | string | — | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "prenom": "string",
  "bio": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `nom` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "string"
}
```

#### HTTP 400

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Message métier en français",
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

### `PATCH /admin/auteurs/{id}`

**Résumé** : Modifier un auteur

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de l’auteur. |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | Non | string | — | — |
| `prenom` | Non | string | — | — |
| `bio` | Non | string | — | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "prenom": "string",
  "bio": "string"
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

#### HTTP 400

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Message métier en français",
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

### `DELETE /admin/auteurs/{id}`

**Résumé** : Supprimer un auteur (soft delete)

Pose `deleted_at`. HTTP 409 si un défi `statut=ACTIF` référence cet auteur (FK RESTRICT).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de l’auteur. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `deleted_at` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "deleted_at": "2024-06-15T10:30:00.000Z"
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

#### HTTP 409 — Auteur référencé par un défi actif.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Auteur référencé par un défi actif.",
  "error": "Error"
}
```

---


---

*Partie 1 — 8 opération(s) · [ADMIN-INTEGRATION.md](../../../apps/web/docs/ADMIN-INTEGRATION.md)*
