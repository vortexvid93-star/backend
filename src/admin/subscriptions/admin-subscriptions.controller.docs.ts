import { applyDecorators } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import { PaginatedAdminSubscriptionListSchema } from '../../common/swagger/schemas/admin.schema';
import { IdStatutSchema } from '../../common/swagger/schemas/shared.schema';

const subscriptionIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID de l’abonnement.',
  });

export const AdminSubscriptionsControllerDocs = () => ApiJwtAdmin();

export const AdminSubscriptionsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des abonnements',
      description: 'Abonnements paginés avec auth, plan et statut.',
    }),
    ApiOkResponse({ type: PaginatedAdminSubscriptionListSchema }),
  );

export const AdminSubscriptionsCancelDocs = () =>
  applyDecorators(
    subscriptionIdParam(),
    ApiOperation({
      summary: 'Annuler un abonnement',
      description: 'Passe le statut à ANNULE.',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiNotFoundResponse(),
  );

export const AdminSubscriptionsSuspendDocs = () =>
  applyDecorators(
    subscriptionIdParam(),
    ApiOperation({
      summary: 'Suspendre un abonnement',
      description: 'Passe le statut à SUSPENDU (abonnement actif uniquement).',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiNotFoundResponse(),
  );

export const AdminSubscriptionsActivateDocs = () =>
  applyDecorators(
    subscriptionIdParam(),
    ApiOperation({
      summary: 'Réactiver un abonnement',
      description:
        'Passe le statut à ACTIF (depuis SUSPENDU ou EXPIRE). Prolonge la date de fin si nécessaire.',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiNotFoundResponse(),
  );
