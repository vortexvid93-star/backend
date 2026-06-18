import { applyDecorators } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import { MessageResponseSchema } from '../../common/swagger/schemas/common.schema';
import { PaginatedAdminCommentListSchema } from '../../common/swagger/schemas/admin.schema';
import { IdStatutSchema } from '../../common/swagger/schemas/shared.schema';

const commentIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'ID commentaire (`commentaire.id`).',
  });

export const AdminCommentsControllerDocs = () => ApiJwtAdmin();

export const AdminCommentsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste de tous les commentaires',
      description:
        'Tous statuts. Filtres : `statut`, `livre_id`, `auth_id`. Pagination `page` / `limit`.',
    }),
    ApiOkResponse({ type: PaginatedAdminCommentListSchema }),
  );

export const AdminCommentsModerateDocs = () =>
  applyDecorators(
    commentIdParam(),
    ApiOperation({
      summary: 'Modérer un commentaire',
      description:
        'Passe `statut=MODERE` (masqué côté public, conservé en base). Notification SYSTEME optionnelle (`raison` dans le corps).',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiNotFoundResponse(),
  );

export const AdminCommentsRepublishDocs = () =>
  applyDecorators(
    commentIdParam(),
    ApiOperation({
      summary: 'Republier un commentaire modéré',
      description:
        'Passe `statut=PUBLIE` depuis `MODERE`. Notification SYSTEME envoyée à l’auteur.',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiNotFoundResponse(),
  );

export const AdminCommentsDeleteDocs = () =>
  applyDecorators(
    commentIdParam(),
    ApiOperation({
      summary: 'Supprimer définitivement un commentaire',
      description: 'Hard delete irréversible (`DELETE` en base).',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiNotFoundResponse(),
  );
