import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import { AdminNotificationCreateSchema } from '../../common/swagger/schemas/admin.schema';

export const AdminNotificationsControllerDocs = () => ApiJwtAdmin();

export const AdminNotificationsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Lister les notifications envoyées',
      description:
        "Retourne l'historique des notifications in-app groupées par envoi " +
        "(titre + contenu + type + minute d'envoi). Paginé.",
    }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: ['ANNONCE', 'PROMOTION', 'MAINTENANCE', 'ACTUALITE', 'ALERTE'],
    }),
    ApiOkResponse({
      description: 'Liste paginée des groupes de notifications.',
    }),
  );

export const AdminNotificationsCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer une notification in-app',
      description:
        'Envoie une notification à **un utilisateur** (`auth_id`) ou à **tous les comptes ACTIF** si `auth_id` est omis. ' +
        'Types autorisés : `ANNONCE`, `PROMOTION`, `MAINTENANCE`, `ACTUALITE`, `ALERTE`.',
    }),
    ApiCreatedResponse({ type: AdminNotificationCreateSchema }),
    ApiNotFoundResponse({
      description: 'Utilisateur introuvable (cible unique).',
    }),
    ApiBadRequestResponse({
      description:
        'Type invalide ou aucun utilisateur actif (diffusion globale).',
    }),
  );

export const AdminNotificationsDeleteDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Supprimer un groupe de notifications',
      description:
        'Supprime toutes les notifications du même envoi (même titre, contenu, type ' +
        "et minute de création). Identifié par l'`id` d'un représentant du groupe.",
    }),
    ApiOkResponse({
      description: 'Nombre de lignes supprimées.',
      schema: { example: { deleted: 3 } },
    }),
    ApiNotFoundResponse({ description: 'Notification introuvable.' }),
  );
