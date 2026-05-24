import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import {
  BadgeDetailSchema,
  BadgeNextResponseSchema,
  BadgePathSchema,
  PaginatedBadgeListSchema,
} from '../common/swagger/schemas/challenges.schema';

const badgeIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID du badge (`badge.id`).',
  });

export const BadgesControllerDocs = () => ApiJwtActiveAccount();

export const BadgesListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Catalogue des badges',
      description:
        'Tous les badges avec statut débloqué / verrouillé pour l’utilisateur. Filtres optionnels. ' +
        '**Frontend** : galerie complète des succès.',
    }),
    ApiOkResponse({ type: PaginatedBadgeListSchema }),
  );

export const BadgesNextDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Prochain badge à débloquer',
      description:
        'Badge le plus proche selon la progression actuelle. **Frontend** : widget motivation « Plus que X pages ».',
    }),
    ApiOkResponse({ type: BadgeNextResponseSchema }),
  );

export const BadgesPathDocs = () =>
  applyDecorators(
    badgeIdParam(),
    ApiOperation({
      summary: 'Parcours vers un badge',
      description:
        'Étapes intermédiaires et progression pour un badge donné. **Frontend** : écran détail badge / arbre.',
    }),
    ApiOkResponse({ type: BadgePathSchema }),
  );

export const BadgesDetailDocs = () =>
  applyDecorators(
    badgeIdParam(),
    ApiOperation({
      summary: 'Détail d’un badge',
      description:
        'Description, icône, conditions, date d’obtention si déjà gagné. **Frontend** : modal badge.',
    }),
    ApiOkResponse({ type: BadgeDetailSchema }),
  );
