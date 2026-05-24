# Guide — Tests Postman BiblioTech (collection complète)

Fichier à importer : **`BiblioTech-Complet-Tests.postman_collection.json`**

---

## 1. Préparation (une seule fois)

### 1.1 Démarrer le backend

```bash
npm install
cp .env.example .env
# Éditer DATABASE_URL, JWT_SECRET, OTP_HMAC_SECRET au minimum
npm run db:sync
npm run db:seed
npm run start:dev
```

Vérifier : navigateur ou Postman → `GET http://localhost:3000/health` → `"database": "up"`.

### 1.2 Variables `.env` pour les tests (PawaPay — intégration réelle)

```env
PAYMENT_PROVIDER=pawapay
PAWAPAY_MODE=sandbox
PAWAPAY_API_TOKEN=<token dashboard PawaPay>
PAWAPAY_PUBLIC_BASE_URL=https://VOTRE-ID.ngrok-free.app
PAYMENT_PUBLIC_BASE_URL=https://VOTRE-ID.ngrok-free.app
CORS_ORIGINS=http://localhost:3000
```

Lancer **ngrok** : `ngrok http 3000` → copier l’URL HTTPS dans Postman (`publicBaseUrl`) **et** dans `.env`.

Dashboard PawaPay → Callback **Deposits** : `{publicBaseUrl}/api/webhooks/pawapay/deposits`

> Le **mock** (`PAYMENT_PROVIDER=mock`) reste disponible dans le dossier **11** uniquement pour debug sans ngrok.

### 1.3 Comptes de test

**Utilisateur** (app mobile / lecteur) :

1. `POST /auth/register/password` avec `password@biblio.tech` / `MonMotDePasse123`
2. Récupérer le code OTP (email Resend **ou** logs console du serveur)
3. `POST /auth/otp/verify` → compte `ACTIF`

**Admin** (back-office) :

```sql
-- Après avoir créé admin@biblio.tech via register + OTP :
UPDATE auth SET role = 'ADMIN', statut = 'ACTIF', email_verified = true
WHERE email = 'admin@biblio.tech';
```

### 1.4 Importer dans Postman

1. Ouvrir Postman → **Import** → glisser `BiblioTech-Complet-Tests.postman_collection.json`
2. Clic sur la collection → onglet **Variables**
3. Vérifier `baseUrl` = `http://localhost:3000`
4. Ajuster `user_email`, `user_password`, `admin_email`, `admin_password` si besoin

---

## 2. Comment lire les résultats

| Code | Signification |
|------|----------------|
| **200 / 201** | OK — requête réussie |
| **400** | Données invalides (body, query) |
| **401** | JWT manquant ou expiré → relancer **Login utilisateur** |
| **403** | Compte non actif, pas d’abonnement, ou pas ADMIN |
| **404** | Ressource introuvable (mauvais UUID, email inconnu) |
| **502** | Service externe (Cloudinary, PawaPay…) mal configuré |

Les scripts **Tests** en vert = assertions automatiques passées.

---

## 3. Ordre recommandé (dossier par dossier)

### Dossier `00 — Prérequis` ★ COMMENCER ICI

| Requête | Attendu | Si échec |
|---------|---------|----------|
| GET /health | 200, `database: up` | PostgreSQL arrêté ou `DATABASE_URL` incorrect |
| GET / | 200, texte Hello | Serveur non démarré |
| Login utilisateur | 200 + `access_token` rempli | Créer le compte (dossier 01) ou mauvais mot de passe |
| Login admin | 200 + rôle ADMIN | Exécuter le SQL de promotion admin |
| GET /plans | 200 + `plan_id` auto | Lancer `npm run db:seed` |
| GET /books | 200 + `book_id` auto | Seed + login OK |
| GET /libraries | 200 + `library_id` auto | Idem |

**Astuce** : après ce dossier, les variables `access_token`, `book_id`, `plan_id` doivent être remplies (onglet Variables de la collection).

---

### Dossier `01 — Auth`

Teste **toutes** les routes d’authentification.

| Requête | Usage réel | Note test |
|---------|------------|-----------|
| register | Nouvel email OTP | 201 ou 409 si email existe |
| register/password | Inscription avec MDP | Idem |
| otp/request | Renvoyer code | 404 si email inconnu |
| otp/verify | Activer + tokens | Mettre le vrai `otp_code` dans les variables |
| password/login | Connexion classique | Remplit `access_token` |
| reset/request + confirm | Mot de passe oublié | Code OTP requis |
| token/refresh | Renouveler JWT | Nécessite `refresh_token` du login |
| logout | Déconnexion | Invalide le refresh |
| google / google/link | OAuth | Manuel — coller un vrai `id_token` |
| password/add, change | Gestion MDP | Compte connecté |

---

### Dossier `02 — Profil /me`

JWT utilisateur requis. Tester dans l’ordre :

1. `GET /me` — profil de base
2. `GET /me/dashboard` — agrégat home (le plus important pour le front)
3. `GET /me/reading`, `/activity`, `/completion`, `/actions`
4. `PATCH /me` — modification bio
5. Stats, badges, défis personnels
6. `POST /me/photo` — **sélectionner un fichier image** sur le champ `file` (Cloudinary requis)

---

### Dossier `03 — Bibliothèques`

Utilise `{{library_id}}` du dossier 00.

| Requête | Écran app |
|---------|-----------|
| summary | Bannière explorer |
| GET /libraries | Grille bibliothèques |
| GET /:id | Détail |
| stats, categories | Filtres |
| books/in-progress | Continuer la lecture |
| books | Catalogue du rayon |

---

### Dossier `04 — Livres & lecture` ★ CRITIQUE

**Prérequis** : abonnement actif (dossier 06 si 403 sur `/access`).

| Étape | Route | Attendu |
|-------|-------|---------|
| 1 | GET /books | Liste paginée |
| 2 | GET /books/:id | Fiche + bloc `acces` |
| 3 | GET .../access/check?type=LECTURE | `allowed: true` |
| 4 | POST .../access?type=LECTURE | `token` → sauvé dans `lecture_token` |
| 5 | GET .../stream?validate=true | JSON `valid: true` |
| 6 | PATCH .../progress | 200 |
| 7 | comments, rate | Social |

Types d’accès valides : **`LECTURE`** (stream) et **`TELECHARGEMENT`** (download).

---

### Dossier `05 — Plans & abonnements`

| Route | Public ? |
|-------|----------|
| GET /plans | Oui |
| GET /subscriptions/* | JWT utilisateur |

Si `current` est `null`, enchaîner avec le dossier **06**.

---

### Dossier `06 — Paiements PawaPay` ★ ABONNEMENT (intégration réelle)

Ordre **strict** :

1. `GET webhook deposits (ping ngrok)` → **200** (sinon ngrok / `publicBaseUrl` incorrect)
2. `checkout-preview?plan_id={{plan_id}}`
3. `POST /payments/init` (MTN ou Airtel) → `ref_transaction` + `deposit_id`
4. **Attendre 20–30 s** (callback sandbox PawaPay + réconciliation backend)
5. `GET /payments/status` → `statut: SUCCES`
6. `GET /subscriptions/current` → plan actif

Si le statut reste `EN_ATTENTE` : relancer **status**, ou **POST callback COMPLETED** (simulation manuelle).

Puis **retester** le dossier 04 (accès livre).

### Dossier `11 — Mock` (optionnel)

Seulement si `PAYMENT_PROVIDER=mock` dans `.env` — pas votre intégration prod.

---

### Dossier `07 — Découverte`

1. `POST /recommendations/refresh` — génère des suggestions (seed utilisateur aide)
2. `GET /recommendations` — remplit `recommendation_id`
3. interact, dismiss, mark-all-seen
4. `GET /search?q=SEED`
5. `GET /notifications` → `notification_id`

---

### Dossier `08 — Gamification`

1. `GET /gamification/overview`
2. `GET /challenges` → `challenge_id`
3. `POST .../join` puis `GET .../progress`
4. `GET /badges`, `/badges/next`

---

### Dossier `09 — Admin`

JWT **admin** (`admin_access_token`).

| Route | Rôle |
|-------|------|
| admin/users | Liste + ban (attention : ne pas bannir votre compte test) |
| admin/books, libraries, auteurs, categories | Lecture seule dans cette collection |
| admin/stats/* | Dashboard analytics |
| webhook pawapay ping | Vérifie que l’URL est joignable |

Pour **créer un livre** avec fichier : utiliser la collection séparée `BiblioTech-E2E-Admin-Lecture` ou `BiblioTech-Admin-Books-V2` (multipart).

---

### Dossier `10 — Parcours E2E`

**Collection Runner** : cocher uniquement ce dossier → Run.

Enchaîne : health → login → paiement mock → abonnement → accès livre → stream → dashboard.

C’est le **test de fumée** complet en ~10 requêtes.

---

## 4. Collection Runner (tout tester d’un coup)

1. Clic droit sur la collection → **Run collection**
2. Cocher les dossiers `00` à `10` (ou seulement `10` pour smoke test)
3. **Delay** : 200 ms entre requêtes
4. **Save responses** : activé pour déboguer
5. Run

Interprétation :

- **90 %+ passed** en dev normal = backend OK pour livraison frontend
- Échecs sur **google** = normal (token manuel)
- Échecs sur **photo** = Cloudinary non configuré
- Échecs sur **access** = pas d’abonnement → faire dossier 06 avant 04

---

## 5. Régénérer la collection

Si de nouveaux endpoints sont ajoutés au code :

```bash
node tools/generate-postman-full.mjs
```

Puis ré-importer le JSON dans Postman (ou remplacer la collection existante).

---

## 6. Dépannage rapide

| Problème | Solution |
|----------|----------|
| **401 Unauthorized** sur `/books`, `/me`, etc. | Le JWT n’est pas envoyé. Vérifier onglet **Authorization** → Type **Bearer Token** → Token = `{{access_token}}` (sans le mot `Bearer`). Relancer **Login utilisateur** puis la requête. `/books` utilise le token **utilisateur**, pas `admin_access_token`. |
| `access_token` vide | Dossier 00 → Login utilisateur |
| 403 sur /books/.../access | Dossier 06 paiement mock, puis 05 current |
| 403 sur /admin/* | Login admin + SQL role ADMIN |
| OTP invalide | Lire les logs serveur ou email ; mettre à jour `otp_code` |
| CORS en navigateur | `CORS_ORIGINS` avec l’URL du front |
| simulate 400 | `PAYMENT_PROVIDER` doit être `mock` |
| Variables UUID vides | Relancer dossier 00 |

---

*Guide associé à `BiblioTech-Complet-Tests.postman_collection.json` — 137 requêtes, 11 dossiers.*
