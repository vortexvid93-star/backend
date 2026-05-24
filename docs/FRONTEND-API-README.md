# BiblioTech API v2 — Guide intégration frontend

> **Document de référence pour le développeur frontend** (et agents IA).  
> Texte informatif généré depuis **Swagger / OpenAPI** (`http://localhost:3000/api/docs`).  
> Les champs des requêtes viennent des DTOs backend (plugin `@nestjs/swagger` + `class-validator`).  
> Régénérer : `npm run docs:frontend` (build + export `docs/openapi.json`).  
> **Note** : Swagger UI (`/api/docs`) affiche toujours les schémas complets avec références ; ce README détaille les mêmes champs en tableaux (y compris `data[].champ` pour les listes paginées).

**Version API** : 2.0.0

---

## Comment utiliser ce fichier

1. **Ordre des sections** = ordre d’implémentation recommandé (auth → profil → bibliothèques → lecture → abonnement…).
2. Pour chaque route : champs **obligatoires** / **facultatifs**, types, **exemples JSON** requête/réponse.
3. Copier une section entière dans votre agent IA pour générer services API, types TypeScript, écrans.
4. Swagger live reste la source pour tester : `GET /api/docs` + bouton **Authorize** (`Bearer <access_token>`).

---

## Configuration client

| Élément | Valeur |
|---------|--------|
| Base URL dev | `http://localhost:3000` (variable `PORT`) |
| Préfixe API | Aucun préfixe global — routes à la racine (`/auth`, `/books`, …) |
| CORS dev | `localhost:5173`, `3000`, `4200` |
| Header auth | `Authorization: Bearer <access_token>` |
| Content-Type JSON | `application/json` |
| Uploads | `multipart/form-data` (champ `file` ou `icone`) |

### Durée de vie des tokens

| Token | Durée | Usage |
|-------|-------|-------|
| `access_token` | ~15 min | Toutes les routes protégées |
| `refresh_token` | ~30 jours | Uniquement `POST /auth/token/refresh` et `POST /auth/logout` (body) |

### Pagination (toutes les listes)

**Query** : `page` (défaut 1), `limit` (défaut 20, max 100).

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 142, "total_pages": 8 }
}
```

### Erreur HTTP standard (NestJS)

```json
{
  "statusCode": 400,
  "message": "Message en français (ou tableau de messages)",
  "error": "Bad Request"
}
```

### Gardes d’accès

| Libellé | Comportement |
|---------|----------------|
| **Public** | Pas de JWT |
| **JWT** | Token valide + compte `ACTIF` |
| **JWT*** | Token valide, compte `PENDING` accepté (abonnements/paiements) |

---

## Parcours utilisateur (vue d’ensemble)

```
[Inscription OTP] → [Login tokens] → [GET /me/dashboard]
       ↓
[GET /libraries] → [GET /libraries/:id/books] → [GET /books/:id]
       ↓
[access/check] → [POST /access] → [stream?token=] → [PATCH /progress]
       ↓
[GET /plans] → [POST /payments/init] → [GET /payments/status]
```

---

## Description plateforme (Swagger)

API REST **BiblioTech v2** — plateforme de lecture numérique avec abonnements, bibliothèques thématiques, gamification et recommandations.

## Par où commencer (frontend)

1. **Authentification** (`/auth`) — inscription OTP ou mot de passe, connexion, refresh token.
2. **Profil** (`/me`) — données utilisateur, tableau de bord, progression.
3. **Bibliothèques** (`/libraries`) — navigation par collection éditoriale.
4. **Catalogue** (`/books`) — liste, fiche livre, accès streaming/téléchargement.
5. **Abonnement** (`/plans`, `/subscriptions`, `/payments`) — offres et paiement PawaPay (Mobile Money).
6. **Découverte** (`/search`, `/recommendations`, `/notifications`) — recherche et suggestions.
7. **Gamification** (`/challenges`, `/badges`, `/gamification`) — défis et récompenses.

## Authentification

La plupart des routes exigent un **Bearer JWT** (`access_token` renvoyé après login/OTP).
Cliquez sur **Authorize** et collez : `Bearer <access_token>` ou seulement le token selon l’UI.

Le `refresh_token` sert uniquement à `POST /auth/token/refresh` et `POST /auth/logout`.

## Guards (comportement réel)

| Guard | Effet |
|-------|--------|
| Aucun | Route publique |
| `JwtAuthGuard` | JWT + compte **ACTIF** |
| `JwtAuthenticatedGuard` | JWT valide (PENDING accepté) |
| `ActiveAccountGuard` | Compte **ACTIF** (utilisé avec JWT sur paiements) |

## Pagination

Les listes paginées acceptent `page` (défaut 1) et `limit` (défaut 20, max 100) et renvoient un objet `meta` avec `total` et `total_pages`.

## Flux lecture d’un livre

1. `GET /books/:id` — fiche et métadonnées.
2. `GET /books/:id/access/check` — vérifier éligibilité (abonnement, quota).
3. `POST /books/:id/access?type=STREAM|DOWNLOAD` — obtenir un jeton d’accès temporaire.
4. `GET /books/:id/stream?token=...` — redirection 302 vers le fichier (ou `validate=true` pour tester le token).
5. `PATCH /books/:id/progress` — synchroniser la page courante.

---

## Étape 1 — Santé & disponibilité

**Workflow frontend**

Vérifier que l’API répond avant toute intégration (`GET /health`).

### Tag Swagger : Application

### `GET /`

**Résumé** : Santé de l’API

Endpoint racine pour vérifier que le serveur répond. **Frontend** : health check / monitoring uniquement — ne pas utiliser pour les données métier.

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200 — Message de bienvenue.

---

### `GET /health`

**Résumé** : Health check (serveur + base de données)

Vérifie la connectivité PostgreSQL via `SELECT 1`. Retourne HTTP 200 si la base répond, sinon HTTP 503. **Ops** : sonde de monitoring (Kubernetes, UptimeRobot, etc.).

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200 — Serveur et base opérationnels.

| Champ | Type | Description |
|-------|------|-------------|
| `status` | string | — |
| `database` | string | — |
| `response_time_ms` | number | — |

**Exemple de réponse**

```json
{
  "status": "ok",
  "database": "up",
  "response_time_ms": 12
}
```

#### HTTP 503 — Base de données inaccessible.

Erreur NestJS standard :

```json
{
  "statusCode": 503,
  "message": "Base de données inaccessible.",
  "error": "Error"
}
```

---


## Étape 2 — Authentification

**Workflow frontend**

1. Inscription (`POST /auth/register` ou `/register/password`) → OTP par email.
2. Validation OTP (`POST /auth/otp/verify`) → stocker `access_token` + `refresh_token`.
3. Intercepteur HTTP : sur 401, `POST /auth/token/refresh` puis rejouer la requête.
4. Déconnexion : `POST /auth/logout` + effacer les tokens locaux.

### Tag Swagger : Authentification

### `POST /auth/google`

**Résumé** : Connexion ou inscription via Google

Accepte un `id_token` Google (Sign-In côté mobile/web). Crée le compte si besoin, lie le provider GOOGLE, renvoie les tokens. Statut HTTP peut être 200 (connexion) ou 201 (nouveau compte). **Frontend** : après Google Sign-In, envoyer `id_token` (pas le access_token Google OAuth classique).

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `id_token` | **Oui** | string | `id_token` JWT renvoyé par Google Sign-In (pas l’access token OAuth classique). | — |

**Exemple de requête**

```json
{
  "id_token": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT court (15 min). À envoyer dans `Authorization: Bearer <token>` sur les routes protégées. |
| `refresh_token` | string | Jeton long (30 jours). À stocker côté client et à envoyer uniquement sur POST /auth/token/refresh et POST /auth/logout. |
| `user` | AuthUserSchema | — |
| `user.id` | string (uuid) | — |
| `user.email` | string | — |
| `user.role` | USER | ADMIN | — |
| `user.statut` | PENDING | ACTIF | BANNI | PENDING = email non validé ; ACTIF = compte utilisable ; BANNI = accès bloqué. |
| `user.personne` | AuthPersonneSchema | — |
| `user.personne.nom` | string | — |
| `user.personne.prenom` | string | — |
| `user.personne.points` | number | Points de gamification cumulés. |
| `is_new_user` | boolean | true si première connexion (inscription), false si reconnexion. |

**Exemple de réponse**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jean.dupont@example.com",
    "role": "USER",
    "statut": "PENDING",
    "personne": {
      "nom": "Dupont",
      "prenom": "Jean",
      "points": 120
    }
  },
  "is_new_user": true
}
```

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT court (15 min). À envoyer dans `Authorization: Bearer <token>` sur les routes protégées. |
| `refresh_token` | string | Jeton long (30 jours). À stocker côté client et à envoyer uniquement sur POST /auth/token/refresh et POST /auth/logout. |
| `user` | AuthUserSchema | — |
| `user.id` | string (uuid) | — |
| `user.email` | string | — |
| `user.role` | USER | ADMIN | — |
| `user.statut` | PENDING | ACTIF | BANNI | PENDING = email non validé ; ACTIF = compte utilisable ; BANNI = accès bloqué. |
| `user.personne` | AuthPersonneSchema | — |
| `user.personne.nom` | string | — |
| `user.personne.prenom` | string | — |
| `user.personne.points` | number | Points de gamification cumulés. |
| `is_new_user` | boolean | true si première connexion (inscription), false si reconnexion. |

**Exemple de réponse**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jean.dupont@example.com",
    "role": "USER",
    "statut": "PENDING",
    "personne": {
      "nom": "Dupont",
      "prenom": "Jean",
      "points": 120
    }
  },
  "is_new_user": true
}
```

#### HTTP 401 — Token Google invalide ou audience incorrecte.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "Token Google invalide ou audience incorrecte.",
  "error": "Error"
}
```

---

### `POST /auth/google/link`

**Résumé** : Lier un compte Google à un compte existant

Associe Google à l’utilisateur déjà connecté (ex. compte créé par OTP). **Frontend** : paramètres compte → « Lier Google ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `id_token` | **Oui** | string | `id_token` JWT renvoyé par Google Sign-In (pas l’access token OAuth classique). | — |

**Exemple de requête**

```json
{
  "id_token": "string"
}
```

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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

#### HTTP 409 — Ce compte Google est déjà lié à un autre utilisateur.

Erreur NestJS standard :

```json
{
  "statusCode": 409,
  "message": "Ce compte Google est déjà lié à un autre utilisateur.",
  "error": "Error"
}
```

---

### `POST /auth/logout`

**Résumé** : Déconnexion (révocation des tokens)

Invalide le `jti` du access token courant et le refresh token fourni. **Frontend** : supprimer les tokens locaux après succès.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `refresh_token` | **Oui** | string | Refresh token obtenu au login — à renvoyer sur refresh et logout. | — |

**Exemple de requête**

```json
{
  "refresh_token": "string"
}
```

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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /auth/otp/request`

**Résumé** : Demander un code OTP (connexion ou ré-envoi)

Envoie un OTP à un email **déjà inscrit**. Utilisé pour la connexion sans mot de passe ou pour renvoyer un code après inscription. **Frontend** : écran « Se connecter par email » ou bouton « Renvoyer le code ».

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `email` | **Oui** | string (email) | Adresse email du compte (identifiant de connexion). | — |

**Exemple de requête**

```json
{
  "email": "user@example.com"
}
```

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

#### HTTP 403 — Compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni.",
  "error": "Error"
}
```

#### HTTP 404 — Email inconnu — rediriger vers `POST /auth/register` pour créer un compte.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Email inconnu — rediriger vers `POST /auth/register` pour créer un compte.",
  "error": "Error"
}
```

---

### `POST /auth/otp/verify`

**Résumé** : Valider l’OTP et obtenir les tokens

Vérifie le code à 6 chiffres. Active le compte (`ACTIF`) et renvoie `access_token`, `refresh_token` et l’objet `user`. Réponse inclut `is_new_user` pour adapter l’onboarding. **Frontend** : stocker les deux tokens (secure storage), puis rediriger vers l’accueil.

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `email` | **Oui** | string (email) | Email du compte à activer ou connecter. | — |
| `code` | **Oui** | string | Code OTP à 6 chiffres reçu par email. | — |

**Exemple de requête**

```json
{
  "email": "user@example.com",
  "code": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT court (15 min). À envoyer dans `Authorization: Bearer <token>` sur les routes protégées. |
| `refresh_token` | string | Jeton long (30 jours). À stocker côté client et à envoyer uniquement sur POST /auth/token/refresh et POST /auth/logout. |
| `user` | AuthUserSchema | — |
| `user.id` | string (uuid) | — |
| `user.email` | string | — |
| `user.role` | USER | ADMIN | — |
| `user.statut` | PENDING | ACTIF | BANNI | PENDING = email non validé ; ACTIF = compte utilisable ; BANNI = accès bloqué. |
| `user.personne` | AuthPersonneSchema | — |
| `user.personne.nom` | string | — |
| `user.personne.prenom` | string | — |
| `user.personne.points` | number | Points de gamification cumulés. |
| `is_new_user` | boolean | true si première connexion (inscription), false si reconnexion. |

**Exemple de réponse**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jean.dupont@example.com",
    "role": "USER",
    "statut": "PENDING",
    "personne": {
      "nom": "Dupont",
      "prenom": "Jean",
      "points": 120
    }
  },
  "is_new_user": true
}
```

#### HTTP 400 — Code OTP invalide ou expiré.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Code OTP invalide ou expiré.",
  "error": "Bad Request"
}
```

#### HTTP 403 — Compte banni.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni.",
  "error": "Error"
}
```

#### HTTP 404 — Email inconnu.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Email inconnu.",
  "error": "Error"
}
```

---

### `POST /auth/password/add`

**Résumé** : Ajouter un mot de passe au compte

Pour les comptes créés sans mot de passe (OTP/Google). Permet ensuite `POST /auth/password/login`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `password` | **Oui** | string | Nouveau mot de passe (8–128 caractères) pour un compte OTP/Google existant. | — |

**Exemple de requête**

```json
{
  "password": "string"
}
```

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

#### HTTP 400 — Mot de passe déjà défini.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Mot de passe déjà défini.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /auth/password/change`

**Résumé** : Changer le mot de passe (utilisateur connecté)

Requiert le mot de passe actuel et le nouveau (8–128 caractères). **Frontend** : écran « Sécurité » / modification du mot de passe.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `currentPassword` | **Oui** | string | Mot de passe actuel du compte connecté. | — |
| `newPassword` | **Oui** | string | Nouveau mot de passe (8–128 caractères). | — |

**Exemple de requête**

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

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

#### HTTP 400 — Mot de passe actuel incorrect ou compte sans mot de passe.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "Mot de passe actuel incorrect ou compte sans mot de passe.",
  "error": "Bad Request"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /auth/password/login`

**Résumé** : Connexion par email et mot de passe

Authentification classique. Le compte doit être `ACTIF` et avoir un mot de passe enregistré. **Frontend** : écran login email/password.

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `email` | **Oui** | string (email) | Email du compte actif avec mot de passe défini. | — |
| `password` | **Oui** | string | Mot de passe en clair (transmis en HTTPS uniquement). | — |

**Exemple de requête**

```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT court (15 min). À envoyer dans `Authorization: Bearer <token>` sur les routes protégées. |
| `refresh_token` | string | Jeton long (30 jours). À stocker côté client et à envoyer uniquement sur POST /auth/token/refresh et POST /auth/logout. |
| `user` | AuthUserSchema | — |
| `user.id` | string (uuid) | — |
| `user.email` | string | — |
| `user.role` | USER | ADMIN | — |
| `user.statut` | PENDING | ACTIF | BANNI | PENDING = email non validé ; ACTIF = compte utilisable ; BANNI = accès bloqué. |
| `user.personne` | AuthPersonneSchema | — |
| `user.personne.nom` | string | — |
| `user.personne.prenom` | string | — |
| `user.personne.points` | number | Points de gamification cumulés. |

**Exemple de réponse**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jean.dupont@example.com",
    "role": "USER",
    "statut": "PENDING",
    "personne": {
      "nom": "Dupont",
      "prenom": "Jean",
      "points": 120
    }
  }
}
```

#### HTTP 401 — Identifiants incorrects (message générique).

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "Identifiants incorrects (message générique).",
  "error": "Error"
}
```

---

### `POST /auth/password/reset/confirm`

**Résumé** : Confirmer la réinitialisation (OTP + nouveau mot de passe)

Valide le code reçu par email et définit le nouveau mot de passe, puis connecte l’utilisateur (tokens).

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `email` | **Oui** | string (email) | Email du compte à réinitialiser. | — |
| `code` | **Oui** | string | Code OTP reçu pour la réinitialisation. | — |
| `newPassword` | **Oui** | string | Nouveau mot de passe après validation de l’OTP. | — |

**Exemple de requête**

```json
{
  "email": "user@example.com",
  "code": "string",
  "newPassword": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT court (15 min). À envoyer dans `Authorization: Bearer <token>` sur les routes protégées. |
| `refresh_token` | string | Jeton long (30 jours). À stocker côté client et à envoyer uniquement sur POST /auth/token/refresh et POST /auth/logout. |
| `user` | AuthUserSchema | — |
| `user.id` | string (uuid) | — |
| `user.email` | string | — |
| `user.role` | USER | ADMIN | — |
| `user.statut` | PENDING | ACTIF | BANNI | PENDING = email non validé ; ACTIF = compte utilisable ; BANNI = accès bloqué. |
| `user.personne` | AuthPersonneSchema | — |
| `user.personne.nom` | string | — |
| `user.personne.prenom` | string | — |
| `user.personne.points` | number | Points de gamification cumulés. |

**Exemple de réponse**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jean.dupont@example.com",
    "role": "USER",
    "statut": "PENDING",
    "personne": {
      "nom": "Dupont",
      "prenom": "Jean",
      "points": 120
    }
  }
}
```

#### HTTP 400 — OTP invalide ou mot de passe non conforme.

Erreur NestJS standard :

```json
{
  "statusCode": 400,
  "message": "OTP invalide ou mot de passe non conforme.",
  "error": "Bad Request"
}
```

---

### `POST /auth/password/reset/request`

**Résumé** : Demander la réinitialisation du mot de passe

Envoie un OTP de type reset par email. Ne révèle pas si l’email existe (sauf cas métier actuel : email inconnu → 404).

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `email` | **Oui** | string (email) | Adresse email du compte (identifiant de connexion). | — |

**Exemple de requête**

```json
{
  "email": "user@example.com"
}
```

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

#### HTTP 404 — Email inconnu.

Erreur NestJS standard :

```json
{
  "statusCode": 404,
  "message": "Email inconnu.",
  "error": "Error"
}
```

---

### `POST /auth/register`

**Résumé** : Inscription par email (sans mot de passe)

Crée un compte **local** avec email, nom et prénom. Un code OTP est envoyé par email (validité 10 min). Le compte reste en statut `PENDING` tant que l’OTP n’est pas validé via `POST /auth/otp/verify`. **Frontend** : écran « Créer un compte » → puis écran saisie OTP. Ne pas attendre de tokens ici.

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `email` | **Oui** | string (email) | Email unique — servira d’identifiant après validation OTP. | — |
| `nom` | **Oui** | string | Nom de famille affiché sur le profil. | — |
| `prenom` | **Oui** | string | Prénom affiché sur le profil. | — |

**Exemple de requête**

```json
{
  "email": "user@example.com",
  "nom": "string",
  "prenom": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `message` | string | — |

**Exemple de réponse**

```json
{
  "message": "Opération réussie."
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

### `POST /auth/register/password`

**Résumé** : Inscription par email + mot de passe

Même flux que l’inscription OTP, mais enregistre aussi un mot de passe (8–128 caractères). L’activation du compte passe toujours par la validation OTP. **Frontend** : alternative à l’inscription pure OTP si vous proposez un champ mot de passe dès l’inscription.

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `email` | **Oui** | string (email) | Email unique — servira d’identifiant après validation OTP. | — |
| `nom` | **Oui** | string | Nom de famille affiché sur le profil. | — |
| `prenom` | **Oui** | string | Prénom affiché sur le profil. | — |
| `password` | **Oui** | string | Mot de passe (8–128 caractères) enregistré en plus de l’OTP d’activation. | — |

**Exemple de requête**

```json
{
  "email": "user@example.com",
  "nom": "string",
  "prenom": "string",
  "password": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `message` | string | — |

**Exemple de réponse**

```json
{
  "message": "Opération réussie."
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

### `POST /auth/token/refresh`

**Résumé** : Rafraîchir l’access token

Échange un `refresh_token` valide contre une nouvelle paire de tokens (rotation du refresh). **Frontend** : appeler en intercepteur HTTP sur 401, puis rejouer la requête avec le nouvel `access_token`.

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `refresh_token` | **Oui** | string | Refresh token obtenu au login — à renvoyer sur refresh et logout. | — |

**Exemple de requête**

```json
{
  "refresh_token": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT court (15 min). À envoyer dans `Authorization: Bearer <token>` sur les routes protégées. |
| `refresh_token` | string | Jeton long (30 jours). À stocker côté client et à envoyer uniquement sur POST /auth/token/refresh et POST /auth/logout. |
| `user` | AuthUserSchema | — |
| `user.id` | string (uuid) | — |
| `user.email` | string | — |
| `user.role` | USER | ADMIN | — |
| `user.statut` | PENDING | ACTIF | BANNI | PENDING = email non validé ; ACTIF = compte utilisable ; BANNI = accès bloqué. |
| `user.personne` | AuthPersonneSchema | — |
| `user.personne.nom` | string | — |
| `user.personne.prenom` | string | — |
| `user.personne.points` | number | Points de gamification cumulés. |

**Exemple de réponse**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jean.dupont@example.com",
    "role": "USER",
    "statut": "PENDING",
    "personne": {
      "nom": "Dupont",
      "prenom": "Jean",
      "points": 120
    }
  }
}
```

#### HTTP 401 — Refresh token invalide, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "Refresh token invalide, expiré ou révoqué.",
  "error": "Error"
}
```

---


## Étape 3 — Profil utilisateur — `/me`

**Workflow frontend**

Après login : `GET /me` ou `GET /me/dashboard` pour l’accueil. `PATCH /me` et `POST /me/photo` pour l’édition.

### Tag Swagger : Profil utilisateur (/me)

### `GET /me`

**Résumé** : Profil de l’utilisateur connecté

Informations personnelles, email, photo, points, préférences. **Frontend** : écran « Mon compte » / paramètres.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `email` | string (email) | — |
| `role` | USER | ADMIN | — |
| `statut` | PENDING | ACTIF | BANNI | — |
| `auth_provider` | LOCAL | GOOGLE | HYBRID | — |
| `email_verified` | boolean | — |
| `numero_telephone` | object | — |
| `date_inscription` | string (date-time) | — |
| `derniere_connexion` | object (date-time) | — |
| `personne` | PersonneSchema | — |
| `personne.nom` | string | — |
| `personne.prenom` | string | — |
| `personne.date_naissance` | object (date) | — |
| `personne.photo_profil_url` | object | — |
| `personne.bio` | object | — |
| `personne.genre` | M | F | AUTRE | — |
| `personne.ecole` | object | — |
| `personne.niveau` | object | — |
| `personne.points` | number | — |
| `abonnement_actif` | AbonnementActifSchema | — |
| `abonnement_actif.id` | string (uuid) | — |
| `abonnement_actif.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `abonnement_actif.date_debut` | string (date-time) | — |
| `abonnement_actif.date_fin` | string (date-time) | — |
| `abonnement_actif.jours_restants` | number | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "USER",
  "statut": "PENDING",
  "auth_provider": "LOCAL",
  "email_verified": true,
  "numero_telephone": {},
  "date_inscription": "2024-06-15T10:30:00.000Z",
  "derniere_connexion": {},
  "personne": {
    "nom": "string",
    "prenom": "string",
    "date_naissance": {},
    "photo_profil_url": {},
    "bio": {},
    "genre": "M",
    "ecole": {},
    "niveau": {},
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
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /me`

**Résumé** : Mettre à jour le profil

Modifie nom, prénom, bio, préférences (champs fournis uniquement). **Frontend** : formulaire édition profil.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `nom` | Non | string | Nom de famille. | — |
| `prenom` | Non | string | Prénom. | — |
| `date_naissance` | Non | string | Date de naissance au format ISO `YYYY-MM-DD`. | — |
| `photo_profil_url` | Non | string | URL photo (si upload manuel ; préférer `POST /me/photo`). | — |
| `bio` | Non | string | Biographie courte. | — |
| `genre` | Non | M | F | AUTRE | Genre : `M`, `F` ou `AUTRE`. | — |
| `ecole` | Non | string | Établissement scolaire. | — |
| `niveau` | Non | string | Niveau scolaire (ex. Terminale). | — |
| `numero_telephone` | Non | string | Téléphone au format E.164 (ex. `+33612345678`). | — |

**Exemple de requête**

```json
{
  "nom": "string",
  "prenom": "string",
  "date_naissance": "string",
  "photo_profil_url": "string",
  "bio": "string",
  "genre": "M",
  "ecole": "string",
  "niveau": "string",
  "numero_telephone": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `personne` | PersonneSchema | — |
| `personne.nom` | string | — |
| `personne.prenom` | string | — |
| `personne.date_naissance` | object (date) | — |
| `personne.photo_profil_url` | object | — |
| `personne.bio` | object | — |
| `personne.genre` | M | F | AUTRE | — |
| `personne.ecole` | object | — |
| `personne.niveau` | object | — |
| `personne.points` | number | — |
| `numero_telephone` | object | — |

**Exemple de réponse**

```json
{
  "personne": {
    "nom": "string",
    "prenom": "string",
    "date_naissance": {},
    "photo_profil_url": {},
    "bio": {},
    "genre": "M",
    "ecole": {},
    "niveau": {},
    "points": 1
  },
  "numero_telephone": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/actions`

**Résumé** : Actions suggérées

CTA dynamiques : valider email, choisir un plan, rejoindre un défi… **Frontend** : cartes d’actions sur le dashboard.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ProfileActionSchema> | — |
| `data[].code` | string | — |
| `data[].priorite` | haute | moyenne | basse | — |
| `data[].titre` | string | — |
| `data[].description` | string | — |
| `data[].cible` | ProfileActionCibleSchema | — |
| `data[].cible.type` | string | — |
| `data[].cible.id` | string | — |
| `total` | number | — |

**Exemple de réponse**

```json
{
  "data": [
    {
      "code": "string",
      "priorite": "haute",
      "titre": "string",
      "description": "string",
      "cible": {
        "type": "string",
        "id": "string"
      }
    }
  ],
  "total": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/activity`

**Résumé** : Fil d’activité récente

Événements : fin de livre, badge obtenu, défi rejoint, commentaire… **Frontend** : timeline « Activité récente ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `type` | query | Non | LIVRE_TERMINE | BADGE_OBTENU | DEFI_COMPLETE | COMMENTAIRE | Filtrer par type d’événement. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ProfileActivityItemSchema> | — |
| `data[].type` | LIVRE_TERMINE | BADGE_OBTENU | DEFI_COMPLETE | COMMENTAIRE | — |
| `data[].date` | string (date-time) | — |
| `data[].livre_id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].couverture_url` | object | — |
| `data[].duree_lecture_min` | number | — |
| `data[].badge_id` | string (uuid) | — |
| `data[].nom` | string | — |
| `data[].icone` | string | — |
| `data[].couleur` | string | — |
| `data[].points` | number | — |
| `data[].defi_id` | string (uuid) | — |
| `data[].points_bonus` | number | — |
| `data[].badge` | ProfileActivityBadgeBriefSchema | — |
| `data[].badge.nom` | string | — |
| `data[].badge.icone` | string | — |
| `data[].commentaire_id` | string (uuid) | — |
| `data[].livre_titre` | string | — |
| `data[].extrait` | string | — |
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
      "type": "LIVRE_TERMINE",
      "date": "2024-06-15T10:30:00.000Z",
      "livre_id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "couverture_url": {},
      "duree_lecture_min": 1,
      "badge_id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "icone": "string",
      "couleur": "string",
      "points": 1,
      "defi_id": "550e8400-e29b-41d4-a716-446655440000",
      "points_bonus": 1,
      "badge": {
        "nom": "string",
        "icone": "string"
      },
      "commentaire_id": "550e8400-e29b-41d4-a716-446655440000",
      "livre_titre": "string",
      "extrait": "string"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/badges`

**Résumé** : Liste complète des badges utilisateur

Tous les badges avec statut obtenu / verrouillé. **Frontend** : galerie badges.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ProfileOwnedBadgeItemSchema> | — |
| `data[].badge` | ProfileOwnedBadgeSchema | — |
| `data[].badge.id` | string (uuid) | — |
| `data[].badge.nom` | string | — |
| `data[].badge.icone` | string | — |
| `data[].badge.couleur` | string | — |
| `data[].badge.points` | number | — |
| `data[].badge.description` | object | — |
| `data[].obtenu_le` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "data": [
    {
      "badge": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nom": "string",
        "icone": "string",
        "couleur": "string",
        "points": 1,
        "description": {}
      },
      "obtenu_le": "2024-06-15T10:30:00.000Z"
    }
  ]
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/badges/summary`

**Résumé** : Résumé des badges

Nombre obtenus / total et dernier badge débloqué. **Frontend** : widget compact.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `obtenus` | number | — |
| `total` | number | — |
| `pourcentage` | number | — |
| `points_badges` | number | — |

**Exemple de réponse**

```json
{
  "obtenus": 1,
  "total": 1,
  "pourcentage": 1,
  "points_badges": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/challenges`

**Résumé** : Mes défis (liste filtrée)

Défis rejoints ou disponibles selon filtres. **Frontend** : onglet défis du profil.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | EN_COURS | COMPLETE | ECHOUE | Filtrer par statut de participation : `EN_COURS`, `TERMINE`, `EXPIRE`, etc. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ProfileMyChallengeItemSchema> | — |
| `data[].defi` | ProfileMyChallengeDefiSchema | — |
| `data[].defi.id` | string (uuid) | — |
| `data[].defi.titre` | string | — |
| `data[].defi.type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `data[].defi.objectif_valeur` | number | — |
| `data[].defi.points_bonus` | number | — |
| `data[].defi.date_fin` | string (date-time) | — |
| `data[].defi.badge` | ProfileMyChallengeBadgeSchema | — |
| `data[].defi.badge.nom` | string | — |
| `data[].defi.badge.icone` | string | — |
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
      "defi": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "titre": "string",
        "type": "NB_LIVRES",
        "objectif_valeur": 1,
        "points_bonus": 1,
        "date_fin": "2024-06-15T10:30:00.000Z",
        "badge": {
          "nom": "string",
          "icone": "string"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/challenges/{defiId}`

**Résumé** : Participation à un défi précis

Progression détaillée pour un `defiId` donné. **Frontend** : écran détail défi depuis le profil.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `defiId` | path | **Oui** | string (uuid) | Identifiant UUID du défi (`defi.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `defi` | ProfileMyParticipationDefiSchema | — |
| `defi.id` | string (uuid) | — |
| `defi.titre` | string | — |
| `defi.type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `defi.objectif_valeur` | number | — |
| `defi.points_bonus` | number | — |
| `defi.date_debut` | string (date-time) | — |
| `defi.date_fin` | string (date-time) | — |
| `defi.badge` | BadgeSummarySchema | — |
| `defi.badge.id` | string (uuid) | — |
| `defi.badge.nom` | string | — |
| `defi.badge.icone` | string | — |
| `defi.badge.couleur` | string | — |
| `defi.badge.points` | number | — |
| `progression` | number | — |
| `statut` | EN_COURS | COMPLETE | ECHOUE | — |
| `pourcentage` | number | — |
| `jours_restants` | number | — |
| `date_completion` | object (date-time) | — |

**Exemple de réponse**

```json
{
  "defi": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "titre": "string",
    "type": "NB_LIVRES",
    "objectif_valeur": 1,
    "points_bonus": 1,
    "date_debut": "2024-06-15T10:30:00.000Z",
    "date_fin": "2024-06-15T10:30:00.000Z",
    "badge": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "icone": "string",
      "couleur": "string",
      "points": 1
    }
  },
  "progression": 1,
  "statut": "EN_COURS",
  "pourcentage": 1,
  "jours_restants": 1,
  "date_completion": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/challenges/summary`

**Résumé** : Résumé des défis en cours

Compteurs et défis actifs prioritaires. **Frontend** : widget défis sur le profil.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `en_cours` | number | — |
| `completes` | number | — |
| `echoques` | number | — |
| `prochaine_echeance` | ProfileChallengeParticipationSummarySchema | — |
| `prochaine_echeance.defi_id` | string (uuid) | — |
| `prochaine_echeance.titre` | string | — |
| `prochaine_echeance.type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `prochaine_echeance.date_fin` | string (date-time) | — |
| `prochaine_echeance.progression` | number | — |
| `prochaine_echeance.objectif_valeur` | number | — |
| `prochaine_echeance.pourcentage` | number | — |
| `defi_plus_avance` | ProfileChallengeParticipationSummarySchema | — |
| `defi_plus_avance.defi_id` | string (uuid) | — |
| `defi_plus_avance.titre` | string | — |
| `defi_plus_avance.type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `defi_plus_avance.date_fin` | string (date-time) | — |
| `defi_plus_avance.progression` | number | — |
| `defi_plus_avance.objectif_valeur` | number | — |
| `defi_plus_avance.pourcentage` | number | — |

**Exemple de réponse**

```json
{
  "en_cours": 1,
  "completes": 1,
  "echoques": 1,
  "prochaine_echeance": {
    "defi_id": "550e8400-e29b-41d4-a716-446655440000",
    "titre": "string",
    "type": "NB_LIVRES",
    "date_fin": "2024-06-15T10:30:00.000Z",
    "progression": 1,
    "objectif_valeur": 1,
    "pourcentage": 1
  },
  "defi_plus_avance": {
    "defi_id": "550e8400-e29b-41d4-a716-446655440000",
    "titre": "string",
    "type": "NB_LIVRES",
    "date_fin": "2024-06-15T10:30:00.000Z",
    "progression": 1,
    "objectif_valeur": 1,
    "pourcentage": 1
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/comments`

**Résumé** : Mes commentaires

Historique des commentaires publiés par l’utilisateur.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ProfileCommentItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].contenu` | string | — |
| `data[].livre` | ProfileCommentLivreSchema | — |
| `data[].livre.id` | string (uuid) | — |
| `data[].livre.titre` | string | — |
| `data[].livre.couverture_url` | object | — |
| `data[].cree_le` | string (date-time) | — |
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
      "livre": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "titre": "string",
        "couverture_url": {}
      },
      "cree_le": "2024-06-15T10:30:00.000Z"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/completion`

**Résumé** : Complétion du profil

Pourcentage et checklist (photo, nom, abonnement…) pour inciter à finaliser le profil. **Frontend** : barre de progression onboarding.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `pourcentage` | number | — |
| `champs_manquants` | array<string> | — |
| `champs_completes` | array<string> | — |
| `total_champs` | number | — |

**Exemple de réponse**

```json
{
  "pourcentage": 1,
  "champs_manquants": [
    "string"
  ],
  "champs_completes": [
    "string"
  ],
  "total_champs": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/dashboard`

**Résumé** : Tableau de bord personnel

Agrégat pour l’accueil connecté : lecture en cours, stats clés, prochain badge, défis actifs. **Frontend** : home après login — un seul appel pour peupler plusieurs widgets.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `profil` | DashboardProfileSchema | — |
| `profil.id` | string (uuid) | — |
| `profil.email` | string (email) | — |
| `profil.prenom` | string | — |
| `profil.nom` | string | — |
| `profil.photo_profil_url` | object | — |
| `profil.points` | number | — |
| `profil.email_verified` | boolean | — |
| `profil.abonnement_actif` | AbonnementActifSchema | — |
| `profil.abonnement_actif.id` | string (uuid) | — |
| `profil.abonnement_actif.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `profil.abonnement_actif.date_debut` | string (date-time) | — |
| `profil.abonnement_actif.date_fin` | string (date-time) | — |
| `profil.abonnement_actif.jours_restants` | number | — |
| `stats` | DashboardStatsSchema | — |
| `stats.total_livres_lus` | number | — |
| `stats.total_duree_lecture_min` | number | — |
| `stats.total_points` | number | — |
| `stats.nb_badges_obtenus` | number | — |
| `stats.nb_defis_completes` | number | — |
| `stats.livres_en_cours` | number | — |
| `stats.livres_abandonnes` | number | — |
| `stats.livre_en_cours_actuel` | DashboardLivreEnCoursSchema | — |
| `stats.livre_en_cours_actuel.livre_id` | string (uuid) | — |
| `stats.livre_en_cours_actuel.titre` | string | — |
| `stats.livre_en_cours_actuel.couverture_url` | object | — |
| `stats.livre_en_cours_actuel.pourcentage` | number | — |
| `defis` | DashboardDefisSchema | — |
| `defis.en_cours` | number | — |
| `defis.completes` | number | — |
| `defis.echoques` | number | — |
| `defis.prochaine_echeance` | DashboardProchaineEcheanceSchema | — |
| `defis.prochaine_echeance.defi_id` | string (uuid) | — |
| `defis.prochaine_echeance.titre` | string | — |
| `defis.prochaine_echeance.date_fin` | string (date-time) | — |
| `defis.prochaine_echeance.progression` | number | — |
| `defis.prochaine_echeance.objectif_valeur` | number | — |
| `defis.prochaine_echeance.pourcentage` | number | — |
| `nb_notifications_non_lues` | number | — |
| `recommandations` | DashboardRecommandationsSchema | — |
| `recommandations.nb_recos_non_vues` | number | — |
| `recommandations.picks` | array<RecommandationSchema> | — |
| `recommandations.picks[].id` | string (uuid) | — |
| `recommandations.picks[].livre` | RecommandationLivreSchema | — |
| `recommandations.picks[].livre.id` | string (uuid) | — |
| `recommandations.picks[].livre.titre` | string | — |
| `recommandations.picks[].livre.couverture_url` | object | — |
| `recommandations.picks[].livre.type_livre` | INTERNE | EXTERNE | — |
| `recommandations.picks[].livre.note_moyenne` | object | — |
| `recommandations.picks[].livre.nb_lectures` | number | — |
| `recommandations.picks[].livre.auteurs` | array<AuteurBriefSchema> | — |
| `recommandations.picks[].livre.auteurs[].id` | string (uuid) | — |
| `recommandations.picks[].livre.auteurs[].nom` | string | — |
| `recommandations.picks[].livre.auteurs[].prenom` | string | — |
| `recommandations.picks[].livre.categories` | array<CategorieBriefSchema> | — |
| `recommandations.picks[].livre.categories[].id` | string (uuid) | — |
| `recommandations.picks[].livre.categories[].nom` | string | — |
| `recommandations.picks[].score` | number | — |
| `recommandations.picks[].raison` | SAME_GENRE | SAME_AUTHOR | POPULAR | TRENDING | — |
| `recommandations.picks[].raison_libelle` | string | — |
| `recommandations.picks[].contexte` | object | — |
| `recommandations.picks[].vu` | boolean | — |
| `recommandations.picks[].clique` | boolean | — |
| `badge_recent` | DashboardBadgeRecentSchema | — |
| `badge_recent.nom` | string | — |
| `badge_recent.icone` | string | — |
| `badge_recent.couleur` | string | — |
| `badge_recent.obtenu_le` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "profil": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "prenom": "string",
    "nom": "string",
    "photo_profil_url": {},
    "points": 1,
    "email_verified": true,
    "abonnement_actif": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "plan": "HEBDOMADAIRE",
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "jours_restants": 1
    }
  },
  "stats": {
    "total_livres_lus": 1,
    "total_duree_lecture_min": 1,
    "total_points": 1,
    "nb_badges_obtenus": 1,
    "nb_defis_completes": 1,
    "livres_en_cours": 1,
    "livres_abandonnes": 1,
    "livre_en_cours_actuel": {
      "livre_id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "couverture_url": {},
      "pourcentage": 1
    }
  },
  "defis": {
    "en_cours": 1,
    "completes": 1,
    "echoques": 1,
    "prochaine_echeance": {
      "defi_id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "progression": 1,
      "objectif_valeur": 1,
      "pourcentage": 1
    }
  },
  "nb_notifications_non_lues": 1,
  "recommandations": {
    "nb_recos_non_vues": 1,
    "picks": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "livre": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "titre": "string",
          "couverture_url": {},
          "type_livre": "INTERNE",
          "note_moyenne": {},
          "nb_lectures": 1,
          "auteurs": [
            {
              "id": null,
              "nom": null,
              "prenom": null
            }
          ],
          "categories": [
            {
              "id": null,
              "nom": null
            }
          ]
        },
        "score": 1,
        "raison": "SAME_GENRE",
        "raison_libelle": "string",
        "contexte": {},
        "vu": true,
        "clique": true
      }
    ]
  },
  "badge_recent": {
    "nom": "string",
    "icone": "string",
    "couleur": "string",
    "obtenu_le": "2024-06-15T10:30:00.000Z"
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /me/photo`

**Résumé** : Uploader une photo de profil

Envoie une image `file` (multipart). Hébergée sur Cloudinary. Taille max configurée côté serveur. **Frontend** : `FormData` avec champ `file`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `file` | **Oui** | string (binary) | Image JPEG, PNG ou WebP (taille max selon configuration serveur). | — |

**Exemple de requête**

```json
{
  "file": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `photo_profil_url` | string | — |
| `personne` | PersonneSchema | — |
| `personne.nom` | string | — |
| `personne.prenom` | string | — |
| `personne.date_naissance` | object (date) | — |
| `personne.photo_profil_url` | object | — |
| `personne.bio` | object | — |
| `personne.genre` | M | F | AUTRE | — |
| `personne.ecole` | object | — |
| `personne.niveau` | object | — |
| `personne.points` | number | — |

**Exemple de réponse**

```json
{
  "photo_profil_url": "string",
  "personne": {
    "nom": "string",
    "prenom": "string",
    "date_naissance": {},
    "photo_profil_url": {},
    "bio": {},
    "genre": "M",
    "ecole": {},
    "niveau": {},
    "points": 1
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `DELETE /me/photo`

**Résumé** : Supprimer la photo de profil

Retire l’image Cloudinary et remet l’avatar par défaut.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/ratings`

**Résumé** : Mes notes

Historique des notes (étoiles) données aux livres.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ProfileRatingItemSchema> | — |
| `data[].livre` | ProfileRatingLivreSchema | — |
| `data[].livre.id` | string (uuid) | — |
| `data[].livre.titre` | string | — |
| `data[].livre.couverture_url` | object | — |
| `data[].valeur` | number | — |
| `data[].note_le` | string (date-time) | — |
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
        "couverture_url": {}
      },
      "valeur": 1,
      "note_le": "2024-06-15T10:30:00.000Z"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/reading`

**Résumé** : Historique et filtres de lecture

Livres en cours, terminés ou favoris selon query `statut`. **Frontend** : onglet « Ma bibliothèque » / « Mes lectures ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | EN_COURS | TERMINE | ABANDONNE | Filtrer par statut : en cours, terminé, etc. |
| `sort` | query | Non | derniere_maj_desc | date_fin_desc | pourcentage_desc | date_debut_desc | Ordre de tri des lectures. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ProfileReadingItemSchema> | — |
| `data[].progression_id` | string (uuid) | — |
| `data[].livre` | ReadingLivreBriefSchema | — |
| `data[].livre.id` | string (uuid) | — |
| `data[].livre.titre` | string | — |
| `data[].livre.couverture_url` | object | — |
| `data[].livre.type_livre` | string | — |
| `data[].livre.nombre_pages` | object | — |
| `data[].page_actuelle` | number | — |
| `data[].pourcentage` | number | — |
| `data[].duree_lecture_min` | number | — |
| `data[].statut` | EN_COURS | TERMINE | ABANDONNE | — |
| `data[].derniere_maj` | string (date-time) | — |
| `data[].date_debut` | string (date-time) | — |
| `data[].date_fin` | object (date-time) | — |
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
      "progression_id": "550e8400-e29b-41d4-a716-446655440000",
      "livre": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "titre": "string",
        "couverture_url": {},
        "type_livre": "string",
        "nombre_pages": {}
      },
      "page_actuelle": 1,
      "pourcentage": 1,
      "duree_lecture_min": 1,
      "statut": "EN_COURS",
      "derniere_maj": "2024-06-15T10:30:00.000Z",
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": {}
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/stats`

**Résumé** : Statistiques globales

Fusion lecture + social + gamification. **Frontend** : page stats complète.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `total_livres_lus` | number | — |
| `total_duree_lecture_min` | number | — |
| `total_points` | number | — |
| `nb_badges_obtenus` | number | — |
| `nb_defis_completes` | number | — |
| `livres_en_cours` | number | — |
| `livres_abandonnes` | number | — |
| `livre_en_cours_actuel` | DashboardLivreEnCoursSchema | — |
| `livre_en_cours_actuel.livre_id` | string (uuid) | — |
| `livre_en_cours_actuel.titre` | string | — |
| `livre_en_cours_actuel.couverture_url` | object | — |
| `livre_en_cours_actuel.pourcentage` | number | — |

**Exemple de réponse**

```json
{
  "total_livres_lus": 1,
  "total_duree_lecture_min": 1,
  "total_points": 1,
  "nb_badges_obtenus": 1,
  "nb_defis_completes": 1,
  "livres_en_cours": 1,
  "livres_abandonnes": 1,
  "livre_en_cours_actuel": {
    "livre_id": "550e8400-e29b-41d4-a716-446655440000",
    "titre": "string",
    "couverture_url": {},
    "pourcentage": 1
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/stats/reading`

**Résumé** : Statistiques de lecture

Temps, pages, livres terminés, séries… **Frontend** : graphiques « Mes stats lecture ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `livres_termines_par_mois` | array<ProfileStatsMoisSchema> | — |
| `livres_termines_par_mois[].mois` | string | — |
| `livres_termines_par_mois[].count` | number | — |
| `duree_lecture_totale_min` | number | — |
| `duree_moyenne_par_livre_termine_min` | number | — |
| `top_categories` | array<ProfileStatsCategorieSchema> | — |
| `top_categories[].categorie_id` | string (uuid) | — |
| `top_categories[].nom` | string | — |
| `top_categories[].count` | number | — |
| `serie_lecture_jours` | number | — |
| `resume` | ProfileStatsReadingResumeSchema | — |
| `resume.total_livres_termines` | number | — |
| `resume.duree_totale_min` | number | — |
| `resume.duree_moyenne_min` | number | — |

**Exemple de réponse**

```json
{
  "livres_termines_par_mois": [
    {
      "mois": "2025-03",
      "count": 1
    }
  ],
  "duree_lecture_totale_min": 1,
  "duree_moyenne_par_livre_termine_min": 1,
  "top_categories": [
    {
      "categorie_id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "count": 1
    }
  ],
  "serie_lecture_jours": 1,
  "resume": {
    "total_livres_termines": 1,
    "duree_totale_min": 1,
    "duree_moyenne_min": 1
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /me/stats/social`

**Résumé** : Statistiques sociales

Commentaires, notes données. **Frontend** : section engagement communautaire.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `nb_commentaires` | number | — |
| `nb_notes_donnees` | number | — |
| `note_moyenne_donnee` | object | — |
| `distribution_notes` | object | — |

**Exemple de réponse**

```json
{
  "nb_commentaires": 1,
  "nb_notes_donnees": 1,
  "note_moyenne_donnee": {},
  "distribution_notes": {
    "1": 0,
    "2": 1,
    "3": 2,
    "4": 5,
    "5": 3
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---


## Étape 4 — Bibliothèques éditoriales — `/libraries`

**Workflow frontend**

Explorer les rayons : `GET /libraries` → fiche `GET /libraries/:id` → livres `GET /libraries/:id/books`.

### Tag Swagger : Bibliothèques

### `GET /libraries`

**Résumé** : Liste des bibliothèques

Collections éditoriales paginées avec image, description et nombre de livres. **Frontend** : grille de cartes bibliothèques.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `q` | query | Non | string | Recherche sur le nom ou la description de la bibliothèque. |
| `type` | query | Non | INTERNE | EXTERNE | Type de bibliothèque (enum Prisma `TypeBibliotheque`). |
| `sort` | query | Non | nom | nb_livres | Tri : par nom ou par nombre de livres. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite par page (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<BibliothequeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].nom` | string | — |
| `data[].description` | object | — |
| `data[].couverture_url` | object | — |
| `data[].type` | INTERNE | EXTERNE | — |
| `data[].url_externe` | object | — |
| `data[].nb_livres` | object | — |
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
      "couverture_url": {},
      "type": "INTERNE",
      "url_externe": {},
      "nb_livres": {}
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /libraries/{id}`

**Résumé** : Détail d’une bibliothèque

Nom, description, visuel, métadonnées. **Frontend** : hero de la page bibliothèque.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `nom` | string | — |
| `description` | object | — |
| `couverture_url` | object | — |
| `type` | INTERNE | EXTERNE | — |
| `url_externe` | object | — |
| `nb_livres` | object | — |
| `statut` | ACTIVE | ARCHIVEE | — |
| `acces_livres` | string | — |
| `livres_populaires` | array<LivrePopulaireSchema> | — |
| `livres_populaires[].id` | string (uuid) | — |
| `livres_populaires[].titre` | string | — |
| `livres_populaires[].couverture_url` | object | — |
| `livres_populaires[].note_moyenne` | object | — |
| `livres_populaires[].nb_lectures` | number | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "string",
  "description": {},
  "couverture_url": {},
  "type": "INTERNE",
  "url_externe": {},
  "nb_livres": {},
  "statut": "ACTIVE",
  "acces_livres": "string",
  "livres_populaires": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "couverture_url": {},
      "note_moyenne": {},
      "nb_lectures": 1
    }
  ]
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /libraries/{id}/books`

**Résumé** : Catalogue des livres d’une bibliothèque

Même logique que `GET /books` mais scoped à une bibliothèque. Filtres : catégorie, type, tri, recherche `q`. **Frontend** : liste principale après clic sur une bibliothèque.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |
| `q` | query | Non | string | Recherche sur métadonnées (titre, ISBN, résumé, langue, auteurs). |
| `type_livre` | query | Non | INTERNE | EXTERNE | Filtrer par type audio ou ebook. |
| `categorie_id` | query | Non | string (uuid) | UUID catégorie dans cette bibliothèque. |
| `auteur_id` | query | Non | string (uuid) | UUID auteur. |
| `langue` | query | Non | string | Code langue. |
| `is_downloadable` | query | Non | boolean | Uniquement les livres téléchargeables si `true`. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |
| `sort` | query | Non | note_moyenne | nb_lectures | nb_lectures_7j | recent | titre | Tri du catalogue. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<LivreLibraryItemWithProgressSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].isbn` | object | — |
| `data[].resume` | object | — |
| `data[].couverture_url` | object | — |
| `data[].type_livre` | INTERNE | EXTERNE | — |
| `data[].is_downloadable` | boolean | — |
| `data[].langue` | object | — |
| `data[].annee_publication` | object | — |
| `data[].nombre_pages` | object | — |
| `data[].auteurs` | array<AuteurBriefSchema> | — |
| `data[].auteurs[].id` | string (uuid) | — |
| `data[].auteurs[].nom` | string | — |
| `data[].auteurs[].prenom` | string | — |
| `data[].categories` | array<CategorieBriefSchema> | — |
| `data[].categories[].id` | string (uuid) | — |
| `data[].categories[].nom` | string | — |
| `data[].note_moyenne` | object | — |
| `data[].nb_lectures` | number | — |
| `data[].ma_progression` | MaProgressionBriefSchema | — |
| `data[].ma_progression.page_actuelle` | number | — |
| `data[].ma_progression.pourcentage` | number | — |
| `data[].ma_progression.statut` | EN_COURS | TERMINE | ABANDONNE | — |
| `data[].ma_progression.derniere_maj` | string (date-time) | — |
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
      "resume": {},
      "couverture_url": {},
      "type_livre": "INTERNE",
      "is_downloadable": true,
      "langue": {},
      "annee_publication": {},
      "nombre_pages": {},
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
      ],
      "note_moyenne": {},
      "nb_lectures": 1,
      "ma_progression": {
        "page_actuelle": 1,
        "pourcentage": 1,
        "statut": "EN_COURS",
        "derniere_maj": "2024-06-15T10:30:00.000Z"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /libraries/{id}/books/in-progress`

**Résumé** : Livres en cours dans cette bibliothèque

Livres commencés mais non terminés par l’utilisateur, filtrés par bibliothèque. **Frontend** : section « Continuer dans [Bibliothèque] ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<LivreLibraryItemWithProgressSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].isbn` | object | — |
| `data[].resume` | object | — |
| `data[].couverture_url` | object | — |
| `data[].type_livre` | INTERNE | EXTERNE | — |
| `data[].is_downloadable` | boolean | — |
| `data[].langue` | object | — |
| `data[].annee_publication` | object | — |
| `data[].nombre_pages` | object | — |
| `data[].auteurs` | array<AuteurBriefSchema> | — |
| `data[].auteurs[].id` | string (uuid) | — |
| `data[].auteurs[].nom` | string | — |
| `data[].auteurs[].prenom` | string | — |
| `data[].categories` | array<CategorieBriefSchema> | — |
| `data[].categories[].id` | string (uuid) | — |
| `data[].categories[].nom` | string | — |
| `data[].note_moyenne` | object | — |
| `data[].nb_lectures` | number | — |
| `data[].ma_progression` | MaProgressionBriefSchema | — |
| `data[].ma_progression.page_actuelle` | number | — |
| `data[].ma_progression.pourcentage` | number | — |
| `data[].ma_progression.statut` | EN_COURS | TERMINE | ABANDONNE | — |
| `data[].ma_progression.derniere_maj` | string (date-time) | — |
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
      "resume": {},
      "couverture_url": {},
      "type_livre": "INTERNE",
      "is_downloadable": true,
      "langue": {},
      "annee_publication": {},
      "nombre_pages": {},
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
      ],
      "note_moyenne": {},
      "nb_lectures": 1,
      "ma_progression": {
        "page_actuelle": 1,
        "pourcentage": 1,
        "statut": "EN_COURS",
        "derniere_maj": "2024-06-15T10:30:00.000Z"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /libraries/{id}/categories`

**Résumé** : Catégories d’une bibliothèque

Arbre ou liste des catégories disponibles pour filtrer les livres. **Frontend** : chips / menu latéral de filtrage.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |

**Réponses**

#### HTTP 200

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /libraries/{id}/stats`

**Résumé** : Statistiques d’une bibliothèque

Volumes : livres, auteurs, catégories, types (audio/ebook). **Frontend** : sous-titre de la page bibliothèque.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la bibliothèque (`bibliotheque.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `nb_livres` | number | — |
| `nb_auteurs` | number | — |
| `nb_categories` | number | — |

**Exemple de réponse**

```json
{
  "nb_livres": 1,
  "nb_auteurs": 1,
  "nb_categories": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /libraries/summary`

**Résumé** : Résumé global des bibliothèques

Compteurs agrégés (nombre de bibliothèques, livres, catégories) pour l’écran d’exploration. **Frontend** : en-tête ou bannière de la section « Bibliothèques ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `nb_bibliotheques` | number | — |
| `nb_livres_total` | number | — |

**Exemple de réponse**

```json
{
  "nb_bibliotheques": 1,
  "nb_livres_total": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---


## Étape 5 — Catalogue & lecture — `/books`

**Workflow frontend**

1. `GET /books/:id` — fiche.
2. `GET /books/:id/access/check?type=LECTURE` — éligibilité.
3. `POST /books/:id/access?type=LECTURE` — jeton temporaire.
4. Lecteur : `GET /books/:id/stream?token=...` (302 vers le média).
5. `PATCH /books/:id/progress` — sauvegarde page (debounce).

### Tag Swagger : Livres & lecture

### `GET /books`

**Résumé** : Catalogue paginé de livres

Liste les livres accessibles selon l’abonnement et les filtres (`q`, `type_livre`, `categorie_id`, `bibliotheque_id`, etc.). Chaque item inclut métadonnées, note moyenne et indicateurs d’accès (`can_stream`, `can_download`). **Frontend** : page catalogue / grille, barre de recherche locale, filtres latéraux.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `q` | query | Non | string | Recherche texte sur titre, auteur, ISBN, résumé. |
| `type_livre` | query | Non | INTERNE | EXTERNE | Filtrer par type : livre audio ou ebook. |
| `categorie_id` | query | Non | string (uuid) | UUID de la catégorie. |
| `auteur_id` | query | Non | string (uuid) | UUID de l’auteur. |
| `langue` | query | Non | string | Code langue (ex. `fr`, `en`). |
| `is_downloadable` | query | Non | boolean | `true` pour ne lister que les livres téléchargeables. |
| `bibliotheque_id` | query | Non | string (uuid) | Restreindre le catalogue à une bibliothèque éditoriale. |
| `page` | query | Non | number | Numéro de page (défaut : 1). |
| `limit` | query | Non | number | Taille de page (défaut : 20, max : 100). |
| `sort` | query | Non | note_moyenne | nb_lectures | nb_lectures_7j | recent | titre | Tri : `RECENT`, `TITRE`, `NOTE`, etc. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<LivreCatalogItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].isbn` | object | — |
| `data[].resume` | object | — |
| `data[].couverture_url` | object | — |
| `data[].type_livre` | INTERNE | EXTERNE | — |
| `data[].is_downloadable` | boolean | — |
| `data[].langue` | object | — |
| `data[].annee_publication` | object | — |
| `data[].nombre_pages` | object | — |
| `data[].auteurs` | array<AuteurBriefSchema> | — |
| `data[].auteurs[].id` | string (uuid) | — |
| `data[].auteurs[].nom` | string | — |
| `data[].auteurs[].prenom` | string | — |
| `data[].categories` | array<CategorieBriefSchema> | — |
| `data[].categories[].id` | string (uuid) | — |
| `data[].categories[].nom` | string | — |
| `data[].note_moyenne` | object | — |
| `data[].nb_lectures` | number | — |
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
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "isbn": {},
      "resume": {},
      "couverture_url": {},
      "type_livre": "INTERNE",
      "is_downloadable": true,
      "langue": {},
      "annee_publication": {},
      "nombre_pages": {},
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
      ],
      "note_moyenne": {},
      "nb_lectures": 1,
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}`

**Résumé** : Fiche détaillée d’un livre

Métadonnées complètes : auteur, catégories, bibliothèque, note utilisateur, progression, accès. **Frontend** : écran détail livre — appeler en premier avant access/stream.

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
| `titre` | string | — |
| `isbn` | object | — |
| `resume` | object | — |
| `couverture_url` | object | — |
| `type_livre` | INTERNE | EXTERNE | — |
| `is_downloadable` | boolean | — |
| `langue` | object | — |
| `annee_publication` | object | — |
| `nombre_pages` | object | — |
| `auteurs` | array<AuteurDetailSchema> | — |
| `auteurs[].id` | string (uuid) | — |
| `auteurs[].nom` | string | — |
| `auteurs[].prenom` | string | — |
| `auteurs[].bio` | object | — |
| `categories` | array<CategorieBriefSchema> | — |
| `categories[].id` | string (uuid) | — |
| `categories[].nom` | string | — |
| `statistiques` | LivreStatistiquesSchema | — |
| `statistiques.note_moyenne` | object | — |
| `statistiques.nb_notes` | number | — |
| `statistiques.nb_lectures` | number | — |
| `statistiques.nb_terminees` | number | — |
| `ma_progression` | MaProgressionBriefSchema | — |
| `ma_progression.page_actuelle` | number | — |
| `ma_progression.pourcentage` | number | — |
| `ma_progression.statut` | EN_COURS | TERMINE | ABANDONNE | — |
| `ma_progression.derniere_maj` | string (date-time) | — |
| `ma_note` | object | — |
| `acces` | LivreAccesSchema | — |
| `acces.peut_lire` | boolean | — |
| `acces.peut_telecharger` | boolean | — |
| `acces.raison_blocage` | object | — |
| `acces.ressource_disponible` | boolean | — |
| `acces.acces_type` | string | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "titre": "string",
  "isbn": {},
  "resume": {},
  "couverture_url": {},
  "type_livre": "INTERNE",
  "is_downloadable": true,
  "langue": {},
  "annee_publication": {},
  "nombre_pages": {},
  "auteurs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "prenom": "string",
      "bio": {}
    }
  ],
  "categories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string"
    }
  ],
  "statistiques": {
    "note_moyenne": {},
    "nb_notes": 1,
    "nb_lectures": 1,
    "nb_terminees": 1
  },
  "ma_progression": {
    "page_actuelle": 1,
    "pourcentage": 1,
    "statut": "EN_COURS",
    "derniere_maj": "2024-06-15T10:30:00.000Z"
  },
  "ma_note": {},
  "acces": {
    "peut_lire": true,
    "peut_telecharger": true,
    "raison_blocage": {},
    "ressource_disponible": true,
    "acces_type": "string"
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/access`

**Résumé** : Générer un jeton d’accès (lecture ou téléchargement)

Crée un `access_token` temporaire lié au livre. Paramètre query obligatoire : `type=STREAM|DOWNLOAD`. GET et POST sont équivalents. **Frontend** : après succès, ouvrir le lecteur avec `GET /books/:id/stream?token=...` ou déclencher le téléchargement.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `type` | query | **Oui** | LECTURE | TELECHARGEMENT | Type d’accès à générer : `STREAM` (lecture en ligne) ou `DOWNLOAD` (téléchargement). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `token` | object | — |
| `expires_at` | object (date-time) | — |
| `type_acces` | LECTURE | TELECHARGEMENT | — |
| `stream_url` | object | — |
| `expires_in_sec` | number | — |
| `progression_creee` | boolean | — |

**Exemple de réponse**

```json
{
  "token": {},
  "expires_at": {},
  "type_acces": "LECTURE",
  "stream_url": {},
  "expires_in_sec": 1,
  "progression_creee": true
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /books/{id}/access`

**Résumé** : Générer un jeton d’accès (lecture ou téléchargement)

Crée un `access_token` temporaire lié au livre. Paramètre query obligatoire : `type=STREAM|DOWNLOAD`. GET et POST sont équivalents. **Frontend** : après succès, ouvrir le lecteur avec `GET /books/:id/stream?token=...` ou déclencher le téléchargement.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `type` | query | **Oui** | LECTURE | TELECHARGEMENT | Type d’accès à générer : `STREAM` (lecture en ligne) ou `DOWNLOAD` (téléchargement). |

**Réponses**

#### HTTP 200

**Exemple de réponse**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "expires_at": "2025-05-22T12:00:00.000Z",
  "type": "LECTURE",
  "stream_url": "/books/uuid/stream?token=…",
  "expires_in_sec": 3600,
  "progression_creee": true
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/access/active`

**Résumé** : Récupérer un jeton d’accès encore valide

Si un token non expiré existe déjà pour ce livre et ce type, le renvoie au lieu d’en créer un nouveau (économie de quota). **Frontend** : appeler avant `POST /access` pour éviter de consommer un nouvel accès.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `type` | query | Non | LECTURE | TELECHARGEMENT | Type d’accès à vérifier ; si omis, vérifie les deux types selon la logique métier. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `token` | object | — |
| `expires_at` | object (date-time) | — |
| `type_acces` | LECTURE | TELECHARGEMENT | — |
| `stream_url` | object | — |
| `expires_in_sec` | number | — |
| `progression_creee` | boolean | — |

**Exemple de réponse**

```json
{
  "token": {},
  "expires_at": {},
  "type_acces": "LECTURE",
  "stream_url": {},
  "expires_in_sec": 1,
  "progression_creee": true
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/access/check`

**Résumé** : Vérifier si l’utilisateur peut accéder au livre

Contrôle abonnement, plan, quotas et type d’accès demandé (`STREAM` ou `DOWNLOAD`) **sans** émettre de jeton. **Frontend** : avant d’afficher le bouton « Lire » / « Télécharger », ou pour expliquer un blocage (upgrade plan).

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `type` | query | Non | LECTURE | TELECHARGEMENT | Type d’accès à vérifier ; si omis, vérifie les deux types selon la logique métier. |

**Réponses**

#### HTTP 200

**Exemple de réponse**

```json
{
  "allowed": true,
  "reason": null,
  "subscription": {
    "plan_nom": "Mensuel",
    "fin": "2025-06-22T00:00:00.000Z"
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/challenges`

**Résumé** : Défis associés à ce livre

Défis actifs dont la progression peut être alimentée par la lecture de ce titre. **Frontend** : encart gamification sur la fiche livre.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ChallengeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].description` | object | — |
| `data[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `data[].objectif_valeur` | number | — |
| `data[].points_bonus` | number | — |
| `data[].date_debut` | string (date-time) | — |
| `data[].date_fin` | string (date-time) | — |
| `data[].badge` | BadgeSummarySchema | — |
| `data[].badge.id` | string (uuid) | — |
| `data[].badge.nom` | string | — |
| `data[].badge.icone` | string | — |
| `data[].badge.couleur` | string | — |
| `data[].badge.points` | number | — |
| `data[].ma_participation` | ChallengeParticipationBriefSchema | — |
| `data[].ma_participation.progression` | number | — |
| `data[].ma_participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
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
      "description": {},
      "type": "NB_LIVRES",
      "objectif_valeur": 1,
      "points_bonus": 1,
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "badge": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nom": "string",
        "icone": "string",
        "couleur": "string",
        "points": 1
      },
      "ma_participation": {
        "progression": 1,
        "statut": "EN_COURS"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/comments`

**Résumé** : Commentaires publics du livre

Fil de discussion paginé. Route accessible avec JWT mais sans filtre par utilisateur. **Frontend** : onglet avis / commentaires sur la fiche livre.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite par page (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<CommentSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].contenu` | string | — |
| `data[].createdAt` | string (date-time) | — |
| `data[].auteur` | CommentAuteurSchema | — |
| `data[].auteur.nom` | string | — |
| `data[].auteur.prenom` | string | — |
| `data[].auteur.photo_profil_url` | object | — |
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
      "createdAt": "2024-06-15T10:30:00.000Z",
      "auteur": {
        "nom": "string",
        "prenom": "string",
        "photo_profil_url": {}
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /books/{id}/comments`

**Résumé** : Publier un commentaire

Ajoute un avis textuel sur le livre. **Frontend** : formulaire sous la fiche.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `contenu` | **Oui** | string | Texte du commentaire (max. 5000 caractères). | — |

**Exemple de requête**

```json
{
  "contenu": "string"
}
```

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `contenu` | string | — |
| `createdAt` | string (date-time) | — |
| `auteur` | CommentAuteurSchema | — |
| `auteur.nom` | string | — |
| `auteur.prenom` | string | — |
| `auteur.photo_profil_url` | object | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "contenu": "string",
  "createdAt": "2024-06-15T10:30:00.000Z",
  "auteur": {
    "nom": "string",
    "prenom": "string",
    "photo_profil_url": {}
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /books/{id}/comments/{commentId}`

**Résumé** : Modifier son commentaire

Met à jour le texte d’un commentaire publié par l’utilisateur connecté. **Frontend** : édition inline ou formulaire « Modifier ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `commentId` | path | **Oui** | string (uuid) | Identifiant du commentaire (`commentaire.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `contenu` | **Oui** | string | Nouveau texte du commentaire (max. 5000 caractères). | — |

**Exemple de requête**

```json
{
  "contenu": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `contenu` | string | — |
| `createdAt` | string (date-time) | — |
| `auteur` | CommentAuteurSchema | — |
| `auteur.nom` | string | — |
| `auteur.prenom` | string | — |
| `auteur.photo_profil_url` | object | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "contenu": "string",
  "createdAt": "2024-06-15T10:30:00.000Z",
  "auteur": {
    "nom": "string",
    "prenom": "string",
    "photo_profil_url": {}
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `DELETE /books/{id}/comments/{commentId}`

**Résumé** : Supprimer son commentaire

Passe le statut à `SUPPRIME` (soft delete). Le commentaire disparaît des listes publiques. **Frontend** : confirmation puis retrait du fil.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `commentId` | path | **Oui** | string (uuid) | Identifiant du commentaire (`commentaire.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `contenu` | string | — |
| `createdAt` | string (date-time) | — |
| `auteur` | CommentAuteurSchema | — |
| `auteur.nom` | string | — |
| `auteur.prenom` | string | — |
| `auteur.photo_profil_url` | object | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "contenu": "string",
  "createdAt": "2024-06-15T10:30:00.000Z",
  "auteur": {
    "nom": "string",
    "prenom": "string",
    "photo_profil_url": {}
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/progress`

**Résumé** : Progression de lecture

Page courante, pourcentage, statut (en cours / terminé), durée cumulée. **Frontend** : reprendre le lecteur à la bonne page / position.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `page_actuelle` | number | — |
| `pourcentage` | number | — |
| `duree_lecture_min` | number | — |
| `statut` | EN_COURS | TERMINE | ABANDONNE | — |
| `date_debut` | string (date-time) | — |
| `date_fin` | object (date-time) | — |
| `date_telechargement` | object (date-time) | — |

**Exemple de réponse**

```json
{
  "page_actuelle": 1,
  "pourcentage": 1,
  "duree_lecture_min": 1,
  "statut": "EN_COURS",
  "date_debut": "2024-06-15T10:30:00.000Z",
  "date_fin": {},
  "date_telechargement": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /books/{id}/progress`

**Résumé** : Mettre à jour la progression

Enregistre `page_actuelle` et optionnellement `duree_lecture_min` (session). Peut déclencher la complétion du livre et la progression des défis. **Frontend** : envoyer périodiquement (debounce) depuis le lecteur.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `page_actuelle` | **Oui** | number | Page ou position courante (0 pour le début). | — |
| `duree_lecture_min` | Non | number | Durée de la session de lecture en minutes (optionnel, pour les stats). | — |

**Exemple de requête**

```json
{
  "page_actuelle": 0,
  "duree_lecture_min": 0
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `page_actuelle` | number | — |
| `pourcentage` | number | — |
| `statut` | EN_COURS | TERMINE | ABANDONNE | — |
| `date_fin` | object (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "page_actuelle": 1,
  "pourcentage": 1,
  "statut": "EN_COURS",
  "date_fin": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /books/{id}/rate`

**Résumé** : Noter le livre (1–5)

Crée ou met à jour la note de l’utilisateur. **Frontend** : étoiles interactives.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `valeur` | **Oui** | number | Note de 1 à 5 étoiles. | — |

**Exemple de requête**

```json
{
  "valeur": 1
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `valeur` | number | — |
| `note_moyenne` | object | — |

**Exemple de réponse**

```json
{
  "valeur": 1,
  "note_moyenne": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /books/{id}/rate`

**Résumé** : Modifier sa note (1–5)

Alias REST de la création/mise à jour de note (`POST /rate`). Utile pour une sémantique PATCH côté client.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `valeur` | **Oui** | number | Note de 1 à 5 étoiles. | — |

**Exemple de requête**

```json
{
  "valeur": 1
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `valeur` | number | — |
| `note_moyenne` | object | — |

**Exemple de réponse**

```json
{
  "valeur": 1,
  "note_moyenne": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/resource`

**Résumé** : Métadonnées des fichiers (audio / ebook)

Retourne les URLs Cloudinary, durée, nombre de pages, formats disponibles **sans** consommer de quota d’accès. **Frontend** : afficher infos techniques sur la fiche livre avant lecture.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `livre_id` | string (uuid) | — |
| `titre` | string | — |
| `couverture_url` | object | — |
| `type_livre` | INTERNE | EXTERNE | — |
| `is_downloadable` | boolean | — |
| `nombre_pages` | object | — |
| `langue` | object | — |
| `ressource_disponible` | boolean | — |
| `acces_type` | string | — |
| `peut_lire` | boolean | — |
| `peut_telecharger` | boolean | — |
| `raison_blocage` | object | — |
| `codes` | array<string> | — |
| `ma_progression` | MaProgressionBriefSchema | — |
| `ma_progression.page_actuelle` | number | — |
| `ma_progression.pourcentage` | number | — |
| `ma_progression.statut` | EN_COURS | TERMINE | ABANDONNE | — |
| `ma_progression.derniere_maj` | string (date-time) | — |
| `nb_ouvertures` | number | — |

**Exemple de réponse**

```json
{
  "livre_id": "550e8400-e29b-41d4-a716-446655440000",
  "titre": "string",
  "couverture_url": {},
  "type_livre": "INTERNE",
  "is_downloadable": true,
  "nombre_pages": {},
  "langue": {},
  "ressource_disponible": true,
  "acces_type": "string",
  "peut_lire": true,
  "peut_telecharger": true,
  "raison_blocage": {},
  "codes": [
    "string"
  ],
  "ma_progression": {
    "page_actuelle": 1,
    "pourcentage": 1,
    "statut": "EN_COURS",
    "derniere_maj": "2024-06-15T10:30:00.000Z"
  },
  "nb_ouvertures": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/similar`

**Résumé** : Livres similaires (même bibliothèque / catégories)

Recommandations de proximité éditoriale pour la fiche livre. **Frontend** : carrousel « Vous aimerez aussi » sous le détail.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `limit` | query | Non | number | Nombre de livres similaires à retourner (défaut : 12, max : 30). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<LivreSearchItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].couverture_url` | object | — |
| `data[].type_livre` | INTERNE | EXTERNE | — |
| `data[].auteurs` | array<AuteurBriefSchema> | — |
| `data[].auteurs[].id` | string (uuid) | — |
| `data[].auteurs[].nom` | string | — |
| `data[].auteurs[].prenom` | string | — |
| `data[].note_moyenne` | object | — |
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
      "couverture_url": {},
      "type_livre": "INTERNE",
      "auteurs": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "nom": "string",
          "prenom": "string"
        }
      ],
      "note_moyenne": {}
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/{id}/stream`

**Résumé** : Stream ou redirection vers le fichier

Avec `token` : redirection HTTP **302** vers Cloudinary (lecteur audio/PDF). Avec `validate=true` : réponse JSON confirmant la validité du token (tests / debug). **Frontend** : WebView, `<audio src>`, ou fetch avec redirect ; ne pas exposer le token dans les logs.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du livre (`livre.id`). |
| `token` | query | **Oui** | string (uuid) | Jeton d’accès obtenu via `POST /books/:id/access`. |
| `validate` | query | Non | boolean | Si `true` : vérifie le token sans redirection 302 (réponse JSON de test). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `valid` | boolean | — |
| `redirect_url` | object | — |
| `message` | object | — |

**Exemple de réponse**

```json
{
  "valid": true,
  "redirect_url": {},
  "message": {}
}
```

#### HTTP 302 — Redirection 302 vers l’URL du média (mode normal).

Redirection HTTP vers l’URL du média (`Location`).

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /books/access/recent`

**Résumé** : Livres récemment consultés

Historique des accès (stream/download) de l’utilisateur, triés par date décroissante. **Frontend** : section « Reprendre la lecture » ou « Récemment ouverts ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite par page (défaut : 10, max : 50). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<RecentAccessItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].isbn` | object | — |
| `data[].resume` | object | — |
| `data[].couverture_url` | object | — |
| `data[].type_livre` | INTERNE | EXTERNE | — |
| `data[].is_downloadable` | boolean | — |
| `data[].langue` | object | — |
| `data[].annee_publication` | object | — |
| `data[].nombre_pages` | object | — |
| `data[].auteurs` | array<AuteurBriefSchema> | — |
| `data[].auteurs[].id` | string (uuid) | — |
| `data[].auteurs[].nom` | string | — |
| `data[].auteurs[].prenom` | string | — |
| `data[].categories` | array<CategorieBriefSchema> | — |
| `data[].categories[].id` | string (uuid) | — |
| `data[].categories[].nom` | string | — |
| `data[].note_moyenne` | object | — |
| `data[].nb_lectures` | number | — |
| `data[].nb_lectures_7j` | number | — |
| `data[].dernier_acces` | string (date-time) | — |
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
      "resume": {},
      "couverture_url": {},
      "type_livre": "INTERNE",
      "is_downloadable": true,
      "langue": {},
      "annee_publication": {},
      "nombre_pages": {},
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
      ],
      "note_moyenne": {},
      "nb_lectures": 1,
      "nb_lectures_7j": 1,
      "dernier_acces": "2024-06-15T10:30:00.000Z"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---


## Étape 6 — Plans & abonnements

**Workflow frontend**

`GET /plans` (public) pour la page tarifs. `GET /subscriptions/current` pour savoir si l’utilisateur peut lire.

### Tag Swagger : Plans d’abonnement

### `GET /plans`

**Résumé** : Liste des plans d’abonnement actifs

Offres commerciales publiques (nom, prix, durée, quotas stream/download). **Sans authentification**. **Frontend** : page tarifs / choix d’offre avant inscription ou depuis les paramètres.

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200

---

### `GET /plans/{id}`

**Résumé** : Détail d’un plan

Caractéristiques complètes d’une offre. **Frontend** : modal comparaison ou fiche plan.

**Authentification** : **Public** (pas de JWT)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant du plan (`plan.id`). |

**Réponses**

#### HTTP 200

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

---

### Tag Swagger : Abonnements

### `GET /subscriptions/compare`

**Résumé** : Comparer les plans pour l’utilisateur

Tous les plans avec indication plan actuel, upgrade possible, prix à payer. **Frontend** : écran « Changer d’offre » avec mise en avant de l’option recommandée.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

---

### `GET /subscriptions/current`

**Résumé** : Abonnement actuellement actif

Plan en cours, dates, quotas restants. `null` si aucun abonnement. **Frontend** : bannière « Mon abonnement », contrôle des accès livres.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `plan` | PlanSummarySchema | — |
| `plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `plan.prix` | number | — |
| `plan.devise` | string | — |
| `plan.duree_jours` | number | — |
| `date_debut` | string (date-time) | — |
| `date_fin` | string (date-time) | — |
| `jours_restants` | number | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "plan": {
    "plan": "HEBDOMADAIRE",
    "prix": 1,
    "devise": "string",
    "duree_jours": 1
  },
  "date_debut": "2024-06-15T10:30:00.000Z",
  "date_fin": "2024-06-15T10:30:00.000Z",
  "jours_restants": 1
}
```

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

---

### `GET /subscriptions/history`

**Résumé** : Historique des abonnements

Anciennes périodes, expirations, changements de plan. **Frontend** : liste factures / historique.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `statut` | query | Non | EN_ATTENTE | SUCCES | ECHEC | Filtrer par statut de paiement : `EN_ATTENTE`, `VALIDE`, `ECHEC`, etc. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<SubscriptionHistoryItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].statut_paiement` | EN_ATTENTE | SUCCES | ECHEC | — |
| `data[].montant` | number | — |
| `data[].devise` | string | — |
| `data[].date` | string (date-time) | — |
| `data[].plan` | PlanSummarySchema | — |
| `data[].plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `data[].plan.prix` | number | — |
| `data[].plan.devise` | string | — |
| `data[].plan.duree_jours` | number | — |
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
      "statut_paiement": "EN_ATTENTE",
      "montant": 1,
      "devise": "string",
      "date": "2024-06-15T10:30:00.000Z",
      "plan": {
        "plan": "HEBDOMADAIRE",
        "prix": 1,
        "devise": "string",
        "duree_jours": 1
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

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

---

### `GET /subscriptions/summary`

**Résumé** : Résumé abonnement

Vue condensée : plan, statut, jours restants, alertes. **Frontend** : widget paramètres compte.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `actif` | CurrentSubscriptionSchema | — |
| `actif.id` | string (uuid) | — |
| `actif.plan` | PlanSummarySchema | — |
| `actif.plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `actif.plan.prix` | number | — |
| `actif.plan.devise` | string | — |
| `actif.plan.duree_jours` | number | — |
| `actif.date_debut` | string (date-time) | — |
| `actif.date_fin` | string (date-time) | — |
| `actif.jours_restants` | number | — |
| `prochain` | CurrentSubscriptionSchema | — |
| `prochain.id` | string (uuid) | — |
| `prochain.plan` | PlanSummarySchema | — |
| `prochain.plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `prochain.plan.prix` | number | — |
| `prochain.plan.devise` | string | — |
| `prochain.plan.duree_jours` | number | — |
| `prochain.date_debut` | string (date-time) | — |
| `prochain.date_fin` | string (date-time) | — |
| `prochain.jours_restants` | number | — |

**Exemple de réponse**

```json
{
  "actif": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "plan": {
      "plan": "HEBDOMADAIRE",
      "prix": 1,
      "devise": "string",
      "duree_jours": 1
    },
    "date_debut": "2024-06-15T10:30:00.000Z",
    "date_fin": "2024-06-15T10:30:00.000Z",
    "jours_restants": 1
  },
  "prochain": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "plan": {
      "plan": "HEBDOMADAIRE",
      "prix": 1,
      "devise": "string",
      "duree_jours": 1
    },
    "date_debut": "2024-06-15T10:30:00.000Z",
    "date_fin": "2024-06-15T10:30:00.000Z",
    "jours_restants": 1
  }
}
```

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

---

### `GET /subscriptions/upcoming`

**Résumé** : Abonnement à venir (renouvellement / changement de plan)

Prochaine période déjà payée ou plan programmé. **Frontend** : mention « Renouvellement le … ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `plan` | PlanSummarySchema | — |
| `plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `plan.prix` | number | — |
| `plan.devise` | string | — |
| `plan.duree_jours` | number | — |
| `date_debut` | string (date-time) | — |
| `date_fin` | string (date-time) | — |
| `jours_restants` | number | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "plan": {
    "plan": "HEBDOMADAIRE",
    "prix": 1,
    "devise": "string",
    "duree_jours": 1
  },
  "date_debut": "2024-06-15T10:30:00.000Z",
  "date_fin": "2024-06-15T10:30:00.000Z",
  "jours_restants": 1
}
```

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

---


## Étape 7 — Paiements Mobile Money — `/payments`

**Workflow frontend**

1. `GET /payments/checkout-preview?plan_id=` — récap.
2. `POST /payments/init` — lancer PawaPay.
3. Polling `GET /payments/status?transaction_id=` jusqu’à SUCCES/ECHEC.

### Tag Swagger : Paiements

### `GET /api/webhooks/pawapay/deposits`

**Résumé** : Ping pour vérifier que ngrok atteint bien le backend.

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200

---

### `POST /api/webhooks/pawapay/deposits`

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200

---

### `POST /api/webhooks/pawapay/payouts`

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200

---

### `POST /api/webhooks/pawapay/refunds`

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200

---

### `GET /payments/checkout-preview`

**Résumé** : Aperçu du checkout avant paiement

Calcule montant, devise, plan choisi et état de l’abonnement actuel (upgrade/downgrade). **Frontend** : page récapitulatif avant redirection vers le prestataire de paiement.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `plan_id` | query | **Oui** | string (uuid) | UUID du plan pour lequel calculer l’aperçu tarifaire. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `plan_id` | string (uuid) | — |
| `plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `montant` | number | — |
| `devise` | string | — |
| `prorata` | number | — |
| `libelle` | string | — |

**Exemple de réponse**

```json
{
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan": "HEBDOMADAIRE",
  "montant": 1,
  "devise": "string",
  "prorata": 1,
  "libelle": "string"
}
```

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

#### HTTP 403 — Compte PENDING (valider l’email OTP), BANNI ou autre statut bloquant le paiement.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte PENDING (valider l’email OTP), BANNI ou autre statut bloquant le paiement.",
  "error": "Error"
}
```

---

### `POST /payments/init`

**Résumé** : Initier un paiement d’abonnement

Crée une transaction (PawaPay ou mock) et renvoie l’URL ou les instructions USSD (`payment_url`). **Frontend** : ouvrir WebView ou navigateur externe avec cette URL.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `plan_id` | **Oui** | string (uuid) | UUID du plan d’abonnement à acheter (`GET /plans`). | — |
| `operator` | Non | string | PawaPay : `MTN_MOMO_COG` ou `AIRTEL_COG` (Congo). Sinon déduit du préfixe MSISDN (06→MTN, 05/04→Airtel). | — |
| `phonenumber` | Non | string | MSISDN sans espaces (ex. `242061234567`). Prioritaire sur le profil. | — |
| `country` | Non | string | Code pays ISO (ex. `CG`). Utilisé par PawaPay si besoin. | — |

**Exemple de requête**

```json
{
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "operator": "string",
  "phonenumber": "string",
  "country": "string"
}
```

**Réponses**

#### HTTP 200

**Exemple de réponse**

```json
{
  "ref_transaction": "pay_abc123",
  "payment_url": "https://pay.pawapay.io/…",
  "paiement_id": "550e8400-e29b-41d4-a716-446655440099",
  "pawapay": {
    "deposit_id": "dep_xyz"
  }
}
```

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

#### HTTP 403 — Compte PENDING (valider l’email OTP), BANNI ou autre statut bloquant le paiement.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte PENDING (valider l’email OTP), BANNI ou autre statut bloquant le paiement.",
  "error": "Error"
}
```

---

### `POST /payments/mock/simulate`

**Résumé** : [DEV] Simuler un paiement réussi

Sandbox uniquement : force la validation d’une transaction mock. **Frontend** : bouton debug en environnement de développement.

**Authentification** : **Public** (pas de JWT)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `transaction_id` | **Oui** | string | ID de transaction mock à simuler. | — |
| `outcome` | **Oui** | success | failure | cancelled | waiting | Résultat simulé : `success`, `failure`, `cancelled` ou `waiting`. | — |
| `operateur` | Non | string | Opérateur mobile money (sandbox). | — |
| `numero_telephone` | Non | string | Numéro de téléphone du payeur (sandbox). | — |

**Exemple de requête**

```json
{
  "transaction_id": "string",
  "outcome": "success",
  "operateur": "string",
  "numero_telephone": "string"
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `plan` | PlanSummarySchema | — |
| `plan.plan` | HEBDOMADAIRE | MENSUEL | ANNUEL | — |
| `plan.prix` | number | — |
| `plan.devise` | string | — |
| `plan.duree_jours` | number | — |
| `date_debut` | string (date-time) | — |
| `date_fin` | string (date-time) | — |
| `jours_restants` | number | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "plan": {
    "plan": "HEBDOMADAIRE",
    "prix": 1,
    "devise": "string",
    "duree_jours": 1
  },
  "date_debut": "2024-06-15T10:30:00.000Z",
  "date_fin": "2024-06-15T10:30:00.000Z",
  "jours_restants": 1
}
```

---

### `GET /payments/pending`

**Résumé** : Paiements en attente

Transactions initiées mais pas encore confirmées (webhook). **Frontend** : écran « Paiement en cours » avec polling possible sur `/status`.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

---

### `GET /payments/return`

**Résumé** : Page de retour après paiement

Route publique appelée par redirection navigateur. Renvoie un statut lisible pour afficher succès/échec. **Frontend** : deep link ou page web de retour qui lit ce JSON.

**Authentification** : **Public** (pas de JWT)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `transaction_id` | query | Non | string | ID transaction renvoyé par le prestataire dans l’URL de retour. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `statut` | EN_ATTENTE | SUCCES | ECHEC | — |
| `message` | string | — |
| `transaction_id` | string | — |

**Exemple de réponse**

```json
{
  "statut": "EN_ATTENTE",
  "message": "string",
  "transaction_id": "string"
}
```

---

### `GET /payments/status`

**Résumé** : Statut d’une transaction

Interroge l’état d’un `transaction_id` (succès, échec, pending). **Frontend** : après retour utilisateur depuis la page de paiement.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `transaction_id` | query | **Oui** | string | Identifiant de transaction renvoyé par `POST /payments/init`. |

**Réponses**

#### HTTP 200

**Exemple de réponse**

```json
{
  "statut": "SUCCES",
  "message": "Paiement confirmé.",
  "plan": {
    "id": "…",
    "nom": "Mensuel",
    "prix_xof": 2500
  },
  "abonnement_lie": {
    "id": "…",
    "debut": "2025-05-22",
    "fin": "2025-06-22"
  },
  "abonnement_actuel": null
}
```

#### HTTP 401 — JWT absent, expiré ou révoqué.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré ou révoqué.",
  "error": "Error"
}
```

---

### `GET /payments/webhook`

**Résumé** : Ping webhook (health check)

Réponse vide 200 pour vérifier que l’URL webhook est joignable par le prestataire.

**Authentification** : **Public** (pas de JWT)

**Réponses**

#### HTTP 200 — Corps vide.

---

### `POST /payments/webhook`

**Résumé** : Notification de paiement (serveur à serveur)

Callback générique (GET ou POST) pour certains flux de retour. PawaPay utilise plutôt `/api/webhooks/pawapay/deposits`. **Frontend** : ne pas appeler — réservé au prestataire.

**Authentification** : **Public** (pas de JWT)

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

---


## Étape 8 — Découverte — recherche, recommandations, notifications

**Workflow frontend**

Barre de recherche → `GET /search?q=`. Accueil suggestions → `GET /recommendations`. Cloche → `GET /notifications`.

### Tag Swagger : Recherche

### `GET /search`

**Résumé** : Rechercher des livres

Recherche full-text sur titre, auteur, description (min. 2 caractères). Filtres : catégorie, langue. Enregistre automatiquement l’historique. **Frontend** : barre de recherche globale, résultats instantanés.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `q` | query | **Oui** | string | Terme de recherche (min. 2 caractères). |
| `categorie_id` | query | Non | string (uuid) | Filtrer par catégorie. |
| `langue` | query | Non | string | Filtrer par langue. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<LivreSearchItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].couverture_url` | object | — |
| `data[].type_livre` | INTERNE | EXTERNE | — |
| `data[].auteurs` | array<AuteurBriefSchema> | — |
| `data[].auteurs[].id` | string (uuid) | — |
| `data[].auteurs[].nom` | string | — |
| `data[].auteurs[].prenom` | string | — |
| `data[].note_moyenne` | object | — |
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
      "couverture_url": {},
      "type_livre": "INTERNE",
      "auteurs": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "nom": "string",
          "prenom": "string"
        }
      ],
      "note_moyenne": {}
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /search/history`

**Résumé** : Historique des recherches

Dernières requêtes de l’utilisateur. **Frontend** : suggestions sous la barre de recherche.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<HistoriqueRechercheSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].terme` | string | — |
| `data[].nb_resultats` | number | — |
| `data[].a_clique` | boolean | — |
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
      "terme": "string",
      "nb_resultats": 1,
      "a_clique": true,
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `DELETE /search/history`

**Résumé** : Effacer tout l’historique de recherche

Supprime toutes les entrées de l’utilisateur connecté. **Frontend** : bouton « Effacer l’historique » dans les paramètres ou la recherche.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `nb_supprimees` | number | — |

**Exemple de réponse**

```json
{
  "nb_supprimees": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `DELETE /search/history/{id}`

**Résumé** : Supprimer une entrée d’historique

Retire une recherche de la liste. **Frontend** : swipe delete sur une suggestion.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant d’une entrée d’historique de recherche. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `terme` | string | — |
| `nb_resultats` | number | — |
| `a_clique` | boolean | — |
| `createdAt` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "terme": "string",
  "nb_resultats": 1,
  "a_clique": true,
  "createdAt": "2024-06-15T10:30:00.000Z"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /search/history/{id}/click`

**Résumé** : Marquer un clic sur une recherche historique

Incrémente le compteur de clic pour améliorer le classement des suggestions. **Frontend** : appeler quand l’utilisateur retape une ancienne recherche.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant d’une entrée d’historique de recherche. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `terme` | string | — |
| `nb_resultats` | number | — |
| `a_clique` | boolean | — |
| `createdAt` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "terme": "string",
  "nb_resultats": 1,
  "a_clique": true,
  "createdAt": "2024-06-15T10:30:00.000Z"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### Tag Swagger : Recommandations

### `GET /recommendations`

**Résumé** : Liste des recommandations personnalisées

Suggestions basées sur l’historique, les préférences et le moteur de reco. Filtres : vu/non vu, raison. **Frontend** : feed « Pour vous » paginé.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `raison` | query | Non | SAME_GENRE | SAME_AUTHOR | POPULAR | TRENDING | Filtrer par raison métier (historique, popularité, similaire…). |
| `vu` | query | Non | boolean | Filtrer les recommandations déjà vues. |
| `clique` | query | Non | boolean | Filtrer selon si l’utilisateur a cliqué. |
| `score_min` | query | Non | number | Score minimum entre 0 et 1. |
| `type_livre` | query | Non | INTERNE | EXTERNE | Filtrer par type de livre. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<RecommandationSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].livre` | RecommandationLivreSchema | — |
| `data[].livre.id` | string (uuid) | — |
| `data[].livre.titre` | string | — |
| `data[].livre.couverture_url` | object | — |
| `data[].livre.type_livre` | INTERNE | EXTERNE | — |
| `data[].livre.note_moyenne` | object | — |
| `data[].livre.nb_lectures` | number | — |
| `data[].livre.auteurs` | array<AuteurBriefSchema> | — |
| `data[].livre.auteurs[].id` | string (uuid) | — |
| `data[].livre.auteurs[].nom` | string | — |
| `data[].livre.auteurs[].prenom` | string | — |
| `data[].livre.categories` | array<CategorieBriefSchema> | — |
| `data[].livre.categories[].id` | string (uuid) | — |
| `data[].livre.categories[].nom` | string | — |
| `data[].score` | number | — |
| `data[].raison` | SAME_GENRE | SAME_AUTHOR | POPULAR | TRENDING | — |
| `data[].raison_libelle` | string | — |
| `data[].contexte` | object | — |
| `data[].vu` | boolean | — |
| `data[].clique` | boolean | — |
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
      "livre": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "titre": "string",
        "couverture_url": {},
        "type_livre": "INTERNE",
        "note_moyenne": {},
        "nb_lectures": 1,
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
      },
      "score": 1,
      "raison": "SAME_GENRE",
      "raison_libelle": "string",
      "contexte": {},
      "vu": true,
      "clique": true
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /recommendations/{id}`

**Résumé** : Détail d’une recommandation

Livre cible, score, raison, statut interaction. **Frontend** : avant navigation vers la fiche livre.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la recommandation (`recommandation.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `livre` | RecommandationLivreSchema | — |
| `livre.id` | string (uuid) | — |
| `livre.titre` | string | — |
| `livre.couverture_url` | object | — |
| `livre.type_livre` | INTERNE | EXTERNE | — |
| `livre.note_moyenne` | object | — |
| `livre.nb_lectures` | number | — |
| `livre.auteurs` | array<AuteurBriefSchema> | — |
| `livre.auteurs[].id` | string (uuid) | — |
| `livre.auteurs[].nom` | string | — |
| `livre.auteurs[].prenom` | string | — |
| `livre.categories` | array<CategorieBriefSchema> | — |
| `livre.categories[].id` | string (uuid) | — |
| `livre.categories[].nom` | string | — |
| `score` | number | — |
| `raison` | SAME_GENRE | SAME_AUTHOR | POPULAR | TRENDING | — |
| `raison_libelle` | string | — |
| `contexte` | object | — |
| `vu` | boolean | — |
| `clique` | boolean | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "livre": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "titre": "string",
    "couverture_url": {},
    "type_livre": "INTERNE",
    "note_moyenne": {},
    "nb_lectures": 1,
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
  },
  "score": 1,
  "raison": "SAME_GENRE",
  "raison_libelle": "string",
  "contexte": {},
  "vu": true,
  "clique": true
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /recommendations/{id}/dismiss`

**Résumé** : Ignorer une recommandation

Masque la suggestion sans la marquer comme lue. **Frontend** : bouton « Pas intéressé ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la recommandation (`recommandation.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `dismissed` | number | — |

**Exemple de réponse**

```json
{
  "dismissed": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /recommendations/{id}/interact`

**Résumé** : Enregistrer une interaction

Actions : clic, ajout bibliothèque, lecture… Alimente le modèle de reco. **Frontend** : tracking analytics + POST.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la recommandation (`recommandation.id`). |

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `vu` | Non | boolean | Marquer la recommandation comme vue (feed « non lues »). | — |
| `clique` | Non | boolean | Enregistrer un clic (navigation vers le livre). | — |

**Exemple de requête**

```json
{
  "vu": true,
  "clique": true
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `livre` | RecommandationLivreSchema | — |
| `livre.id` | string (uuid) | — |
| `livre.titre` | string | — |
| `livre.couverture_url` | object | — |
| `livre.type_livre` | INTERNE | EXTERNE | — |
| `livre.note_moyenne` | object | — |
| `livre.nb_lectures` | number | — |
| `livre.auteurs` | array<AuteurBriefSchema> | — |
| `livre.auteurs[].id` | string (uuid) | — |
| `livre.auteurs[].nom` | string | — |
| `livre.auteurs[].prenom` | string | — |
| `livre.categories` | array<CategorieBriefSchema> | — |
| `livre.categories[].id` | string (uuid) | — |
| `livre.categories[].nom` | string | — |
| `score` | number | — |
| `raison` | SAME_GENRE | SAME_AUTHOR | POPULAR | TRENDING | — |
| `raison_libelle` | string | — |
| `contexte` | object | — |
| `vu` | boolean | — |
| `clique` | boolean | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "livre": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "titre": "string",
    "couverture_url": {},
    "type_livre": "INTERNE",
    "note_moyenne": {},
    "nb_lectures": 1,
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
  },
  "score": 1,
  "raison": "SAME_GENRE",
  "raison_libelle": "string",
  "contexte": {},
  "vu": true,
  "clique": true
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /recommendations/by-reason`

**Résumé** : Recommandations groupées par raison

Sections du type « Parce que vous avez lu X », « Populaire dans votre bibliothèque ». **Frontend** : blocs horizontaux par catégorie de raison.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `groups` | object | — |

**Exemple de réponse**

```json
{
  "groups": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /recommendations/for-book/{livreId}`

**Résumé** : Recommandations liées à un livre

Alternative à `GET /books/:id/similar` côté moteur reco (peut inclure signaux comportementaux). **Frontend** : section reco sur fiche livre si vous préférez le moteur unifié.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `livreId` | path | **Oui** | string (uuid) | Identifiant UUID du livre source. |
| `limit` | query | Non | number | Nombre de livres similaires à retourner (défaut : 12, max : 30). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<RecommandationSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].livre` | RecommandationLivreSchema | — |
| `data[].livre.id` | string (uuid) | — |
| `data[].livre.titre` | string | — |
| `data[].livre.couverture_url` | object | — |
| `data[].livre.type_livre` | INTERNE | EXTERNE | — |
| `data[].livre.note_moyenne` | object | — |
| `data[].livre.nb_lectures` | number | — |
| `data[].livre.auteurs` | array<AuteurBriefSchema> | — |
| `data[].livre.auteurs[].id` | string (uuid) | — |
| `data[].livre.auteurs[].nom` | string | — |
| `data[].livre.auteurs[].prenom` | string | — |
| `data[].livre.categories` | array<CategorieBriefSchema> | — |
| `data[].livre.categories[].id` | string (uuid) | — |
| `data[].livre.categories[].nom` | string | — |
| `data[].score` | number | — |
| `data[].raison` | SAME_GENRE | SAME_AUTHOR | POPULAR | TRENDING | — |
| `data[].raison_libelle` | string | — |
| `data[].contexte` | object | — |
| `data[].vu` | boolean | — |
| `data[].clique` | boolean | — |
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
      "livre": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "titre": "string",
        "couverture_url": {},
        "type_livre": "INTERNE",
        "note_moyenne": {},
        "nb_lectures": 1,
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
      },
      "score": 1,
      "raison": "SAME_GENRE",
      "raison_libelle": "string",
      "contexte": {},
      "vu": true,
      "clique": true
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /recommendations/mark-all-seen`

**Résumé** : Marquer toutes les recommandations comme vues

Remet les compteurs « non vues » à zéro. **Frontend** : action « Tout marquer comme lu ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `updated` | number | — |

**Exemple de réponse**

```json
{
  "updated": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /recommendations/picks`

**Résumé** : Sélection éditoriale (top picks)

Sous-ensemble mis en avant (limite configurable). **Frontend** : hero carousel accueil.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `limit` | query | Non | number | Nombre de « top picks » (défaut : 10, max : 30). |

**Réponses**

#### HTTP 200

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /recommendations/refresh`

**Résumé** : Régénérer les recommandations

Force un recalcul (avec garde-fous anti-spam). **Frontend** : pull-to-refresh sur le feed reco.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Body** (JSON requis)

| Champ | Obligatoire | Type | Description | Exemple |
|-------|:-----------:|------|-------------|--------|
| `limit` | Non | number | Nombre de nouvelles recommandations à générer (5–100 ; défaut côté service si omis). | — |

**Exemple de requête**

```json
{
  "limit": 5
}
```

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `upserted` | number | — |
| `summary` | object | — |

**Exemple de réponse**

```json
{
  "upserted": 1,
  "summary": {}
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /recommendations/summary`

**Résumé** : Résumé des recommandations

Compteurs (nouvelles, non vues) pour badge notification. **Frontend** : pastille sur l’icône découvrir.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `total` | number | — |
| `non_vues` | number | — |

**Exemple de réponse**

```json
{
  "total": 1,
  "non_vues": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### Tag Swagger : Notifications

### `GET /notifications`

**Résumé** : Liste des notifications

Notifications in-app : défis, abonnement, recommandations, badges… Filtre `unread_only` disponible. **Frontend** : centre de notifications, badge compteur.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `lu` | query | Non | boolean | `true` = lues uniquement ; `false` = non lues. |
| `type` | query | Non | BADGE | DEFI | ABONNEMENT | SYSTEME | Filtrer par type : défi, abonnement, recommandation… |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<NotificationSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].contenu` | string | — |
| `data[].type` | string | — |
| `data[].lu` | boolean | — |
| `data[].createdAt` | string (date-time) | — |
| `meta` | PaginationMetaSchema | — |
| `meta.page` | number | Page courante (base 1). |
| `meta.limit` | number | Nombre d’éléments par page. |
| `meta.total` | number | Nombre total d’éléments correspondant aux filtres. |
| `meta.total_pages` | number | Nombre total de pages. |
| `unread_count` | number | — |

**Exemple de réponse**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "contenu": "string",
      "type": "string",
      "lu": true,
      "createdAt": "2024-06-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "total_pages": 8
  },
  "unread_count": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /notifications/{id}/read`

**Résumé** : Marquer une notification comme lue

Cible une notification par ID. **Frontend** : au tap sur une notification.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID de la notification. |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `titre` | string | — |
| `contenu` | string | — |
| `type` | string | — |
| `lu` | boolean | — |
| `createdAt` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "titre": "string",
  "contenu": "string",
  "type": "string",
  "lu": true,
  "createdAt": "2024-06-15T10:30:00.000Z"
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `PATCH /notifications/read-all`

**Résumé** : Tout marquer comme lu

Passe toutes les notifications en lu. **Frontend** : bouton « Tout marquer lu ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `updated` | number | — |

**Exemple de réponse**

```json
{
  "updated": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---


## Étape 9 — Gamification — défis & badges

**Workflow frontend**

`GET /gamification/overview` pour un hub. `POST /challenges/:id/join` pour participer.

### Tag Swagger : Défis & challenges

### `GET /challenges`

**Résumé** : Défis actifs disponibles

Liste des challenges en cours avec possibilité de filtrer. Indique si l’utilisateur a déjà rejoint. **Frontend** : page « Défis » / liste des missions.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `type` | query | Non | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | Type de défi (lecture, social, etc.). |
| `categorie_id` | query | Non | string (uuid) | Filtrer les défis liés à une catégorie. |
| `auteur_id` | query | Non | string (uuid) | Filtrer les défis liés à un auteur. |
| `livre_id` | query | Non | string (uuid) | Filtrer les défis liés à un livre précis. |
| `inscrit` | query | Non | boolean | `true` = seulement ceux où l’utilisateur est inscrit ; `false` = non inscrits. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 20, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ChallengeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].description` | object | — |
| `data[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `data[].objectif_valeur` | number | — |
| `data[].points_bonus` | number | — |
| `data[].date_debut` | string (date-time) | — |
| `data[].date_fin` | string (date-time) | — |
| `data[].badge` | BadgeSummarySchema | — |
| `data[].badge.id` | string (uuid) | — |
| `data[].badge.nom` | string | — |
| `data[].badge.icone` | string | — |
| `data[].badge.couleur` | string | — |
| `data[].badge.points` | number | — |
| `data[].ma_participation` | ChallengeParticipationBriefSchema | — |
| `data[].ma_participation.progression` | number | — |
| `data[].ma_participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
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
      "description": {},
      "type": "NB_LIVRES",
      "objectif_valeur": 1,
      "points_bonus": 1,
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "badge": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nom": "string",
        "icone": "string",
        "couleur": "string",
        "points": 1
      },
      "ma_participation": {
        "progression": 1,
        "statut": "EN_COURS"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /challenges/{id}`

**Résumé** : Détail d’un défi

Règles, livres éligibles, dates, récompenses (points, badge). **Frontend** : écran détail avant « Rejoindre ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du défi (`defi.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `titre` | string | — |
| `description` | object | — |
| `type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `objectif_valeur` | number | — |
| `points_bonus` | number | — |
| `date_debut` | string (date-time) | — |
| `date_fin` | string (date-time) | — |
| `badge` | BadgeSummarySchema | — |
| `badge.id` | string (uuid) | — |
| `badge.nom` | string | — |
| `badge.icone` | string | — |
| `badge.couleur` | string | — |
| `badge.points` | number | — |
| `categorie` | CategorieBriefSchema | — |
| `categorie.id` | string (uuid) | — |
| `categorie.nom` | string | — |
| `auteur` | AuteurBriefSchema | — |
| `auteur.id` | string (uuid) | — |
| `auteur.nom` | string | — |
| `auteur.prenom` | string | — |
| `livre` | object | — |
| `ma_participation` | ChallengeParticipationSchema | — |
| `ma_participation.progression` | number | — |
| `ma_participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
| `ma_participation.date_completion` | object (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "titre": "string",
  "description": {},
  "type": "NB_LIVRES",
  "objectif_valeur": 1,
  "points_bonus": 1,
  "date_debut": "2024-06-15T10:30:00.000Z",
  "date_fin": "2024-06-15T10:30:00.000Z",
  "badge": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "string",
    "icone": "string",
    "couleur": "string",
    "points": 1
  },
  "categorie": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "string"
  },
  "auteur": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "string",
    "prenom": "string"
  },
  "livre": {},
  "ma_participation": {
    "progression": 1,
    "statut": "EN_COURS",
    "date_completion": {}
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `POST /challenges/{id}/join`

**Résumé** : Rejoindre un défi

Inscrit l’utilisateur à la participation. Idempotent si déjà inscrit. **Frontend** : bouton « Participer ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du défi (`defi.id`). |

**Réponses**

#### HTTP 201

| Champ | Type | Description |
|-------|------|-------------|
| `defi_id` | string (uuid) | — |
| `statut` | EN_COURS | COMPLETE | ECHOUE | — |
| `progression` | number | — |

**Exemple de réponse**

```json
{
  "defi_id": "550e8400-e29b-41d4-a716-446655440000",
  "statut": "EN_COURS",
  "progression": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `DELETE /challenges/{id}/join`

**Résumé** : Quitter un défi (sans progression)

Supprime la participation uniquement si `progression = 0` et statut `EN_COURS`. **Frontend** : bouton « Se désinscrire » avant d’avoir commencé.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du défi (`defi.id`). |

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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /challenges/{id}/progress`

**Résumé** : Ma progression sur un défi

Jalons, pourcentage, récompenses à venir. **Frontend** : barre de progression détail défi.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du défi (`defi.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `defi_id` | string (uuid) | — |
| `titre` | string | — |
| `type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `objectif_valeur` | number | — |
| `date_fin` | string (date-time) | — |
| `jours_restants` | number | — |
| `inscrit` | boolean | — |
| `participation` | ChallengeParticipationSchema | — |
| `participation.progression` | number | — |
| `participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
| `participation.date_completion` | object (date-time) | — |
| `pourcentage` | number | — |
| `prochaine_action` | ChallengeProgressActionSchema | — |
| `prochaine_action.code` | string | — |
| `prochaine_action.message` | string | — |
| `prochaine_action.cible` | ChallengeProgressActionCibleSchema | — |
| `prochaine_action.cible.type` | string | — |
| `prochaine_action.cible.id` | string | — |
| `badge` | BadgeSummarySchema | — |
| `badge.id` | string (uuid) | — |
| `badge.nom` | string | — |
| `badge.icone` | string | — |
| `badge.couleur` | string | — |
| `badge.points` | number | — |

**Exemple de réponse**

```json
{
  "defi_id": "550e8400-e29b-41d4-a716-446655440000",
  "titre": "string",
  "type": "NB_LIVRES",
  "objectif_valeur": 1,
  "date_fin": "2024-06-15T10:30:00.000Z",
  "jours_restants": 1,
  "inscrit": true,
  "participation": {
    "progression": 1,
    "statut": "EN_COURS",
    "date_completion": {}
  },
  "pourcentage": 1,
  "prochaine_action": {
    "code": "string",
    "message": "string",
    "cible": {
      "type": "string",
      "id": "string"
    }
  },
  "badge": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "string",
    "icone": "string",
    "couleur": "string",
    "points": 1
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /challenges/{id}/stats`

**Résumé** : Statistiques globales d’un défi

Nombre de participants, taux de réussite, etc. **Frontend** : social proof sur la fiche défi.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du défi (`defi.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `defi_id` | string (uuid) | — |
| `nb_participants` | number | — |
| `nb_completions` | number | — |
| `taux_completion` | number | — |

**Exemple de réponse**

```json
{
  "defi_id": "550e8400-e29b-41d4-a716-446655440000",
  "nb_participants": 1,
  "nb_completions": 1,
  "taux_completion": 1
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /challenges/expiring`

**Résumé** : Défis qui expirent bientôt

Filtre par date de fin proche pour créer l’urgence. **Frontend** : bandeau « Dernière chance ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `days` | query | Non | number | Fenêtre en jours pour considérer un défi comme « expire bientôt » (défaut : 7, max : 90). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ChallengeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].description` | object | — |
| `data[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `data[].objectif_valeur` | number | — |
| `data[].points_bonus` | number | — |
| `data[].date_debut` | string (date-time) | — |
| `data[].date_fin` | string (date-time) | — |
| `data[].badge` | BadgeSummarySchema | — |
| `data[].badge.id` | string (uuid) | — |
| `data[].badge.nom` | string | — |
| `data[].badge.icone` | string | — |
| `data[].badge.couleur` | string | — |
| `data[].badge.points` | number | — |
| `data[].ma_participation` | ChallengeParticipationBriefSchema | — |
| `data[].ma_participation.progression` | number | — |
| `data[].ma_participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
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
      "description": {},
      "type": "NB_LIVRES",
      "objectif_valeur": 1,
      "points_bonus": 1,
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "badge": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nom": "string",
        "icone": "string",
        "couleur": "string",
        "points": 1
      },
      "ma_participation": {
        "progression": 1,
        "statut": "EN_COURS"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /challenges/recommended`

**Résumé** : Défis recommandés pour l’utilisateur

Sélection personnalisée selon historique de lecture et niveau. **Frontend** : carrousel « Pour vous ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `limit` | query | Non | number | Nombre de défis recommandés à retourner (défaut : 5, max : 20). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<ChallengeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].titre` | string | — |
| `data[].description` | object | — |
| `data[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `data[].objectif_valeur` | number | — |
| `data[].points_bonus` | number | — |
| `data[].date_debut` | string (date-time) | — |
| `data[].date_fin` | string (date-time) | — |
| `data[].badge` | BadgeSummarySchema | — |
| `data[].badge.id` | string (uuid) | — |
| `data[].badge.nom` | string | — |
| `data[].badge.icone` | string | — |
| `data[].badge.couleur` | string | — |
| `data[].badge.points` | number | — |
| `data[].ma_participation` | ChallengeParticipationBriefSchema | — |
| `data[].ma_participation.progression` | number | — |
| `data[].ma_participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
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
      "description": {},
      "type": "NB_LIVRES",
      "objectif_valeur": 1,
      "points_bonus": 1,
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "badge": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nom": "string",
        "icone": "string",
        "couleur": "string",
        "points": 1
      },
      "ma_participation": {
        "progression": 1,
        "statut": "EN_COURS"
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### Tag Swagger : Badges

### `GET /badges`

**Résumé** : Catalogue des badges

Tous les badges avec statut débloqué / verrouillé pour l’utilisateur. Filtres optionnels. **Frontend** : galerie complète des succès.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `obtenu` | query | Non | boolean | `true` = badges obtenus ; `false` = encore verrouillés. |
| `page` | query | Non | number | Page (défaut : 1). |
| `limit` | query | Non | number | Limite (défaut : 50, max : 100). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `data` | array<BadgeListItemSchema> | — |
| `data[].id` | string (uuid) | — |
| `data[].nom` | string | — |
| `data[].icone` | string | — |
| `data[].couleur` | string | — |
| `data[].points` | number | — |
| `data[].description` | object | — |
| `data[].obtenu` | boolean | — |
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
      "points": 1,
      "description": {},
      "obtenu": true
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

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /badges/{id}`

**Résumé** : Détail d’un badge

Description, icône, conditions, date d’obtention si déjà gagné. **Frontend** : modal badge.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du badge (`badge.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (uuid) | — |
| `nom` | string | — |
| `icone` | string | — |
| `couleur` | string | — |
| `points` | number | — |
| `description` | object | — |
| `obtenu` | boolean | — |
| `obtenu_le` | object (date-time) | — |
| `defis_actifs` | array<BadgeDetailDefiActifSchema> | — |
| `defis_actifs[].id` | string (uuid) | — |
| `defis_actifs[].titre` | string | — |
| `defis_actifs[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `defis_actifs[].objectif_valeur` | number | — |
| `defis_actifs[].date_fin` | string (date-time) | — |

**Exemple de réponse**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "string",
  "icone": "string",
  "couleur": "string",
  "points": 1,
  "description": {},
  "obtenu": true,
  "obtenu_le": {},
  "defis_actifs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "type": "NB_LIVRES",
      "objectif_valeur": 1,
      "date_fin": "2024-06-15T10:30:00.000Z"
    }
  ]
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /badges/{id}/path`

**Résumé** : Parcours vers un badge

Étapes intermédiaires et progression pour un badge donné. **Frontend** : écran détail badge / arbre.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Paramètres**

| Nom | Emplacement | Obligatoire | Type | Description |
|-----|-------------|:-----------:|------|-------------|
| `id` | path | **Oui** | string (uuid) | Identifiant UUID du badge (`badge.id`). |

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `badge` | BadgeSummarySchema | — |
| `badge.id` | string (uuid) | — |
| `badge.nom` | string | — |
| `badge.icone` | string | — |
| `badge.couleur` | string | — |
| `badge.points` | number | — |
| `obtenu` | boolean | — |
| `obtenu_le` | object (date-time) | — |
| `defis` | array<BadgePathDefiSchema> | — |
| `defis[].id` | string (uuid) | — |
| `defis[].titre` | string | — |
| `defis[].statut_defi` | ACTIF | TERMINE | ANNULE | — |
| `defis[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `defis[].objectif_valeur` | number | — |
| `defis[].date_fin` | string (date-time) | — |
| `defis[].participation` | BadgePathParticipationSchema | — |
| `defis[].participation.progression` | number | — |
| `defis[].participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
| `defis[].participation.pourcentage` | number | — |
| `defis_completes_historique` | array<BadgePathHistoriqueSchema> | — |
| `defis_completes_historique[].defi_id` | string (uuid) | — |
| `defis_completes_historique[].titre` | string | — |
| `defis_completes_historique[].date_completion` | object (date-time) | — |

**Exemple de réponse**

```json
{
  "badge": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "string",
    "icone": "string",
    "couleur": "string",
    "points": 1
  },
  "obtenu": true,
  "obtenu_le": {},
  "defis": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "statut_defi": "ACTIF",
      "type": "NB_LIVRES",
      "objectif_valeur": 1,
      "date_fin": "2024-06-15T10:30:00.000Z",
      "participation": {
        "progression": 1,
        "statut": "EN_COURS",
        "pourcentage": 1
      }
    }
  ],
  "defis_completes_historique": [
    {
      "defi_id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "date_completion": {}
    }
  ]
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### `GET /badges/next`

**Résumé** : Prochain badge à débloquer

Badge le plus proche selon la progression actuelle. **Frontend** : widget motivation « Plus que X pages ».

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `prochain` | BadgeNextItemSchema | — |
| `prochain.badge` | BadgeSummarySchema | — |
| `prochain.badge.id` | string (uuid) | — |
| `prochain.badge.nom` | string | — |
| `prochain.badge.icone` | string | — |
| `prochain.badge.couleur` | string | — |
| `prochain.badge.points` | number | — |
| `prochain.defi` | BadgeNextDefiBriefSchema | — |
| `prochain.defi.id` | string (uuid) | — |
| `prochain.defi.titre` | string | — |
| `prochain.pourcentage` | number | — |
| `prochain.progression` | number | — |
| `prochain.objectif_valeur` | number | — |
| `prochain.message` | string | — |

**Exemple de réponse**

```json
{
  "prochain": {
    "badge": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "icone": "string",
      "couleur": "string",
      "points": 1
    },
    "defi": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string"
    },
    "pourcentage": 1,
    "progression": 1,
    "objectif_valeur": 1,
    "message": "string"
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---

### Tag Swagger : Gamification

### `GET /gamification/overview`

**Résumé** : Vue d’ensemble gamification

Agrège points, rang, défis actifs, derniers badges et prochain objectif en un seul payload. **Frontend** : onglet « Récompenses » ou section home gamifiée — préférer cet endpoint à plusieurs appels.

**Authentification** : **JWT** — `Authorization: Bearer <access_token>` (compte **ACTIF**)

**Réponses**

#### HTTP 200

| Champ | Type | Description |
|-------|------|-------------|
| `points` | number | — |
| `defis_actifs` | array<ChallengeListItemSchema> | — |
| `defis_actifs[].id` | string (uuid) | — |
| `defis_actifs[].titre` | string | — |
| `defis_actifs[].description` | object | — |
| `defis_actifs[].type` | NB_LIVRES | DUREE_LECTURE | CATEGORIE | AUTEUR | LIVRE_SPECIFIQUE | — |
| `defis_actifs[].objectif_valeur` | number | — |
| `defis_actifs[].points_bonus` | number | — |
| `defis_actifs[].date_debut` | string (date-time) | — |
| `defis_actifs[].date_fin` | string (date-time) | — |
| `defis_actifs[].badge` | BadgeSummarySchema | — |
| `defis_actifs[].badge.id` | string (uuid) | — |
| `defis_actifs[].badge.nom` | string | — |
| `defis_actifs[].badge.icone` | string | — |
| `defis_actifs[].badge.couleur` | string | — |
| `defis_actifs[].badge.points` | number | — |
| `defis_actifs[].ma_participation` | ChallengeParticipationBriefSchema | — |
| `defis_actifs[].ma_participation.progression` | number | — |
| `defis_actifs[].ma_participation.statut` | EN_COURS | COMPLETE | ECHOUE | — |
| `badges_recents` | array<BadgeSummarySchema> | — |
| `badges_recents[].id` | string (uuid) | — |
| `badges_recents[].nom` | string | — |
| `badges_recents[].icone` | string | — |
| `badges_recents[].couleur` | string | — |
| `badges_recents[].points` | number | — |
| `prochain_badge` | BadgeSummarySchema | — |
| `prochain_badge.id` | string (uuid) | — |
| `prochain_badge.nom` | string | — |
| `prochain_badge.icone` | string | — |
| `prochain_badge.couleur` | string | — |
| `prochain_badge.points` | number | — |

**Exemple de réponse**

```json
{
  "points": 1,
  "defis_actifs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titre": "string",
      "description": {},
      "type": "NB_LIVRES",
      "objectif_valeur": 1,
      "points_bonus": 1,
      "date_debut": "2024-06-15T10:30:00.000Z",
      "date_fin": "2024-06-15T10:30:00.000Z",
      "badge": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nom": "string",
        "icone": "string",
        "couleur": "string",
        "points": 1
      },
      "ma_participation": {
        "progression": 1,
        "statut": "EN_COURS"
      }
    }
  ],
  "badges_recents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "string",
      "icone": "string",
      "couleur": "string",
      "points": 1
    }
  ],
  "prochain_badge": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "string",
    "icone": "string",
    "couleur": "string",
    "points": 1
  }
}
```

#### HTTP 401 — JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.

Erreur NestJS standard :

```json
{
  "statusCode": 401,
  "message": "JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.",
  "error": "Error"
}
```

#### HTTP 403 — Compte banni ou statut non autorisé pour cette ressource.

Erreur NestJS standard :

```json
{
  "statusCode": 403,
  "message": "Compte banni ou statut non autorisé pour cette ressource.",
  "error": "Error"
}
```

---


## Étape 10 — Administration — `/admin/*`

**Workflow frontend**

Back-office uniquement (JWT rôle `ADMIN`). Non requis pour l’app mobile/web grand public.

### Tag Swagger : Admin — Utilisateurs

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

### Tag Swagger : Admin — Livres

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

### Tag Swagger : Admin — Bibliothèques

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

### Tag Swagger : Admin — Auteurs

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

### Tag Swagger : Admin — Catégories

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

### Tag Swagger : Admin — Plans

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

### Tag Swagger : Admin — Défis

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

### Tag Swagger : Admin — Badges

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

### Tag Swagger : Admin — Modération & abonnements

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

### Tag Swagger : Admin — Statistiques

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

*Document généré automatiquement — 156 opérations documentées.*
*OpenAPI : `docs/openapi.json` · Swagger UI : `/api/docs`*
