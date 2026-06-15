import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import {
  PaginatedRecommandationSchema,
  RecommandationDismissSchema,
  RecommandationMarkAllSeenSchema,
  RecommandationRefreshSchema,
  RecommandationSchema,
  RecommandationSummarySchema,
  RecommandationsByReasonSchema,
} from '../common/swagger/schemas/discovery.schema';

const recommendationIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID de la recommandation (`recommandation.id`).',
  });

const livreIdParam = () =>
  ApiParam({
    name: 'livreId',
    format: 'uuid',
    description: 'Identifiant UUID du livre source.',
  });

export const RecommendationsControllerDocs = () => ApiJwtActiveAccount();

export const RecommendationsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste des recommandations personnalisées',
      description:
        'Suggestions basées sur l’historique, les préférences et le moteur de reco. Filtres : vu/non vu, raison. ' +
        '**Frontend** : feed « Pour vous » paginé.',
    }),
    ApiOkResponse({ type: PaginatedRecommandationSchema }),
  );

export const RecommendationsSummaryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Résumé des recommandations',
      description:
        'Compteurs (nouvelles, non vues) pour badge notification. **Frontend** : pastille sur l’icône découvrir.',
    }),
    ApiOkResponse({ type: RecommandationSummarySchema }),
  );

export const RecommendationsPicksDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Sélection éditoriale (top picks)',
      description:
        'Sous-ensemble mis en avant (limite configurable). **Frontend** : hero carousel accueil.',
    }),
    ApiOkResponse({ type: [RecommandationSchema] }),
  );

export const RecommendationsByReasonDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Recommandations groupées par raison',
      description:
        'Sections du type « Parce que vous avez lu X », « Populaire dans votre bibliothèque ». ' +
        '**Frontend** : blocs horizontaux par catégorie de raison.',
    }),
    ApiOkResponse({ type: RecommandationsByReasonSchema }),
  );

export const RecommendationsForBookDocs = () =>
  applyDecorators(
    livreIdParam(),
    ApiOperation({
      summary: 'Recommandations liées à un livre',
      description:
        'Alternative à `GET /books/:id/similar` côté moteur reco (peut inclure signaux comportementaux). ' +
        '**Frontend** : section reco sur fiche livre si vous préférez le moteur unifié.',
    }),
    ApiOkResponse({ type: PaginatedRecommandationSchema }),
  );

export const RecommendationsRefreshDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Régénérer les recommandations',
      description:
        'Force un recalcul (avec garde-fous anti-spam). **Frontend** : pull-to-refresh sur le feed reco.',
    }),
    ApiOkResponse({ type: RecommandationRefreshSchema }),
  );

export const RecommendationsMarkAllSeenDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Marquer toutes les recommandations comme vues',
      description:
        'Remet les compteurs « non vues » à zéro. **Frontend** : action « Tout marquer comme lu ».',
    }),
    ApiOkResponse({ type: RecommandationMarkAllSeenSchema }),
  );

export const RecommendationsDetailDocs = () =>
  applyDecorators(
    recommendationIdParam(),
    ApiOperation({
      summary: 'Détail d’une recommandation',
      description:
        'Livre cible, score, raison, statut interaction. **Frontend** : avant navigation vers la fiche livre.',
    }),
    ApiOkResponse({ type: RecommandationSchema }),
  );

export const RecommendationsInteractDocs = () =>
  applyDecorators(
    recommendationIdParam(),
    ApiOperation({
      summary: 'Enregistrer une interaction',
      description:
        'Actions : clic, ajout bibliothèque, lecture… Alimente le modèle de reco. **Frontend** : tracking analytics + POST.',
    }),
    ApiOkResponse({ type: RecommandationSchema }),
  );

export const RecommendationsDismissDocs = () =>
  applyDecorators(
    recommendationIdParam(),
    ApiOperation({
      summary: 'Ignorer une recommandation',
      description:
        'Masque la suggestion sans la marquer comme lue. **Frontend** : bouton « Pas intéressé ».',
    }),
    ApiOkResponse({ type: RecommandationDismissSchema }),
  );
