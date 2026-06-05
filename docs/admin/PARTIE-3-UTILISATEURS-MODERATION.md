# Partie 3 — Utilisateurs & modération

> Contrat envoi/réception (OpenAPI). **Routes** : /admin/users, /admin/comments, /admin/subscriptions, /admin/payments  
> **Écrans web** : Utilisateurs, Commentaires, Abonnements, Paiements  
> Index : [ADMIN-API-CONTRACT.md](../ADMIN-API-CONTRACT.md) · Régénérer : `npm run docs:admin`

**Version API** : 2.0.0

---

## Admin — Utilisateurs

### `GET /admin/users`

**Résumé** : Liste paginée de tous les utilisateurs

Vue admin complète (tous statuts, y compris personnes soft-deleted). Ne retourne jamais `mot_de_passe_hash`, `refresh_token`, `jti`, `google_id`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | PENDING | ACTIF | BANNI | Filtre sur le statut du compte (`AuthStatut`). |
| `role` | query | Non | USER | ADMIN | Filtre sur le rôle (`AuthRole`). |
| `q` | query | Non | string | Recherche insensible à la casse sur email, nom ou prénom. |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminUserListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].email` | string (email) | — |
| `data[].role` | USER | ADMIN | — |
| `data[].statut` | PENDING | ACTIF | BANNI | — |
| `data[].auth_provider` | LOCAL | GOOGLE | HYBRID | — |
| `data[].email_verified` | boolean | — |
| `data[].date_inscription` | string (date-time) | — |
| `data[].derniere_connexion` | object (date-time) | — |
| `data[].personne` | AdminUserListPersonneSchema | — |
| `data[].personne.nom` | string | — |
| `data[].personne.prenom` | string | — |
| `data[].personne.points` | number | — |
| `data[].abonnement_actif` | AbonnementActifSchema | — |
| `data[].abonnement_actif.id` | string (uuid) | — |
| `data[].abonnement_actif.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `data[].abonnement_actif.date_debut` | string (date-time) | — |
| `data[].abonnement_actif.date_fin` | string (date-time) | — |
| `data[].abonnement_actif.jours_restants` | number | — |
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
      "email": "user@example.com",
      "role": "USER",
      "statut": "PENDING",
      "auth_provider": "LOCAL",
      "email_verified": true,
      "date_inscription": "2024-06-15T10:30:00.000Z",
      "derniere_connexion": {},
      "personne": {
        "nom": "string",
        "prenom": "string",
        "points": 1
      },
      "abonnement_actif": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "plan": "HEBDOMADAIRE",
        "date_debut": "2024-06-15T10:30:00.000Z",
        "date_fin": "2024-06-15T10:30:00.000Z",
        "jours_restants": 1
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

### `POST /admin/users`

**Résumé** : Créer un compte administrateur

Crée un compte `role=ADMIN`, `statut=ACTIF`, `email_verified=true` (inscription publique interdite pour les admins).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | **Oui** | string | — | — |
| `prenom` | **Oui** | string | — | — |
| `email` | **Oui** | string (email) | — | — |
| `password` | **Oui** | string | — | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "prenom": "string",
  "email": "user@example.com",
  "password": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `email` | string (email) | — |
| `role` | string | — |
| `statut` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "string",
  "statut": "string"
}
```

#### HTTP 400 — Email ou mot de passe invalide.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Email ou mot de passe invalide.",
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

#### HTTP 409 — Email déjà utilisé.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Email déjà utilisé.",
  "error": "Error"
}
```

---

### `GET /admin/users/{id}`

**Résumé** : Détail complet d’un utilisateur

Profil auth + personne, historiques abonnements/paiements et compteurs d’activité.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du compte (`auth.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `auth` | AdminUserDetailAuthSchema | — |
| `auth.id` | string (uuid) | — |
| `auth.email` | string (email) | — |
| `auth.role` | USER | ADMIN | — |
| `auth.statut` | PENDING | ACTIF | BANNI | — |
| `auth.auth_provider` | LOCAL | GOOGLE | HYBRID | — |
| `auth.email_verified` | boolean | — |
| `auth.date_inscription` | string (date-time) | — |
| `auth.numero_telephone` | object | — |
| `personne` | AdminUserDetailPersonneSchema | — |
| `personne.nom` | string | — |
| `personne.prenom` | string | — |
| `personne.bio` | object | — |
| `personne.ecole` | object | — |
| `personne.niveau` | object | — |
| `personne.points` | number | — |
| `personne.deleted_at` | object (date-time) | — |
| `abonnements` | array<AdminUserDetailAbonnementSchema> | — |
| `abonnements[].id` | string (uuid) | — |
| `abonnements[].paiement_id` | object (uuid) | — |
| `abonnements[].plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `abonnements[].plan_id` | string (uuid) | — |
| `abonnements[].date_debut` | string (date-time) | — |
| `abonnements[].date_fin` | string (date-time) | — |
| `abonnements[].statut` | ACTIF | EXPIRE | ANNULE | — |
| `abonnements[].type_renouvellement` | NOUVEAU | RENOUVELLEMENT | UPGRADE | — |
| `abonnements[].createdAt` | string (date-time) | — |
| `abonnements[].updatedAt` | string (date-time) | — |
| `paiements` | array<AdminUserDetailPaiementSchema> | — |
| `paiements[].id` | string (uuid) | — |
| `paiements[].plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `paiements[].plan_id` | string (uuid) | — |
| `paiements[].montant` | number | — |
| `paiements[].devise` | string | — |
| `paiements[].operateur` | string | — |
| `paiements[].numero_telephone` | object | — |
| `paiements[].ref_transaction` | string | — |
| `paiements[].statut` | EN_ATTENTE | SUCCES | ECHEC | — |
| `paiements[].createdAt` | string (date-time) | — |
| `paiements[].updatedAt` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "auth": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "USER",
    "statut": "PENDING",
    "auth_provider": "LOCAL",
    "email_verified": true,
    "date_inscription": "2024-06-15T10:30:00.000Z",
    "numero_telephone": {}
  },
  "personne": {
    "nom": "string",
    "prenom": "string",
    "bio": {},
    "ecole": {},
    "niveau": {},
    "points": 1,
    "deleted_at": {}
  },
  "abonnements": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "paiement_id": {},
      "plan": "HEBDOMADAIRE",
      "plan_id": "550e8400-e29b-41d4-a716-446655440000",
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "statut": "ACTIF",
      "type_renouvellement": "NOUVEAU",
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-15T10:30:00.000Z"
    }
  ],
  "paiements": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "plan": "HEBDOMADAIRE",
      "plan_id": "550e8400-e29b-41d4-a716-446655440000",
      "montant": 1,
      "devise": "string",
      "operateur": "string",
      "numero_telephone": {},
      "ref_transaction": "string",
      "statut": "EN_ATTENTE",
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-15T10:30:00.000Z"
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

#### HTTP 404 — Utilisateur introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Utilisateur introuvable.",
  "error": "Error"
}
```

---

### `PATCH /admin/users/{id}/ban`

**Résumé** : Bannir un utilisateur

Passe `statut` à BANNI, révoque le refresh token et blackliste le `jti` courant. Auto-bannissement interdit (HTTP 400). Le champ `raison` est journalisé côté serveur (non stocké en base).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du compte (`auth.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `raison` | Non | string | Raison du bannissement (non persistée — pas de champ en base v2.3). | — |

**Exemple de requête**

```json
{
  "raison": "string"
}
```

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

#### HTTP 400 — Tentative de s’auto-bannir.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Tentative de s’auto-bannir.",
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

#### HTTP 404 — Utilisateur introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Utilisateur introuvable.",
  "error": "Error"
}
```

---

### `PATCH /admin/users/{id}/unban`

**Résumé** : Débannir un utilisateur

Repasse `statut` à ACTIF.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du compte (`auth.id`). |

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

#### HTTP 404 — Utilisateur introuvable.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Utilisateur introuvable.",
  "error": "Error"
}
```

---

## Admin — Modération & abonnements

### `GET /admin/comments`

**Résumé** : Liste de tous les commentaires

Tous statuts. Filtres : `statut`, `livre_id`, `auth_id`. Pagination `page` / `limit`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | PUBLIE | MODERE | SUPPRIME | — |
| `livre_id` | query | Non | string (uuid) | — |
| `auth_id` | query | Non | string (uuid) | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminCommentListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].contenu` | string | — |
| `data[].statut` | PUBLIE | MODERE | SUPPRIME | — |
| `data[].createdAt` | string (date-time) | — |
| `data[].livre` | AdminCommentLivreBriefSchema | — |
| `data[].livre.id` | string (uuid) | — |
| `data[].livre.titre` | string | — |
| `data[].auteur` | AdminCommentAuteurBriefSchema | — |
| `data[].auteur.email` | string (email) | — |
| `data[].auteur.nom` | string | — |
| `data[].auteur.prenom` | string | — |
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
      "contenu": "string",
      "statut": "PUBLIE",
      "createdAt": "2024-06-15T10:30:00.000Z",
      "livre": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "titre": "string"
      },
      "auteur": {
        "email": "user@example.com",
        "nom": "string",
        "prenom": "string"
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

### `DELETE /admin/comments/{id}`

**Résumé** : Supprimer définitivement un commentaire

Hard delete irréversible (`DELETE` en base).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | ID commentaire (`commentaire.id`). |

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

### `PATCH /admin/comments/{id}/moderate`

**Résumé** : Modérer un commentaire

Passe `statut=MODERE` (masqué côté public, conservé en base). Notification SYSTEME optionnelle (`raison` dans le corps).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | ID commentaire (`commentaire.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `raison` | Non | string | Non persisté en base (schéma sans champ raison) — utilisé pour la notification SYSTEME. | — |

**Exemple de requête**

```json
{
  "raison": "string"
}
```

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

### `GET /admin/payments`

**Résumé** : Liste admin des paiements

Transactions paginées avec filtres statut, plan, période.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | EN_ATTENTE | SUCCES | ECHEC | — |
| `auth_id` | query | Non | string (uuid) | — |
| `plan_id` | query | Non | string (uuid) | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminPaymentListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].ref_transaction` | string | — |
| `data[].statut` | EN_ATTENTE | SUCCES | ECHEC | — |
| `data[].montant` | number | — |
| `data[].devise` | string | — |
| `data[].operateur` | object | — |
| `data[].createdAt` | string (date-time) | — |
| `data[].auth` | AdminPaymentAuthBriefSchema | — |
| `data[].auth.email` | string (email) | — |
| `data[].plan` | AdminPaymentPlanBriefSchema | — |
| `data[].plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `data[].plan.prix` | number | — |
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
      "ref_transaction": "string",
      "statut": "EN_ATTENTE",
      "montant": 1,
      "devise": "string",
      "operateur": {},
      "createdAt": "2024-06-15T10:30:00.000Z",
      "auth": {
        "email": "user@example.com"
      },
      "plan": {
        "plan": "HEBDOMADAIRE",
        "prix": 1
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

### `GET /admin/subscriptions`

**Résumé** : Liste admin des abonnements

Abonnements paginés avec auth, plan et statut.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | ACTIF | EXPIRE | ANNULE | — |
| `plan` | query | Non | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `auth_id` | query | Non | string (uuid) | — |
| `page` | query | Non | number | — |
| `limit` | query | Non | number | — |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<AdminSubscriptionListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].plan` | AdminSubscriptionPlanBriefSchema | — |
| `data[].plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `data[].plan.prix` | number | — |
| `data[].date_debut` | string (date-time) | — |
| `data[].date_fin` | string (date-time) | — |
| `data[].statut` | ACTIF | EXPIRE | ANNULE | — |
| `data[].type_renouvellement` | NOUVEAU | RENOUVELLEMENT | UPGRADE | — |
| `data[].auth` | AdminSubscriptionAuthBriefSchema | — |
| `data[].auth.email` | string (email) | — |
| `data[].auth.personne` | AdminSubscriptionAuthPersonneSchema | — |
| `data[].auth.personne.nom` | string | — |
| `data[].auth.personne.prenom` | string | — |
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
      "plan": {
        "plan": "HEBDOMADAIRE",
        "prix": 1
      },
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "statut": "ACTIF",
      "type_renouvellement": "NOUVEAU",
      "auth": {
        "email": "user@example.com",
        "personne": {
          "nom": "string",
          "prenom": "string"
        }
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

### `PATCH /admin/subscriptions/{id}/cancel`

**Résumé** : Annuler un abonnement

Passe le statut à ANNULE.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de l’abonnement. |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `raison` | **Oui** | string | Archivée dans la notification ABONNEMENT (pas de colonne dédiée en base). | — |

**Exemple de requête**

```json
{
  "raison": "string"
}
```

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


---

*Partie 3 — 11 opération(s) · [ADMIN-INTEGRATION.md](../../../apps/web/docs/ADMIN-INTEGRATION.md)*
