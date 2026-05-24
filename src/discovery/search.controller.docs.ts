import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import {
  HistoriqueRechercheSchema,
  PaginatedHistoriqueRechercheSchema,
  PaginatedLivreSearchSchema,
  SearchHistoryClearSchema,
} from '../common/swagger/schemas/discovery.schema';

const historyIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant d’une entrée d’historique de recherche.',
  });

export const SearchControllerDocs = () => ApiJwtActiveAccount();

export const SearchBooksDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Rechercher des livres',
      description:
        'Recherche full-text sur titre, auteur, description (min. 2 caractères). Filtres : catégorie, langue. ' +
        'Enregistre automatiquement l’historique. **Frontend** : barre de recherche globale, résultats instantanés.',
    }),
    ApiOkResponse({ type: PaginatedLivreSearchSchema }),
  );

export const SearchHistoryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Historique des recherches',
      description:
        'Dernières requêtes de l’utilisateur. **Frontend** : suggestions sous la barre de recherche.',
    }),
    ApiOkResponse({ type: PaginatedHistoriqueRechercheSchema }),
  );

export const SearchHistoryClearDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Effacer tout l’historique de recherche',
      description:
        'Supprime toutes les entrées de l’utilisateur connecté. ' +
        '**Frontend** : bouton « Effacer l’historique » dans les paramètres ou la recherche.',
    }),
    ApiOkResponse({ type: SearchHistoryClearSchema }),
  );

export const SearchHistoryDeleteDocs = () =>
  applyDecorators(
    historyIdParam(),
    ApiOperation({
      summary: 'Supprimer une entrée d’historique',
      description: 'Retire une recherche de la liste. **Frontend** : swipe delete sur une suggestion.',
    }),
    ApiOkResponse({ type: HistoriqueRechercheSchema }),
  );

export const SearchHistoryClickDocs = () =>
  applyDecorators(
    historyIdParam(),
    ApiOperation({
      summary: 'Marquer un clic sur une recherche historique',
      description:
        'Incrémente le compteur de clic pour améliorer le classement des suggestions. ' +
        '**Frontend** : appeler quand l’utilisateur retape une ancienne recherche.',
    }),
    ApiOkResponse({ type: HistoriqueRechercheSchema }),
  );
