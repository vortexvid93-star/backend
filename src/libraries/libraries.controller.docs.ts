import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import {
  BibliothequeCategorieCountSchema,
  BibliothequeDetailSchema,
  BibliothequeStatsSchema,
  LibrariesSummarySchema,
  PaginatedBibliothequeListSchema,
} from '../common/swagger/schemas/libraries.schema';
import { PaginatedLivreLibrarySchema } from '../common/swagger/schemas/books.schema';

const libraryIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID de la bibliothèque (`bibliotheque.id`).',
  });

export const LibrariesControllerDocs = () => ApiJwtActiveAccount();

export const LibrariesSummaryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Résumé global des bibliothèques',
      description:
        'Compteurs agrégés (nombre de bibliothèques, livres, catégories) pour l’écran d’exploration. ' +
        '**Frontend** : en-tête ou bannière de la section « Bibliothèques ».',
    }),
    ApiOkResponse({ type: LibrariesSummarySchema }),
  );

export const LibrariesListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste des bibliothèques',
      description:
        'Collections éditoriales paginées avec image, description et nombre de livres. ' +
        '**Frontend** : grille de cartes bibliothèques.',
    }),
    ApiOkResponse({ type: PaginatedBibliothequeListSchema }),
  );

export const LibrariesStatsDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Statistiques d’une bibliothèque',
      description:
        'Volumes : livres, auteurs, catégories, types (audio/ebook). **Frontend** : sous-titre de la page bibliothèque.',
    }),
    ApiOkResponse({ type: BibliothequeStatsSchema }),
  );

export const LibrariesCategoriesDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Catégories d’une bibliothèque',
      description:
        'Arbre ou liste des catégories disponibles pour filtrer les livres. ' +
        '**Frontend** : chips / menu latéral de filtrage.',
    }),
    ApiOkResponse({ type: [BibliothequeCategorieCountSchema] }),
  );

export const LibrariesInProgressDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Livres en cours dans cette bibliothèque',
      description:
        'Livres commencés mais non terminés par l’utilisateur, filtrés par bibliothèque. ' +
        '**Frontend** : section « Continuer dans [Bibliothèque] ».',
    }),
    ApiOkResponse({ type: PaginatedLivreLibrarySchema }),
  );

export const LibrariesBooksDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Catalogue des livres d’une bibliothèque',
      description:
        'Même logique que `GET /books` mais scoped à une bibliothèque. Filtres : catégorie, type, tri, recherche `q`. ' +
        '**Frontend** : liste principale après clic sur une bibliothèque.',
    }),
    ApiOkResponse({ type: PaginatedLivreLibrarySchema }),
  );

export const LibrariesDetailDocs = () =>
  applyDecorators(
    libraryIdParam(),
    ApiOperation({
      summary: 'Détail d’une bibliothèque',
      description:
        'Nom, description, visuel, métadonnées. **Frontend** : hero de la page bibliothèque.',
    }),
    ApiOkResponse({ type: BibliothequeDetailSchema }),
  );
