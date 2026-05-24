import { applyDecorators } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import {
  AdminBadgeCreateSchema,
  PaginatedAdminBadgeListSchema,
} from '../../common/swagger/schemas/admin.schema';
import { IdUpdatedAtSchema } from '../../common/swagger/schemas/shared.schema';

const badgeIdParam = () =>
  ApiParam({ name: 'id', format: 'uuid', description: 'ID badge.' });

export const AdminBadgesControllerDocs = () => ApiJwtAdmin();

export const AdminBadgesListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des badges',
      description: 'Inclut `nb_utilisateurs` (table `userbadge`).',
    }),
    ApiOkResponse({ type: PaginatedAdminBadgeListSchema }),
  );

export const AdminBadgesCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer un badge',
      description:
        '**multipart/form-data** : champ `icone` (fichier PNG/JPEG/WebP/SVG) uploadé sur Cloudinary ; l’URL est stockée dans `icone`.',
    }),
    ApiCreatedResponse({ type: AdminBadgeCreateSchema }),
    ApiConflictResponse({ description: 'Nom déjà utilisé.' }),
  );

export const AdminBadgesUpdateDocs = () =>
  applyDecorators(
    badgeIdParam(),
    ApiOperation({
      summary: 'Modifier un badge',
      description:
        'Champs texte optionnels + `icone` (fichier) pour remplacer l’image Cloudinary.',
    }),
    ApiOkResponse({ type: IdUpdatedAtSchema }),
    ApiNotFoundResponse(),
    ApiConflictResponse(),
  );
