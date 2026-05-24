import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { SWAGGER_BEARER_AUTH, SWAGGER_TAGS } from './constants';

function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('BiblioTech API')
    .setDescription(
      [
        'API REST **BiblioTech v2** — plateforme de lecture numérique avec abonnements, bibliothèques thématiques, gamification et recommandations.',
        '',
        '## Par où commencer (frontend)',
        '',
        '1. **Authentification** (`/auth`) — inscription OTP ou mot de passe, connexion, refresh token.',
        '2. **Profil** (`/me`) — données utilisateur, tableau de bord, progression.',
        '3. **Bibliothèques** (`/libraries`) — navigation par collection éditoriale.',
        '4. **Catalogue** (`/books`) — liste, fiche livre, accès streaming/téléchargement.',
        '5. **Abonnement** (`/plans`, `/subscriptions`, `/payments`) — offres et paiement PawaPay (Mobile Money).',
        '6. **Découverte** (`/search`, `/recommendations`, `/notifications`) — recherche et suggestions.',
        '7. **Gamification** (`/challenges`, `/badges`, `/gamification`) — défis et récompenses.',
        '',
        '## Authentification',
        '',
        'La plupart des routes exigent un **Bearer JWT** (`access_token` renvoyé après login/OTP).',
        'Cliquez sur **Authorize** et collez : `Bearer <access_token>` ou seulement le token selon l’UI.',
        '',
        'Le `refresh_token` sert uniquement à `POST /auth/token/refresh` et `POST /auth/logout`.',
        '',
        '## Guards (comportement réel)',
        '',
        '| Guard | Effet |',
        '|-------|--------|',
        '| Aucun | Route publique |',
        '| `JwtAuthGuard` | JWT + compte **ACTIF** |',
        '| `JwtAuthenticatedGuard` | JWT valide (PENDING accepté) |',
        '| `ActiveAccountGuard` | Compte **ACTIF** (utilisé avec JWT sur paiements) |',
        '',
        '## Pagination',
        '',
        'Les listes paginées acceptent `page` (défaut 1) et `limit` (défaut 20, max 100) et renvoient un objet `meta` avec `total` et `total_pages`.',
        '',
        '## Flux lecture d’un livre',
        '',
        '1. `GET /books/:id` — fiche et métadonnées.',
        '2. `GET /books/:id/access/check` — vérifier éligibilité (abonnement, quota).',
        '3. `POST /books/:id/access?type=STREAM|DOWNLOAD` — obtenir un jeton d’accès temporaire.',
        '4. `GET /books/:id/stream?token=...` — redirection 302 vers le fichier (ou `validate=true` pour tester le token).',
        '5. `PATCH /books/:id/progress` — synchroniser la page courante.',
      ].join('\n'),
    )
    .setVersion('2.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access token JWT (header `Authorization: Bearer <access_token>`). Obtenu via OTP, mot de passe ou Google.',
      },
      SWAGGER_BEARER_AUTH,
    )
    .addTag(
      SWAGGER_TAGS.AUTH,
      'Inscription, connexion OTP/mot de passe/Google, refresh et déconnexion.',
    )
    .addTag(
      SWAGGER_TAGS.PROFILE,
      'Espace personnel connecté : profil, stats, badges, défis en cours.',
    )
    .addTag(
      SWAGGER_TAGS.LIBRARIES,
      'Bibliothèques éditoriales (collections) et leurs livres.',
    )
    .addTag(
      SWAGGER_TAGS.BOOKS,
      'Catalogue, accès aux fichiers, progression, commentaires et notes.',
    )
    .addTag(
      SWAGGER_TAGS.PLANS,
      'Offres d’abonnement publiques (sans authentification).',
    )
    .addTag(
      SWAGGER_TAGS.SUBSCRIPTIONS,
      'Abonnement courant, historique et comparaison de plans.',
    )
    .addTag(
      SWAGGER_TAGS.PAYMENTS,
      'Initiation de paiement PawaPay (Mobile Money), statut, webhooks dépôts.',
    )
    .addTag(
      SWAGGER_TAGS.CHALLENGES,
      'Défis de lecture : liste, détail, participation.',
    )
    .addTag(SWAGGER_TAGS.BADGES, 'Badges débloqués et progression vers le prochain.')
    .addTag(
      SWAGGER_TAGS.GAMIFICATION,
      'Vue agrégée points / défis / badges pour l’écran d’accueil.',
    )
    .addTag(
      SWAGGER_TAGS.RECOMMENDATIONS,
      'Suggestions personnalisées et interactions (vu, ignoré).',
    )
    .addTag(SWAGGER_TAGS.SEARCH, 'Recherche full-text et historique des requêtes.')
    .addTag(
      SWAGGER_TAGS.NOTIFICATIONS,
      'Notifications in-app (défis, abonnement, recommandations…).',
    )
    .addTag(SWAGGER_TAGS.APP, 'Santé et endpoints utilitaires.')
    .addTag(
      SWAGGER_TAGS.ADMIN_USERS,
      'Back-office : gestion des comptes utilisateurs (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_BOOKS,
      'Back-office : CRUD livres, catégories, auteurs, archivage (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_LIBRARIES,
      'Back-office : CRUD bibliothèques, archivage, association livres (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_AUTEURS,
      'Back-office : CRUD auteurs, soft delete (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_CATEGORIES,
      'Back-office : CRUD catégories, soft delete (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_PLANS,
      'Back-office : CRUD plans d’abonnement (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_CHALLENGES,
      'Back-office : CRUD défis, annulation, participants (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_BADGES,
      'Back-office : CRUD badges (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_MODERATION,
      'Back-office : modération commentaires, abonnements, paiements (JWT ADMIN uniquement).',
    )
    .addTag(
      SWAGGER_TAGS.ADMIN_STATS,
      'Back-office : dashboard et analytics (JWT ADMIN uniquement).',
    )
    .build();
}

/** Document OpenAPI (même contenu que Swagger UI `/api/docs`). */
export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildSwaggerConfig(), {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
}

export function setupSwagger(app: INestApplication): void {
  const document = createSwaggerDocument(app);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'BiblioTech API — Documentation',
  });
}
