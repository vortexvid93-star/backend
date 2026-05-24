import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PlanItemSchema } from '../common/swagger/schemas/payments.schema';

export const PlansListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste des plans d’abonnement actifs',
      description:
        'Offres commerciales publiques (nom, prix, durée, quotas stream/download). **Sans authentification**. ' +
        '**Frontend** : page tarifs / choix d’offre avant inscription ou depuis les paramètres.',
    }),
    ApiOkResponse({ type: [PlanItemSchema] }),
  );

export const PlansDetailDocs = () =>
  applyDecorators(
    ApiParam({
      name: 'id',
      format: 'uuid',
      description: 'Identifiant du plan (`plan.id`).',
    }),
    ApiOperation({
      summary: 'Détail d’un plan',
      description:
        'Caractéristiques complètes d’une offre. **Frontend** : modal comparaison ou fiche plan.',
    }),
    ApiOkResponse({ type: PlanItemSchema }),
  );
