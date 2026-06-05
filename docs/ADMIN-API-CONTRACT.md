# BiblioTech API — Contrat admin (envoi / réception)

> **Référence back-office** avant intégration du dashboard admin (`apps/web`).  
> Généré depuis **OpenAPI** (`docs/openapi.json`) — **46 opérations** sous `/admin/*`.  
> Régénérer : `npm run docs:admin` (depuis `backend/`).  
> Inventaire des routes : [ADMIN-ROUTES-SWAGGER.md](./ADMIN-ROUTES-SWAGGER.md) · Swagger live : `http://localhost:3000/api/docs`

**Version API** : 2.0.0

---

## Authentification (toutes les routes admin)

| Élément | Valeur |
|---------|--------|
| Header | `Authorization: Bearer <access_token>` |
| Rôle | `ADMIN` (compte `ACTIF`) |
| Obtention du token | `POST /auth/password/login` avec un compte admin |
| Swagger UI | Bouton **Authorize** → `Bearer <token>` |

Réponses d’échec communes : **401** (JWT invalide), **403** (non admin ou banni).

---

## Conventions

| Sujet | Détail |
|-------|--------|
| Base URL dev | `http://localhost:3000` (variable `PORT`) |
| Préfixe | `/admin/...` (pas de `/api/v1`) |
| Listes paginées | Query `page` (défaut 1), `limit` (défaut 20, max 100) |
| Enveloppe liste | `{ "data": [...], "meta": { "page", "limit", "total", "total_pages" } }` |
| JSON | `Content-Type: application/json` |
| Uploads | `multipart/form-data` — livres (`file`, `couverture`), badges (`icone`) |

### Erreur HTTP standard (NestJS)

```json
{
  "statusCode": 400,
  "message": "Message en français",
  "error": "Bad Request"
}
```

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

## Workflow back-office

Intégrer **partie par partie** dans `apps/web` (voir [ADMIN-INTEGRATION.md](../../apps/web/docs/ADMIN-INTEGRATION.md)).

| Partie | Document | Opérations | Intégration web |
|--------|----------|:----------:|------------------|
| 1 | [PARTIE-1-REFERENTIELS.md](./admin/PARTIE-1-REFERENTIELS.md) | 8 | **Terminée** (catégories + auteurs) |
| 2 | [PARTIE-2-CATALOGUE.md](./admin/PARTIE-2-CATALOGUE.md) | 12 | À faire |
| 3 | [PARTIE-3-UTILISATEURS-MODERATION.md](./admin/PARTIE-3-UTILISATEURS-MODERATION.md) | 11 | À faire |
| 4 | [PARTIE-4-MONETISATION-GAMIFICATION-STATS.md](./admin/PARTIE-4-MONETISATION-GAMIFICATION-STATS.md) | 15 | À faire |

---

*Index généré — 46 opérations admin au total.*
*OpenAPI : `docs/openapi.json` · Swagger : `/api/docs`*
