import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiJwtAuthenticated } from '../common/swagger/decorators';
import {
  CurrentSubscriptionSchema,
  PaginatedSubscriptionHistorySchema,
  PlanItemSchema,
  SubscriptionSummarySchema,
} from '../common/swagger/schemas/payments.schema';

export const SubscriptionsControllerDocs = () => ApiJwtAuthenticated();

export const SubscriptionsCurrentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Abonnement actuellement actif',
      description:
        'Plan en cours, dates, quotas restants. `null` si aucun abonnement. ' +
        '**Frontend** : bannière « Mon abonnement », contrôle des accès livres.',
    }),
    ApiOkResponse({ type: CurrentSubscriptionSchema }),
  );

export const SubscriptionsUpcomingDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Abonnement à venir (renouvellement / changement de plan)',
      description:
        'Prochaine période déjà payée ou plan programmé. **Frontend** : mention « Renouvellement le … ».',
    }),
    ApiOkResponse({ type: CurrentSubscriptionSchema }),
  );

export const SubscriptionsSummaryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Résumé abonnement',
      description:
        'Vue condensée : plan, statut, jours restants, alertes. **Frontend** : widget paramètres compte.',
    }),
    ApiOkResponse({ type: SubscriptionSummarySchema }),
  );

export const SubscriptionsCompareDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Comparer les plans pour l’utilisateur',
      description:
        'Tous les plans avec indication plan actuel, upgrade possible, prix à payer. ' +
        '**Frontend** : écran « Changer d’offre » avec mise en avant de l’option recommandée.',
    }),
    ApiOkResponse({ type: [PlanItemSchema] }),
  );

export const SubscriptionsHistoryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Historique des abonnements',
      description:
        'Anciennes périodes, expirations, changements de plan. **Frontend** : liste factures / historique.',
    }),
    ApiOkResponse({ type: PaginatedSubscriptionHistorySchema }),
  );
