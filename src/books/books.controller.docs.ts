import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import {
  BookAccessCheckSchema,
  BookAccessTokenSchema,
  BookRatingResponseSchema,
  BookResourceInfoSchema,
  BookStreamValidateSchema,
  CommentSchema,
  LivreDetailSchema,
  PaginatedCommentSchema,
  PaginatedLivreCatalogSchema,
  PaginatedRecentAccessSchema,
  ProgressionSchema,
  ProgressionUpdateSchema,
} from '../common/swagger/schemas/books.schema';
import { PaginatedChallengeListSchema } from '../common/swagger/schemas/challenges.schema';
import { PaginatedLivreSearchSchema } from '../common/swagger/schemas/discovery.schema';

const bookIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID du livre (`livre.id`).',
  });

export const BooksControllerDocs = () => ApiJwtActiveAccount();

export const BooksListCatalogDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Catalogue paginé de livres',
      description:
        'Liste les livres accessibles selon l’abonnement et les filtres (`q`, `type_livre`, `categorie_id`, `bibliotheque_id`, etc.). ' +
        'Chaque item inclut métadonnées, note moyenne et indicateurs d’accès (`can_stream`, `can_download`). ' +
        '**Frontend** : page catalogue / grille, barre de recherche locale, filtres latéraux.',
    }),
    ApiOkResponse({ type: PaginatedLivreCatalogSchema }),
  );

export const BooksRecentAccessDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Livres récemment consultés',
      description:
        'Historique des accès (stream/download) de l’utilisateur, triés par date décroissante. ' +
        '**Frontend** : section « Reprendre la lecture » ou « Récemment ouverts ».',
    }),
    ApiOkResponse({ type: PaginatedRecentAccessSchema }),
  );

export const BooksResourceInfoDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Métadonnées des fichiers (audio / ebook)',
      description:
        'Retourne les URLs Cloudinary, durée, nombre de pages, formats disponibles **sans** consommer de quota d’accès. ' +
        '**Frontend** : afficher infos techniques sur la fiche livre avant lecture.',
    }),
    ApiOkResponse({ type: BookResourceInfoSchema }),
  );

export const BooksCheckAccessDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Vérifier si l’utilisateur peut accéder au livre',
      description:
        'Contrôle abonnement, plan, quotas et type d’accès demandé (`STREAM` ou `DOWNLOAD`) **sans** émettre de jeton. ' +
        '**Frontend** : avant d’afficher le bouton « Lire » / « Télécharger », ou pour expliquer un blocage (upgrade plan).',
    }),
    ApiOkResponse({ type: BookAccessCheckSchema }),
  );

export const BooksActiveAccessDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Récupérer un jeton d’accès encore valide',
      description:
        'Si un token non expiré existe déjà pour ce livre et ce type, le renvoie au lieu d’en créer un nouveau (économie de quota). ' +
        '**Frontend** : appeler avant `POST /access` pour éviter de consommer un nouvel accès.',
    }),
    ApiOkResponse({ type: BookAccessTokenSchema }),
  );

export const BooksGenerateAccessDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Générer un jeton d’accès (lecture ou téléchargement)',
      description:
        'Crée un `access_token` temporaire lié au livre. Paramètre query obligatoire : `type=STREAM|DOWNLOAD`. ' +
        'GET et POST sont équivalents. ' +
        '**Frontend** : après succès, ouvrir le lecteur avec `GET /books/:id/stream?token=...` ou déclencher le téléchargement.',
    }),
    ApiOkResponse({ type: BookAccessTokenSchema }),
  );

export const BooksStreamDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Stream ou redirection vers le fichier',
      description:
        'Avec `token` : redirection HTTP **302** vers Cloudinary (lecteur audio/PDF). ' +
        'Avec `validate=true` : réponse JSON confirmant la validité du token (tests / debug). ' +
        '**Frontend** : WebView, `<audio src>`, ou fetch avec redirect ; ne pas exposer le token dans les logs.',
    }),
    ApiFoundResponse({
      description: 'Redirection 302 vers l’URL du média (mode normal).',
    }),
    ApiOkResponse({ type: BookStreamValidateSchema }),
  );

export const BooksSimilarDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Livres similaires (même bibliothèque / catégories)',
      description:
        'Recommandations de proximité éditoriale pour la fiche livre. ' +
        '**Frontend** : carrousel « Vous aimerez aussi » sous le détail.',
    }),
    ApiOkResponse({ type: PaginatedLivreSearchSchema }),
  );

export const BooksChallengesDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Défis associés à ce livre',
      description:
        'Défis actifs dont la progression peut être alimentée par la lecture de ce titre. ' +
        '**Frontend** : encart gamification sur la fiche livre.',
    }),
    ApiOkResponse({ type: PaginatedChallengeListSchema }),
  );

export const BooksGetProgressDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Progression de lecture',
      description:
        'Page courante, pourcentage, statut (en cours / terminé), durée cumulée. ' +
        '**Frontend** : reprendre le lecteur à la bonne page / position.',
    }),
    ApiOkResponse({ type: ProgressionSchema }),
  );

export const BooksUpdateProgressDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Mettre à jour la progression',
      description:
        'Enregistre `page_actuelle` et optionnellement `duree_lecture_min` (session). ' +
        'Peut déclencher la complétion du livre et la progression des défis. ' +
        '**Frontend** : envoyer périodiquement (debounce) depuis le lecteur.',
    }),
    ApiOkResponse({ type: ProgressionUpdateSchema }),
  );

export const BooksListCommentsDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Commentaires publics du livre',
      description:
        'Fil de discussion paginé. Route accessible avec JWT mais sans filtre par utilisateur. ' +
        '**Frontend** : onglet avis / commentaires sur la fiche livre.',
    }),
    ApiOkResponse({ type: PaginatedCommentSchema }),
  );

export const BooksCreateCommentDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Publier un commentaire',
      description:
        'Ajoute un avis textuel sur le livre. **Frontend** : formulaire sous la fiche.',
    }),
    ApiCreatedResponse({ type: CommentSchema }),
  );

export const BooksUpdateCommentDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiParam({
      name: 'commentId',
      format: 'uuid',
      description: 'Identifiant du commentaire (`commentaire.id`).',
    }),
    ApiOperation({
      summary: 'Modifier son commentaire',
      description:
        'Met à jour le texte d’un commentaire publié par l’utilisateur connecté. ' +
        '**Frontend** : édition inline ou formulaire « Modifier ».',
    }),
    ApiOkResponse({ type: CommentSchema }),
  );

export const BooksDeleteCommentDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiParam({
      name: 'commentId',
      format: 'uuid',
      description: 'Identifiant du commentaire (`commentaire.id`).',
    }),
    ApiOperation({
      summary: 'Supprimer son commentaire',
      description:
        'Passe le statut à `SUPPRIME` (soft delete). Le commentaire disparaît des listes publiques. ' +
        '**Frontend** : confirmation puis retrait du fil.',
    }),
    ApiOkResponse({ type: CommentSchema }),
  );

export const BooksRateDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Noter le livre (1–5)',
      description:
        'Crée ou met à jour la note de l’utilisateur. **Frontend** : étoiles interactives.',
    }),
    ApiOkResponse({ type: BookRatingResponseSchema }),
  );

export const BooksRatePatchDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Modifier sa note (1–5)',
      description:
        'Alias REST de la création/mise à jour de note (`POST /rate`). Utile pour une sémantique PATCH côté client.',
    }),
    ApiOkResponse({ type: BookRatingResponseSchema }),
  );

export const BooksDetailDocs = () =>
  applyDecorators(
    bookIdParam(),
    ApiOperation({
      summary: 'Fiche détaillée d’un livre',
      description:
        'Métadonnées complètes : auteur, catégories, bibliothèque, note utilisateur, progression, accès. ' +
        '**Frontend** : écran détail livre — appeler en premier avant access/stream.',
    }),
    ApiOkResponse({ type: LivreDetailSchema }),
  );
