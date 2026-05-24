import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import {
  NotificationReadAllSchema,
  NotificationSchema,
  PaginatedNotificationSchema,
} from '../common/swagger/schemas/discovery.schema';

const notificationIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID de la notification.',
  });

export const NotificationsControllerDocs = () => ApiJwtActiveAccount();

export const NotificationsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste des notifications',
      description:
        'Notifications in-app : défis, abonnement, recommandations, badges… Filtre `unread_only` disponible. ' +
        '**Frontend** : centre de notifications, badge compteur.',
    }),
    ApiOkResponse({ type: PaginatedNotificationSchema }),
  );

export const NotificationsReadAllDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Tout marquer comme lu',
      description:
        'Passe toutes les notifications en lu. **Frontend** : bouton « Tout marquer lu ».',
    }),
    ApiOkResponse({ type: NotificationReadAllSchema }),
  );

export const NotificationsReadOneDocs = () =>
  applyDecorators(
    notificationIdParam(),
    ApiOperation({
      summary: 'Marquer une notification comme lue',
      description:
        'Cible une notification par ID. **Frontend** : au tap sur une notification.',
    }),
    ApiOkResponse({ type: NotificationSchema }),
  );
