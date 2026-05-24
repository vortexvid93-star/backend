import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import { MessageResponseSchema } from '../common/swagger/schemas/common.schema';
import {
  ChallengeDetailSchema,
  ChallengeJoinSchema,
  ChallengeProgressSchema,
  ChallengeStatsSchema,
  PaginatedChallengeListSchema,
} from '../common/swagger/schemas/challenges.schema';

const challengeIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID du défi (`defi.id`).',
  });

export const ChallengesControllerDocs = () => ApiJwtActiveAccount();

export const ChallengesListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Défis actifs disponibles',
      description:
        'Liste des challenges en cours avec possibilité de filtrer. Indique si l’utilisateur a déjà rejoint. ' +
        '**Frontend** : page « Défis » / liste des missions.',
    }),
    ApiOkResponse({ type: PaginatedChallengeListSchema }),
  );

export const ChallengesRecommendedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Défis recommandés pour l’utilisateur',
      description:
        'Sélection personnalisée selon historique de lecture et niveau. **Frontend** : carrousel « Pour vous ».',
    }),
    ApiOkResponse({ type: PaginatedChallengeListSchema }),
  );

export const ChallengesExpiringDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Défis qui expirent bientôt',
      description:
        'Filtre par date de fin proche pour créer l’urgence. **Frontend** : bandeau « Dernière chance ».',
    }),
    ApiOkResponse({ type: PaginatedChallengeListSchema }),
  );

export const ChallengesStatsDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({
      summary: 'Statistiques globales d’un défi',
      description:
        'Nombre de participants, taux de réussite, etc. **Frontend** : social proof sur la fiche défi.',
    }),
    ApiOkResponse({ type: ChallengeStatsSchema }),
  );

export const ChallengesProgressDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({
      summary: 'Ma progression sur un défi',
      description:
        'Jalons, pourcentage, récompenses à venir. **Frontend** : barre de progression détail défi.',
    }),
    ApiOkResponse({ type: ChallengeProgressSchema }),
  );

export const ChallengesDetailDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({
      summary: 'Détail d’un défi',
      description:
        'Règles, livres éligibles, dates, récompenses (points, badge). **Frontend** : écran détail avant « Rejoindre ».',
    }),
    ApiOkResponse({ type: ChallengeDetailSchema }),
  );

export const ChallengesJoinDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({
      summary: 'Rejoindre un défi',
      description:
        'Inscrit l’utilisateur à la participation. Idempotent si déjà inscrit. ' +
        '**Frontend** : bouton « Participer ».',
    }),
    ApiCreatedResponse({ type: ChallengeJoinSchema }),
  );

export const ChallengesLeaveDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({
      summary: 'Quitter un défi (sans progression)',
      description:
        'Supprime la participation uniquement si `progression = 0` et statut `EN_COURS`. ' +
        '**Frontend** : bouton « Se désinscrire » avant d’avoir commencé.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
  );
