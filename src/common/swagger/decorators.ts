import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SWAGGER_BEARER_AUTH } from './constants';

/**
 * Routes nécessitant un JWT valide **et** un compte au statut ACTIF
 * (équivalent à `JwtAuthGuard`).
 */
export function ApiJwtActiveAccount() {
  return applyDecorators(
    ApiBearerAuth(SWAGGER_BEARER_AUTH),
    ApiUnauthorizedResponse({
      description:
        'JWT absent, expiré, révoqué (logout) ou compte introuvable/inactif.',
    }),
    ApiForbiddenResponse({
      description: 'Compte banni ou statut non autorisé pour cette ressource.',
    }),
  );
}

/**
 * Routes acceptant un JWT valide même si le compte est encore PENDING
 * (équivalent à `JwtAuthenticatedGuard`).
 */
export function ApiJwtAuthenticated() {
  return applyDecorators(
    ApiBearerAuth(SWAGGER_BEARER_AUTH),
    ApiUnauthorizedResponse({
      description: 'JWT absent, expiré ou révoqué.',
    }),
  );
}

/**
 * Paiement / checkout : JWT + compte ACTIF obligatoire
 * (`JwtAuthenticatedGuard` + `ActiveAccountGuard`).
 */
export function ApiJwtCheckout() {
  return applyDecorators(
    ApiBearerAuth(SWAGGER_BEARER_AUTH),
    ApiUnauthorizedResponse({ description: 'JWT absent, expiré ou révoqué.' }),
    ApiForbiddenResponse({
      description:
        'Compte PENDING (valider l’email OTP), BANNI ou autre statut bloquant le paiement.',
    }),
  );
}

/**
 * Routes réservées aux comptes **ADMIN** avec JWT valide et statut ACTIF.
 */
export function ApiJwtAdmin() {
  return applyDecorators(
    ApiBearerAuth(SWAGGER_BEARER_AUTH),
    ApiUnauthorizedResponse({
      description: 'JWT absent, expiré, révoqué ou compte introuvable/inactif.',
    }),
    ApiForbiddenResponse({
      description: 'Rôle insuffisant (ADMIN requis) ou compte banni.',
    }),
  );
}
