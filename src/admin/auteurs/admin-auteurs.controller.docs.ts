import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import { PaginatedAdminAuteurListSchema } from '../../common/swagger/schemas/admin.schema';
import {
  DeletedAtSchema,
  IdNomSchema,
  IdUpdatedAtSchema,
} from '../../common/swagger/schemas/shared.schema';

const auteurIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID de l’auteur.',
  });

export const AdminAuteursControllerDocs = () => ApiJwtAdmin();

export const AdminAuteursListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des auteurs',
      description: 'Auteurs actifs uniquement (`deleted_at IS NULL`). Recherche `q` sur le nom.',
    }),
    ApiOkResponse({ type: PaginatedAdminAuteurListSchema }),
  );

export const AdminAuteursCreateDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Créer un auteur' }),
    ApiCreatedResponse({ type: IdNomSchema }),
    ApiBadRequestResponse(),
  );

export const AdminAuteursUpdateDocs = () =>
  applyDecorators(
    auteurIdParam(),
    ApiOperation({ summary: 'Modifier un auteur' }),
    ApiOkResponse({ type: IdUpdatedAtSchema }),
    ApiBadRequestResponse(),
    ApiNotFoundResponse(),
  );

export const AdminAuteursDeleteDocs = () =>
  applyDecorators(
    auteurIdParam(),
    ApiOperation({
      summary: 'Supprimer un auteur (soft delete)',
      description:
        'Pose `deleted_at`. HTTP 409 si un défi `statut=ACTIF` référence cet auteur (FK RESTRICT).',
    }),
    ApiOkResponse({ type: DeletedAtSchema }),
    ApiNotFoundResponse(),
    ApiConflictResponse({
      description: 'Auteur référencé par un défi actif.',
    }),
  );
