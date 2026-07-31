import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiProduces } from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';

export const AdminExportControllerDocs = () => ApiJwtAdmin();

export const AdminExportStatsPdfDocs = () =>
  applyDecorators(
    ApiProduces('application/pdf'),
    ApiOperation({
      summary: 'Export PDF du rapport statistiques global',
      description:
        'KPIs, top livres, habitudes de lecture et termes de recherche — document PDF téléchargeable.',
    }),
  );

export const AdminExportStatsXlsxDocs = () =>
  applyDecorators(
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiOperation({
      summary: 'Export Excel du rapport statistiques global',
      description: 'Même contenu que le PDF, réparti sur plusieurs feuilles.',
    }),
  );

export const AdminExportUserPdfDocs = () =>
  applyDecorators(
    ApiProduces('application/pdf'),
    ApiOperation({
      summary: 'Export PDF du profil utilisateur',
      description:
        'Profil, historique abonnements/paiements et habitudes de lecture.',
    }),
  );

export const AdminExportUserXlsxDocs = () =>
  applyDecorators(
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiOperation({
      summary: 'Export Excel du profil utilisateur',
      description: 'Même contenu que le PDF, réparti sur plusieurs feuilles.',
    }),
  );

export const AdminExportPaymentsPdfDocs = () =>
  applyDecorators(
    ApiProduces('application/pdf'),
    ApiOperation({
      summary: 'Export PDF des paiements',
      description:
        'Résumé financier + détail des paiements, filtrable par `statut`/`operateur` (mêmes filtres que la liste admin).',
    }),
  );

export const AdminExportPaymentsXlsxDocs = () =>
  applyDecorators(
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiOperation({
      summary: 'Export Excel des paiements',
      description: 'Même contenu que le PDF, réparti sur plusieurs feuilles.',
    }),
  );

export const AdminExportPerformancePdfDocs = () =>
  applyDecorators(
    ApiProduces('application/pdf'),
    ApiOperation({
      summary: 'Export PDF de la vue Performance',
      description:
        'Revenu (individuel + établissement), santé des paiements et performance de chaque établissement — filtrable par `periode`.',
    }),
  );

export const AdminExportPerformanceXlsxDocs = () =>
  applyDecorators(
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiOperation({
      summary: 'Export Excel de la vue Performance',
      description: 'Même contenu que le PDF, réparti sur plusieurs feuilles.',
    }),
  );
