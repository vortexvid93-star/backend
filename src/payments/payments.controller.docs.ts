import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  ApiJwtAuthenticated,
  ApiJwtCheckout,
} from '../common/swagger/decorators';
import { MessageResponseSchema } from '../common/swagger/schemas/common.schema';
import {
  PaymentCheckoutPreviewSchema,
  PaymentInitSchema,
  PaymentReturnSchema,
  PaymentStatusSchema,
} from '../common/swagger/schemas/payments.schema';
import { CurrentSubscriptionSchema } from '../common/swagger/schemas/payments.schema';

export const PaymentsCheckoutPreviewDocs = () =>
  applyDecorators(
    ApiJwtCheckout(),
    ApiOperation({
      summary: 'Aperçu du checkout avant paiement',
      description:
        'Calcule montant, devise, plan choisi et état de l’abonnement actuel (upgrade/downgrade). ' +
        '**Frontend** : page récapitulatif avant redirection vers le prestataire de paiement.',
    }),
    ApiOkResponse({ type: PaymentCheckoutPreviewSchema }),
  );

export const PaymentsPendingDocs = () =>
  applyDecorators(
    ApiJwtAuthenticated(),
    ApiOperation({
      summary: 'Paiements en attente',
      description:
        'Transactions initiées mais pas encore confirmées (webhook). ' +
        '**Frontend** : écran « Paiement en cours » avec polling possible sur `/status`.',
    }),
    ApiOkResponse({ type: [PaymentStatusSchema] }),
  );

export const PaymentsStatusDocs = () =>
  applyDecorators(
    ApiJwtAuthenticated(),
    ApiOperation({
      summary: 'Statut d’une transaction',
      description:
        'Interroge l’état d’un `transaction_id` (succès, échec, pending). ' +
        '**Frontend** : après retour utilisateur depuis la page de paiement.',
    }),
    ApiOkResponse({ type: PaymentStatusSchema }),
  );

export const PaymentsInitDocs = () =>
  applyDecorators(
    ApiJwtCheckout(),
    ApiOperation({
      summary: 'Initier un paiement d’abonnement',
      description:
        'Crée une transaction (PawaPay ou mock) et renvoie l’URL ou les instructions USSD (`payment_url`). ' +
        '**Frontend** : ouvrir WebView ou navigateur externe avec cette URL.',
    }),
    ApiOkResponse({ type: PaymentInitSchema }),
  );

export const PaymentsWebhookPingDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ping webhook (health check)',
      description:
        'Réponse vide 200 pour vérifier que l’URL webhook est joignable par le prestataire.',
    }),
    ApiOkResponse({ description: 'Corps vide.' }),
  );

export const PaymentsWebhookDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Notification de paiement (serveur à serveur)',
      description:
        'Callback générique (GET ou POST) pour certains flux de retour. PawaPay utilise plutôt `/api/webhooks/pawapay/deposits`. ' +
        '**Frontend** : ne pas appeler — réservé au prestataire.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
  );

export const PaymentsReturnDocs = () =>
  applyDecorators(
    ApiQuery({
      name: 'transaction_id',
      required: false,
      description:
        'ID transaction renvoyé par le prestataire dans l’URL de retour.',
    }),
    ApiOperation({
      summary: 'Page de retour après paiement',
      description:
        'Route publique appelée par redirection navigateur. Renvoie un statut lisible pour afficher succès/échec. ' +
        '**Frontend** : deep link ou page web de retour qui lit ce JSON.',
    }),
    ApiOkResponse({ type: PaymentReturnSchema }),
  );

export const PaymentsMockSimulateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '[DEV] Simuler un paiement réussi',
      description:
        'Sandbox uniquement : force la validation d’une transaction mock. ' +
        '**Frontend** : bouton debug en environnement de développement.',
    }),
    ApiOkResponse({ type: CurrentSubscriptionSchema }),
  );
