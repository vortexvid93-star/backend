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
import { PaginatedAdminCategorieListSchema } from '../../common/swagger/schemas/admin.schema';
import {
  DeletedAtSchema,
  IdNomSchema,
  IdUpdatedAtSchema,
} from '../../common/swagger/schemas/shared.schema';

const categorieIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID de la catégorie.',
  });

export const AdminCategoriesControllerDocs = () => ApiJwtAdmin();

export const AdminCategoriesListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des catégories',
      description:
        'Catégories actives (`deleted_at IS NULL`). `nb_livres` = nombre de liaisons `appartenir`.',
    }),
    ApiOkResponse({ type: PaginatedAdminCategorieListSchema }),
  );

export const AdminCategoriesCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer une catégorie',
      description: 'Nom unique (`categorie.nom` @unique, max 100 car.).',
    }),
    ApiCreatedResponse({ type: IdNomSchema }),
    ApiConflictResponse({ description: 'Nom déjà utilisé.' }),
  );

export const AdminCategoriesUpdateDocs = () =>
  applyDecorators(
    categorieIdParam(),
    ApiOperation({ summary: 'Modifier une catégorie' }),
    ApiOkResponse({ type: IdUpdatedAtSchema }),
    ApiNotFoundResponse(),
    ApiConflictResponse({ description: 'Nom déjà utilisé.' }),
  );

export const AdminCategoriesDeleteDocs = () =>
  applyDecorators(
    categorieIdParam(),
    ApiOperation({
      summary: 'Supprimer une catégorie (soft delete)',
      description:
        'Pose `deleted_at`. HTTP 409 si un défi `statut=ACTIF` référence cette catégorie.',
    }),
    ApiOkResponse({ type: DeletedAtSchema }),
    ApiNotFoundResponse(),
    ApiConflictResponse({
      description: 'Catégorie référencée par un défi actif.',
    }),
  );
