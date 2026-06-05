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
import { MessageResponseSchema } from '../../common/swagger/schemas/common.schema';
import { PaginatedAdminLibraryListSchema } from '../../common/swagger/schemas/admin.schema';
import {
  AddedCountSchema,
  AdminLibraryCreateSchema,
  ArchiveStatutSchema,
  IdUpdatedAtSchema,
} from '../../common/swagger/schemas/shared.schema';

const libraryIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID de la bibliothèque (`bibliotheque.id`).',
  });

const bibIdParam = () =>
  ApiParam({
    name: 'bibId',
    format: 'uuid',
    description: 'Identifiant UUID de la bibliothèque.',
  });

const bookIdParam = () =>
  ApiParam({
    name: 'bookId',
    format: 'uuid',
    description: 'Identifiant UUID du livre.',
  });

export const AdminLibrariesControllerDocs = () => ApiJwtAdmin();

export const AdminLibrariesListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des bibliothèques',
      description:
        'Tous statuts (ACTIVE, ARCHIVEE). Filtres `statut`, `type`, pagination `page` / `limit`.',
    }),
    ApiOkResponse({ type: PaginatedAdminLibraryListSchema }),
  );

export const AdminLibrariesCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer une bibliothèque',
      description:
        'INTERNE → `url_externe` interdit. EXTERNE → `url_externe` obligatoire (chk_bibliotheque_url). `statut=ACTIVE` par défaut.',
    }),
    ApiCreatedResponse({ type: AdminLibraryCreateSchema }),
    ApiBadRequestResponse({
      description: 'url_externe manquante (EXTERNE) ou présente (INTERNE).',
    }),
  );

export const AdminLibrariesUpdateDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Modifier une bibliothèque',
      description:
        'Mise à jour partielle. Le `type` n’est pas modifiable après création.',
    }),
    ApiOkResponse({ type: IdUpdatedAtSchema }),
    ApiBadRequestResponse({ description: 'Violation contrainte url.' }),
    ApiNotFoundResponse(),
  );

export const AdminLibrariesArchiveDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Archiver une bibliothèque',
      description: 'Passe `statut` à ARCHIVEE (masquée du catalogue utilisateur).',
    }),
    ApiOkResponse({ type: ArchiveStatutSchema }),
    ApiNotFoundResponse(),
  );

export const AdminLibrariesUnarchiveDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Désarchiver une bibliothèque',
      description: 'Passe `statut` à ACTIVE (visible dans le catalogue utilisateur).',
    }),
    ApiOkResponse({ type: ArchiveStatutSchema }),
    ApiNotFoundResponse(),
  );

export const AdminLibrariesAddBooksDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Associer des livres (INTERNE)',
      description:
        'INSERT avec ignore des doublons (`skipDuplicates`). HTTP 400 si bibliothèque EXTERNE (RG29).',
    }),
    ApiOkResponse({ type: AddedCountSchema }),
    ApiBadRequestResponse({ description: 'Bibliothèque EXTERNE.' }),
    ApiNotFoundResponse({
      description: 'Bibliothèque ou au moins un livre introuvable.',
    }),
  );

export const AdminLibrariesRemoveBookDocs = () =>
  applyDecorators(
    bibIdParam(),
    bookIdParam(),
    ApiOperation({
      summary: 'Retirer un livre d’une bibliothèque',
      description: 'Supprime une ligne dans `appartient`.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiNotFoundResponse(),
  );
