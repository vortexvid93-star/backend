import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';

export const AdminPerformanceControllerDocs = () => ApiJwtAdmin();

export const AdminPerformanceOverviewDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Vue d’ensemble business de la plateforme',
      description:
        'Revenu journalier (abonnements individuels + packs établissement fusionnés), santé des paiements (succès/attente/échec, taux de succès), et performance de chaque établissement (revenu réel + engagement de lecture réel de ses membres). Filtrable par `periode` (`7j`, `30j`, `90j`, `365j`, défaut `30j`).',
    }),
    ApiOkResponse({ description: 'Vue d’ensemble calculée.' }),
  );
