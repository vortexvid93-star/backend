import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import {
  AdminChallengeCancelSchema,
  AdminChallengeCreateSchema,
  PaginatedAdminChallengeListSchema,
  PaginatedAdminChallengeParticipantsSchema,
} from '../../common/swagger/schemas/admin.schema';
import { IdUpdatedAtSchema } from '../../common/swagger/schemas/shared.schema';

const challengeIdParam = () =>
  ApiParam({ name: 'id', format: 'uuid', description: 'ID défi.' });

export const AdminChallengesControllerDocs = () => ApiJwtAdmin();

export const AdminChallengesListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des défis',
      description: 'Tous statuts. Filtre `statut`, pagination.',
    }),
    ApiOkResponse({ type: PaginatedAdminChallengeListSchema }),
  );

export const AdminChallengesCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer un défi',
      description:
        'Contraintes chk_defi_exclusivite / chk_defi_dates. `statut=ACTIF` par défaut.',
    }),
    ApiCreatedResponse({ type: AdminChallengeCreateSchema }),
    ApiBadRequestResponse({ description: 'Contraintes type/FK/dates.' }),
    ApiNotFoundResponse({ description: 'badge_id ou cible inexistant.' }),
  );

export const AdminChallengesUpdateDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({
      summary: 'Modifier un défi ACTIF',
      description: 'Type et badge_id non modifiables.',
    }),
    ApiOkResponse({ type: IdUpdatedAtSchema }),
    ApiBadRequestResponse({
      description: 'Défi non ACTIF ou dates invalides.',
    }),
    ApiNotFoundResponse(),
  );

export const AdminChallengesCancelDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({
      summary: 'Annuler un défi',
      description: 'statut=ANNULE ; UserDefi EN_COURS → ECHOUE (RG63).',
    }),
    ApiOkResponse({ type: AdminChallengeCancelSchema }),
    ApiNotFoundResponse(),
  );

export const AdminChallengesParticipantsDocs = () =>
  applyDecorators(
    challengeIdParam(),
    ApiOperation({ summary: 'Participants d’un défi' }),
    ApiOkResponse({ type: PaginatedAdminChallengeParticipantsSchema }),
    ApiNotFoundResponse({ description: 'Défi introuvable.' }),
  );
