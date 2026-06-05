# Partie 4 — Plans, gamification & statistiques

> Contrat envoi/réception (OpenAPI). **Routes** : /admin/plans, /admin/challenges, /admin/badges, /admin/stats  
> **Écrans web** : Plans, Défis, Dashboard stats  
> Index : [ADMIN-API-CONTRACT.md](../ADMIN-API-CONTRACT.md) · Régénérer : `npm run docs:admin`

**Version API** : 2.0.0

---

## Admin — Plans

### `GET /admin/plans`

**Résumé** : Liste admin des plans

Tous statuts (ACTIF, INACTIF).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

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

### `POST /admin/plans`

**Résumé** : Créer un plan

`plan` unique. Prix min 100 XOF. `statut=ACTIF` par défaut.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `plan` | **Oui** | HEBDOMADAIRE | MENSUEL | ANNUEL | — | — |
| `prix` | **Oui** | number | — | — |
| `devise` | Non | string | — | — |
| `duree_jours` | **Oui** | number | — | — |

**Exemple de requête**

```json
{
  "plan": "HEBDOMADAIRE",
  "prix": 100,
  "devise": "string",
  "duree_jours": 1
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `prix` | number | — |
| `devise` | string | — |
| `duree_jours` | number | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "plan": "HEBDOMADAIRE",
  "prix": 1,
  "devise": "string",
  "duree_jours": 1
}
```

#### HTTP 400 — Prix < 100 XOF.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Prix < 100 XOF.",
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

#### HTTP 409 — Type plan déjà existant.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Type plan déjà existant.",
  "error": "Error"
}
```

---

### `PATCH /admin/plans/{id}`

**Résumé** : Modifier un plan

Prix / durée / statut. Non rétroactif sur abonnements en cours.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | ID plan (`planAbonnement.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `prix` | Non | number | — | — |
| `duree_jours` | Non | number | — | — |
| `statut` | Non | ACTIF | INACTIF | — | — |

**Exemple de requête**

```json
{
  "prix": 100,
  "duree_jours": 1,
  "statut": "ACTIF"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `prix` | number | — |
| `statut` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prix": 1,
  "statut": "string"
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

## Admin — Défis

### `GET /admin/challenges`

**Résumé** : Liste admin des défis

Tous statuts. Filtre `statut`, pagination.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | ACTIF | ANNULE | TERMINE | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminChallengeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `data[].statut` | ACTIF | TERMINE | ANNULE | — |
| `data[].date_debut` | string (date-time) | — |
| `data[].date_fin` | string (date-time) | — |
| `data[].objectif_valeur` | number | — |
| `data[].points_bonus` | number | — |
| `data[].nb_participants` | number | — |
| `data[].badge` | AdminChallengeBadgeBriefSchema | — |
| `data[].badge.nom` | string | — |
| `data[].badge.icone` | string | — |
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
      "type": "NB_LIVRES",
      "statut": "ACTIF",
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "objectif_valeur": 1,
      "points_bonus": 1,
      "nb_participants": 1,
      "badge": {
        "nom": "string",
        "icone": "string"
      }
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

### `POST /admin/challenges`

**Résumé** : Créer un défi

Contraintes chk_defi_exclusivite / chk_defi_dates. `statut=ACTIF` par défaut.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `titre` | **Oui** | string | — | — |
| `type` | **Oui** | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — | — |
| `objectif_valeur` | **Oui** | number | — | — |
| `badge_id` | **Oui** | string (uuid) | — | — |
| `date_debut` | **Oui** | string | — | — |
| `date_fin` | **Oui** | string | — | — |
| `description` | Non | string | — | — |
| `points_bonus` | Non | number | — | — |
| `categorie_id` | Non | string (uuid) | — | — |
| `auteur_id` | Non | string (uuid) | — | — |
| `livre_id` | Non | string (uuid) | — | — |

**Exemple de requête**

```json
{
  "titre": "string",
  "type": "NB_LIVRES",
  "objectif_valeur": 1,
  "badge_id": "550e8400-e29b-41d4-a716-446655440000",
  "date_debut": "string",
  "date_fin": "string",
  "description": "string",
  "points_bonus": 0,
  "categorie_id": "550e8400-e29b-41d4-a716-446655440000",
  "auteur_id": "550e8400-e29b-41d4-a716-446655440000",
  "livre_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### HTTP 400 — Contraintes type/FK/dates.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Contraintes type/FK/dates.",
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

#### HTTP 404 — badge_id ou cible inexistant.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "badge_id ou cible inexistant.",
  "error": "Error"
}
```

---

### `PATCH /admin/challenges/{id}`

**Résumé** : Modifier un défi ACTIF

Type et badge_id non modifiables.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | ID défi. |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `titre` | Non | string | — | — |
| `description` | Non | string | — | — |
| `date_fin` | Non | string | — | — |
| `objectif_valeur` | Non | number | — | — |

**Exemple de requête**

```json
{
  "titre": "string",
  "description": "string",
  "date_fin": "string",
  "objectif_valeur": 1
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

#### HTTP 400 — Défi non ACTIF ou dates invalides.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Défi non ACTIF ou dates invalides.",
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

### `PATCH /admin/challenges/{id}/cancel`

**Résumé** : Annuler un défi

statut=ANNULE ; UserDefi EN_COURS → ECHOUE (RG63).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | ID défi. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `statut` | string | — |
| `nb_utilisateurs_echoues` | number | — |

**Exemple de réponse**

```json
{
  "statut": "string",
  "nb_utilisateurs_echoues": 1
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

### `GET /admin/challenges/{id}/participants`

**Résumé** : Participants d’un défi

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | ID défi. |
| `statut` | query | Non | EN_COURS | COMPLETE | ECHOUE | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminChallengeParticipantItemSchema> | — |
| `data[].auth` | AdminChallengeParticipantAuthSchema | — |
| `data[].auth.id` | string (uuid) | — |
| `data[].auth.email` | string (email) | — |
| `data[].auth.personne` | AdminChallengeParticipantPersonneSchema | — |
| `data[].auth.personne.nom` | string | — |
| `data[].auth.personne.prenom` | string | — |
| `data[].progression` | number | — |
| `data[].statut` | EN_COURS | COMPLETE | ECHOUE | — |
| `data[].date_completion` | object (date-time) | — |
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
      "auth": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "personne": {
          "nom": "string",
          "prenom": "string"
        }
      },
      "progression": 1,
      "statut": "EN_COURS",
      "date_completion": {}
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

#### HTTP 404 — Défi introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Défi introuvable.",
  "error": "Error"
}
```

---

## Admin — Badges

### `GET /admin/badges`

**Résumé** : Liste admin des badges

Inclut `nb_utilisateurs` (table `userbadge`).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminBadgeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].nom` | string | — |
| `data[].icone` | string | — |
| `data[].couleur` | string | — |
| `data[].description` | object | — |
| `data[].points` | number | — |
| `data[].nb_utilisateurs` | number | — |
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
      "icone": "string",
      "couleur": "string",
      "description": {},
      "points": 1,
      "nb_utilisateurs": 1
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

### `POST /admin/badges`

**Résumé** : Créer un badge

**multipart/form-data** : champ `icone` (fichier PNG/JPEG/WebP/SVG) uploadé sur Cloudinary ; l’URL est stockée dans `icone`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `icone` | **Oui** | string (binary) | Icône du badge (PNG, JPEG, WebP, SVG) — upload Cloudinary. | — |
| `nom` | **Oui** | string | — | — |
| `couleur` | **Oui** | string | Code hex #RRGGBB | — |
| `points` | **Oui** | integer | — | — |
| `description` | Non | string | — | — |

**Exemple de requête**

```json
{
  "icone": "string",
  "nom": "string",
  "couleur": "string",
  "points": 1,
  "description": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `icone` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "icone": "string"
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

### `PATCH /admin/badges/{id}`

**Résumé** : Modifier un badge

Champs texte optionnels + `icone` (fichier) pour remplacer l’image Cloudinary.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | ID badge. |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `icone` | Non | string (binary) | Icône du badge (PNG, JPEG, WebP, SVG) — upload Cloudinary. | — |
| `nom` | Non | string | — | — |
| `couleur` | Non | string | Code hex #RRGGBB | — |
| `points` | Non | integer | — | — |
| `description` | Non | string | — | — |

**Exemple de requête**

```json
{
  "icone": "string",
  "nom": "string",
  "couleur": "string",
  "points": 1,
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

#### HTTP 409

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Message métier en français",
  "error": "Error"
}
```

---

## Admin — Statistiques

### `GET /admin/stats/books`

**Résumé** : Statistiques par livre

Données `StatistiqueLivre` paginées. Tri : `nb_lectures`, `note_moyenne`, `nb_terminees`, `nb_lectures_7j`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `sort` | query | Non | nb_lectures | note_moyenne | nb_terminees | nb_lectures_7j | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminStatsBookListItemSchema> | — |
| `data[].livre` | AdminStatsBookLivreSchema | — |
| `data[].livre.id` | string (uuid) | — |
| `data[].livre.titre` | string | — |
| `data[].livre.type_livre` | INTERNE | EXTERNE | — |
| `data[].livre.statut` | PUBLIE | ARCHIVE | — |
| `data[].nb_lectures` | number | — |
| `data[].nb_terminees` | number | — |
| `data[].note_moyenne` | object | — |
| `data[].nb_notes` | number | — |
| `data[].nb_lectures_7j` | number | — |
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
      "livre": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "titre": "string",
        "type_livre": "INTERNE",
        "statut": "PUBLIE"
      },
      "nb_lectures": 1,
      "nb_terminees": 1,
      "note_moyenne": {},
      "nb_notes": 1,
      "nb_lectures_7j": 1
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

### `GET /admin/stats/dashboard`

**Résumé** : Dashboard global

Métriques clés : utilisateurs actifs, abonnements, revenus du mois, livres publiés, lectures 7j, top 5 livres.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `nb_utilisateurs_actifs` | number | — |
| `nb_abonnements_actifs` | number | — |
| `revenue_mois_courant` | number | — |
| `nb_livres_publies` | number | — |
| `nb_lectures_7j` | number | — |
| `nb_inscriptions_7j` | number | — |
| `nb_paiements_succes_7j` | number | — |
| `top_5_livres` | array<AdminStatsTopLivreSchema> | — |
| `top_5_livres[].titre` | string | — |
| `top_5_livres[].type_livre` | INTERNE | EXTERNE | — |
| `top_5_livres[].nb_lectures` | number | — |
| `top_5_livres[].note_moyenne` | object | — |

**Exemple de réponse**

```json
{
  "nb_utilisateurs_actifs": 1,
  "nb_abonnements_actifs": 1,
  "revenue_mois_courant": 1,
  "nb_livres_publies": 1,
  "nb_lectures_7j": 1,
  "nb_inscriptions_7j": 1,
  "nb_paiements_succes_7j": 1,
  "top_5_livres": [
    {
      "titre": "string",
      "type_livre": "INTERNE",
      "nb_lectures": 1,
      "note_moyenne": {}
    }
  ]
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

### `GET /admin/stats/search-terms`

**Résumé** : Analyse des termes de recherche

Basé sur `HistoriqueRecherche`. `periode` 7j|30j. `no_results=true` : termes dont toutes les recherches ont eu 0 résultat.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `periode` | query | Non | 7j | 30j | — |
| `no_results` | query | Non | boolean | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminStatsSearchTermItemSchema> | — |
| `data[].terme` | string | — |
| `data[].nb_recherches` | number | — |
| `data[].taux_clic` | number | — |
| `data[].nb_resultats_moyen` | number | — |
| `top_sans_resultats` | array<AdminStatsSearchTermSansResultatSchema> | — |
| `top_sans_resultats[].terme` | string | — |
| `top_sans_resultats[].nb_recherches` | number | — |

**Exemple de réponse**

```json
{
  "data": [
    {
      "terme": "string",
      "nb_recherches": 1,
      "taux_clic": 1,
      "nb_resultats_moyen": 1
    }
  ],
  "top_sans_resultats": [
    {
      "terme": "string",
      "nb_recherches": 1
    }
  ]
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

### `GET /admin/stats/users`

**Résumé** : Statistiques utilisateurs

Croissance et répartition. Query `periode` : 7j | 30j | 90j | 365j (défaut 30j).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `periode` | query | Non | 7j | 30j | 90j | 365j | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `inscriptions_par_jour` | array<AdminStatsInscriptionJourSchema> | — |
| `inscriptions_par_jour[].date` | string (date) | — |
| `inscriptions_par_jour[].count` | number | — |
| `repartition_provider` | object | — |
| `repartition_statut` | object | — |
| `taux_activation` | number | — |
| `nb_abonnes_actifs` | number | — |

**Exemple de réponse**

```json
{
  "inscriptions_par_jour": [
    {
      "date": "2024-06-15",
      "count": 1
    }
  ],
  "repartition_provider": {
    "LOCAL": 12,
    "GOOGLE": 5,
    "HYBRID": 1
  },
  "repartition_statut": {
    "PENDING": 2,
    "ACTIF": 14,
    "BANNI": 0
  },
  "taux_activation": 1,
  "nb_abonnes_actifs": 1
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


---

*Partie 4 — 15 opération(s) · [ADMIN-INTEGRATION.md](../../../apps/web/docs/ADMIN-INTEGRATION.md)*
