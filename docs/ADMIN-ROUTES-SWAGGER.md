# Routes admin exposées dans Swagger

Source : [`openapi.json`](./openapi.json) (généré depuis le code) et contrôleurs sous [`../src/admin/`](../src/admin/).

**Contrat envoi / réception** : index [**ADMIN-API-CONTRACT.md**](./ADMIN-API-CONTRACT.md) · **4 parties** : [admin/PARTIE-1-REFERENTIELS.md](./admin/PARTIE-1-REFERENTIELS.md) … — `npm run docs:admin`.

**Matrice d’intégration web** : [apps/web/docs/ADMIN-INTEGRATION.md](../../apps/web/docs/ADMIN-INTEGRATION.md).

**Consultation live** : `http://localhost:3000/api/docs` — filtrez par les tags commençant par **Admin —**.

**Régénération** : `npm run docs:admin` ou `npm run docs:openapi` (depuis `backend/`).

---

## Prérequis communs

- **Préfixe** : toutes les routes commencent par `/admin/...` (pas de préfixe global type `/api/v1`).
- **Auth Swagger** : décorateur `ApiJwtAdmin()` dans [`../src/common/swagger/decorators.ts`](../src/common/swagger/decorators.ts) — **Bearer JWT** + compte **ACTIF** + rôle **ADMIN**.
- Dans Swagger UI : bouton **Authorize** → `Bearer <access_token>` (token obtenu via `/auth` avec un compte admin).

## Synthèse

| Tag Swagger | Contrôleur | Opérations |
|-------------|------------|------------|
| Admin — Utilisateurs | [`users.controller.ts`](../src/admin/users/users.controller.ts) | 5 |
| Admin — Livres | [`admin-books.controller.ts`](../src/admin/books/admin-books.controller.ts) | 6 |
| Admin — Bibliothèques | [`admin-libraries.controller.ts`](../src/admin/libraries/admin-libraries.controller.ts) | 6 |
| Admin — Auteurs | [`admin-auteurs.controller.ts`](../src/admin/auteurs/admin-auteurs.controller.ts) | 4 |
| Admin — Catégories | [`admin-categories.controller.ts`](../src/admin/categories/admin-categories.controller.ts) | 4 |
| Admin — Plans | [`admin-plans.controller.ts`](../src/admin/plans/admin-plans.controller.ts) | 3 |
| Admin — Défis | [`admin-challenges.controller.ts`](../src/admin/challenges/admin-challenges.controller.ts) | 5 |
| Admin — Badges | [`admin-badges.controller.ts`](../src/admin/badges/admin-badges.controller.ts) | 3 |
| Admin — Modération & abonnements | comments, payments, subscriptions | 6 |
| Admin — Statistiques | [`admin-stats.controller.ts`](../src/admin/stats/admin-stats.controller.ts) | 4 |
| **Total** | 12 contrôleurs | **46** |

L’API expose **156 opérations HTTP** au total (135 chemins distincts), dont **46** réservées à l’admin.

---

## Admin — Utilisateurs (`/admin/users`)

| Méthode | Route | Usage |
|---------|-------|--------|
| GET | `/admin/users` | Liste paginée des utilisateurs |
| POST | `/admin/users` | Création d’un utilisateur |
| GET | `/admin/users/{id}` | Détail d’un utilisateur |
| PATCH | `/admin/users/{id}/ban` | Bannir |
| PATCH | `/admin/users/{id}/unban` | Débannir |

---

## Admin — Livres (`/admin/books`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/books` |
| POST | `/admin/books` |
| PATCH | `/admin/books/{id}` |
| PATCH | `/admin/books/{id}/archive` |
| POST | `/admin/books/{id}/authors` |
| POST | `/admin/books/{id}/categories` |

---

## Admin — Bibliothèques (`/admin/libraries`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/libraries` |
| POST | `/admin/libraries` |
| PATCH | `/admin/libraries/{id}` |
| PATCH | `/admin/libraries/{id}/archive` |
| POST | `/admin/libraries/{id}/books` |
| DELETE | `/admin/libraries/{bibId}/books/{bookId}` |

---

## Admin — Auteurs (`/admin/auteurs`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/auteurs` |
| POST | `/admin/auteurs` |
| PATCH | `/admin/auteurs/{id}` |
| DELETE | `/admin/auteurs/{id}` |

---

## Admin — Catégories (`/admin/categories`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/categories` |
| POST | `/admin/categories` |
| PATCH | `/admin/categories/{id}` |
| DELETE | `/admin/categories/{id}` |

---

## Admin — Plans (`/admin/plans`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/plans` |
| POST | `/admin/plans` |
| PATCH | `/admin/plans/{id}` |

---

## Admin — Défis (`/admin/challenges`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/challenges` |
| POST | `/admin/challenges` |
| PATCH | `/admin/challenges/{id}` |
| PATCH | `/admin/challenges/{id}/cancel` |
| GET | `/admin/challenges/{id}/participants` |

---

## Admin — Badges (`/admin/badges`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/badges` |
| POST | `/admin/badges` |
| PATCH | `/admin/badges/{id}` |

---

## Admin — Modération & abonnements

Regroupe 3 contrôleurs sous un même tag Swagger.

### Commentaires — [`admin-comments.controller.ts`](../src/admin/comments/admin-comments.controller.ts)

| Méthode | Route |
|---------|-------|
| GET | `/admin/comments` |
| PATCH | `/admin/comments/{id}/moderate` |
| DELETE | `/admin/comments/{id}` |

### Paiements — [`admin-payments.controller.ts`](../src/admin/payments/admin-payments.controller.ts)

| Méthode | Route |
|---------|-------|
| GET | `/admin/payments` |

### Abonnements — [`admin-subscriptions.controller.ts`](../src/admin/subscriptions/admin-subscriptions.controller.ts)

| Méthode | Route |
|---------|-------|
| GET | `/admin/subscriptions` |
| PATCH | `/admin/subscriptions/{id}/cancel` |

---

## Admin — Statistiques (`/admin/stats`)

| Méthode | Route |
|---------|-------|
| GET | `/admin/stats/dashboard` |
| GET | `/admin/stats/users` |
| GET | `/admin/stats/books` |
| GET | `/admin/stats/search-terms` |

---

## Hors périmètre admin

Les routes publiques ou utilisateur (`/auth`, `/me`, `/books`, `/libraries`, `/payments` côté client, webhooks PawaPay, etc.) sont documentées dans les autres tags Swagger et dans [API-REFERENCE.md](./API-REFERENCE.md) / [FRONTEND-API-README.md](./FRONTEND-API-README.md).

Pour le détail des body, query et response : chaque opération dans Swagger UI affiche les DTO exacts (fichiers `*.controller.docs.ts` à côté de chaque contrôleur admin).
