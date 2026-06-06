import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import { AdminNotificationCreateSchema } from '../../common/swagger/schemas/admin.schema';

export const AdminNotificationsControllerDocs = () => ApiJwtAdmin();

export const AdminNotificationsCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer une notification in-app',
      description:
        'Envoie une notification à **un utilisateur** (`auth_id`) ou à **tous les comptes ACTIF** si `auth_id` est omis. ' +
        'Types autorisés : `ANNONCE`, `PROMOTION`, `MAINTENANCE`, `ACTUALITE`, `ALERTE`.',
    }),
    ApiCreatedResponse({ type: AdminNotificationCreateSchema }),
    ApiNotFoundResponse({ description: 'Utilisateur introuvable (cible unique).' }),
    ApiBadRequestResponse({
      description: 'Type invalide ou aucun utilisateur actif (diffusion globale).',
    }),
  );
