import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import {
  AdminStatsDashboardSchema,
  AdminStatsSearchTermsSchema,
  AdminStatsUsersSchema,
  PaginatedAdminStatsActivitySchema,
  PaginatedAdminStatsBooksSchema,
} from '../../common/swagger/schemas/admin.schema';

export const AdminStatsControllerDocs = () => ApiJwtAdmin();

export const AdminStatsDashboardDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Dashboard global',
      description:
        'Métriques clés : utilisateurs actifs, abonnements, revenus du mois, livres publiés, lectures 7j, top 5 livres.',
    }),
    ApiOkResponse({ type: AdminStatsDashboardSchema }),
  );

export const AdminStatsBooksDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Statistiques par livre',
      description:
        'Données `StatistiqueLivre` paginées. Tri : `nb_lectures`, `note_moyenne`, `nb_terminees`, `nb_lectures_7j`.',
    }),
    ApiOkResponse({ type: PaginatedAdminStatsBooksSchema }),
  );

export const AdminStatsUsersDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Statistiques utilisateurs',
      description:
        'Croissance et répartition. Query `periode` : 7j | 30j | 90j | 365j (défaut 30j).',
    }),
    ApiOkResponse({ type: AdminStatsUsersSchema }),
  );

export const AdminStatsSearchTermsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Analyse des termes de recherche',
      description:
        'Basé sur `HistoriqueRecherche`. `periode` 7j|30j. `no_results=true` : termes dont toutes les recherches ont eu 0 résultat.',
    }),
    ApiOkResponse({ type: AdminStatsSearchTermsSchema }),
  );

export const AdminStatsActivityDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Activité récente (inscriptions et paiements)',
      description:
        'Fil chronologique des nouvelles inscriptions utilisateurs et des paiements. `periode` : 7j | 30j | 90j (défaut 7j). `type` : INSCRIPTION | PAIEMENT.',
    }),
    ApiOkResponse({ type: PaginatedAdminStatsActivitySchema }),
  );
