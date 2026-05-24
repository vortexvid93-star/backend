import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import { GamificationOverviewSchema } from '../common/swagger/schemas/challenges.schema';

export const GamificationControllerDocs = () => ApiJwtActiveAccount();

export const GamificationOverviewDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Vue d’ensemble gamification',
      description:
        'Agrège points, rang, défis actifs, derniers badges et prochain objectif en un seul payload. ' +
        '**Frontend** : onglet « Récompenses » ou section home gamifiée — préférer cet endpoint à plusieurs appels.',
    }),
    ApiOkResponse({ type: GamificationOverviewSchema }),
  );
