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
import {
  AdminBookAuthorsResponseSchema,
  AdminBookCategoriesResponseSchema,
  AdminBookListItemSchema,
  PaginatedAdminBookListSchema,
} from '../../common/swagger/schemas/admin.schema';
import {
  AdminBookCreateSchema,
  IdStatutSchema,
  IdUpdatedAtSchema,
} from '../../common/swagger/schemas/shared.schema';

const livreIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID du livre (`livre.id`).',
  });

export const AdminBooksControllerDocs = () => ApiJwtAdmin();

export const AdminBooksListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin de tous les livres',
      description:
        'Tous statuts (PUBLIE / ARCHIVE). Ne retourne jamais `cloudinary_public_id` ni `url_externe_livre`.',
    }),
    ApiOkResponse({ type: PaginatedAdminBookListSchema }),
  );

export const AdminBooksDetailDocs = () =>
  applyDecorators(
    livreIdParam(),
    ApiOperation({
      summary: "Détail d'un livre",
      description:
        'Même forme qu’un élément de la liste admin (auteurs, catégories, statistique incluses).',
    }),
    ApiOkResponse({ type: AdminBookListItemSchema }),
    ApiNotFoundResponse({ description: 'Livre introuvable.' }),
  );

export const AdminBooksCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer un livre',
      description:
        '**multipart/form-data** : INTERNE → `file` (PDF/EPUB/MOBI, Cloudinary raw) ; EXTERNE → `url_externe_livre` ; optionnel → `couverture` (image PNG/JPEG/WebP/SVG → URL Cloudinary dans `couverture_url`).',
    }),
    ApiCreatedResponse({ type: AdminBookCreateSchema }),
    ApiBadRequestResponse({ description: 'Contrainte ressource violée.' }),
    ApiConflictResponse({ description: 'ISBN déjà utilisé.' }),
  );

export const AdminBooksUpdateDocs = () =>
  applyDecorators(
    livreIdParam(),
    ApiOperation({
      summary: 'Modifier un livre',
      description:
        '`type_livre` non modifiable. INTERNE : `file` pour remplacer le livre ; `couverture` pour remplacer l’image (Cloudinary).',
    }),
    ApiOkResponse({ type: IdUpdatedAtSchema }),
    ApiBadRequestResponse({ description: 'Contrainte ressource violée.' }),
    ApiNotFoundResponse({ description: 'Livre introuvable.' }),
    ApiConflictResponse({ description: 'ISBN déjà utilisé.' }),
  );

export const AdminBooksArchiveDocs = () =>
  applyDecorators(
    livreIdParam(),
    ApiOperation({
      summary: 'Archiver un livre',
      description:
        'Passe `statut` à ARCHIVE (hors catalogue utilisateur). Les tokens et progressions existants ne sont pas supprimés.',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiNotFoundResponse({ description: 'Livre introuvable.' }),
  );

export const AdminBooksAssignCategoriesDocs = () =>
  applyDecorators(
    livreIdParam(),
    ApiOperation({
      summary: 'Remplacer toutes les catégories d’un livre',
      description:
        'REPLACE ALL atomique. Catégories actives uniquement (`deleted_at IS NULL`).',
    }),
    ApiOkResponse({ type: AdminBookCategoriesResponseSchema }),
    ApiBadRequestResponse({ description: 'Catégorie invalide ou archivée.' }),
    ApiNotFoundResponse({ description: 'Livre introuvable.' }),
  );

export const AdminBooksAssignAuthorsDocs = () =>
  applyDecorators(
    livreIdParam(),
    ApiOperation({
      summary: 'Remplacer tous les auteurs d’un livre',
      description:
        'REPLACE ALL atomique. Auteurs actifs uniquement (`deleted_at IS NULL`).',
    }),
    ApiOkResponse({ type: AdminBookAuthorsResponseSchema }),
    ApiBadRequestResponse({ description: 'Auteur invalide ou archivé.' }),
    ApiNotFoundResponse({ description: 'Livre introuvable.' }),
  );
