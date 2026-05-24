import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import {
  AdminPlanUpdateResponseSchema,
  PlanItemSchema,
} from '../../common/swagger/schemas/payments.schema';

const planIdParam = () =>
  ApiParam({ name: 'id', format: 'uuid', description: 'ID plan (`planAbonnement.id`).' });

export const AdminPlansControllerDocs = () => ApiJwtAdmin();

export const AdminPlansListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des plans',
      description: 'Tous statuts (ACTIF, INACTIF).',
    }),
    ApiOkResponse({ type: [PlanItemSchema] }),
  );

export const AdminPlansCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer un plan',
      description: '`plan` unique. Prix min 100 XOF. `statut=ACTIF` par défaut.',
    }),
    ApiCreatedResponse({ type: PlanItemSchema }),
    ApiBadRequestResponse({ description: 'Prix < 100 XOF.' }),
    ApiConflictResponse({ description: 'Type plan déjà existant.' }),
  );

export const AdminPlansUpdateDocs = () =>
  applyDecorators(
    planIdParam(),
    ApiOperation({
      summary: 'Modifier un plan',
      description:
        'Prix / durée / statut. Non rétroactif sur abonnements en cours.',
    }),
    ApiOkResponse({ type: AdminPlanUpdateResponseSchema }),
    ApiBadRequestResponse(),
    ApiNotFoundResponse(),
  );
