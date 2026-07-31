import { Injectable, NotFoundException } from '@nestjs/common';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { AdminStatsService } from '../stats/admin-stats.service';
import { AdminUsersService } from '../users/users.service';
import { AdminPaymentsService } from '../payments/admin-payments.service';
import type { AdminPaymentsQueryDto } from '../payments/dto/admin-payments-query.dto';
import { AdminPerformanceService } from '../performance/admin-performance.service';
import type { AdminPerformanceQueryDto } from '../performance/dto/admin-performance-query.dto';
import { buildPdfBuffer } from './pdf.util';
import { buildWorkbookBuffer, type SheetSpec } from './excel.util';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

function formatDateHeure(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR');
}

function periodeLabel(query: AdminPaymentsQueryDto): string {
  if (query.dateDebut && query.dateFin) {
    return `du ${formatDate(query.dateDebut)} au ${formatDate(query.dateFin)}`;
  }
  if (query.dateDebut) {
    return `depuis le ${formatDate(query.dateDebut)}`;
  }
  if (query.dateFin) {
    return `jusqu'au ${formatDate(query.dateFin)}`;
  }
  return 'mois courant';
}

const EXPORT_PAYMENTS_LIMIT = 5000;

@Injectable()
export class AdminExportService {
  constructor(
    private readonly adminStatsService: AdminStatsService,
    private readonly adminUsersService: AdminUsersService,
    private readonly adminPaymentsService: AdminPaymentsService,
    private readonly adminPerformanceService: AdminPerformanceService,
  ) {}

  private async collectGlobalReport() {
    const [dashboard, searchTerms, readingHabits] = await Promise.all([
      this.adminStatsService.getDashboard(),
      this.adminStatsService.getSearchTermsStats({ periode: '30j' } as never),
      this.adminStatsService.getReadingHabits({ periode: '30j' }),
    ]);
    return { dashboard, searchTerms, readingHabits };
  }

  async getStatsPdf(): Promise<Buffer> {
    const { dashboard, searchTerms, readingHabits } =
      await this.collectGlobalReport();

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'B LINKS — Rapport statistiques', style: 'title' },
        {
          text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
          style: 'subtitle',
        },
        { text: 'Indicateurs clés', style: 'section' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Utilisateurs actifs', String(dashboard.nb_utilisateurs_actifs)],
              ['Abonnements actifs', String(dashboard.nb_abonnements_actifs)],
              [
                'Revenu du mois',
                `${dashboard.revenue_mois_courant.toLocaleString('fr-FR')} XAF`,
              ],
              ['Livres publiés', String(dashboard.nb_livres_publies)],
              ['Lectures (7 j)', String(dashboard.nb_lectures_7j)],
              ['Inscriptions (7 j)', String(dashboard.nb_inscriptions_7j)],
            ],
          },
        },
        { text: 'Top 5 livres', style: 'section' },
        {
          table: {
            widths: ['*', 'auto', 'auto'],
            body: [
              ['Titre', 'Lectures', 'Note'],
              ...dashboard.top_5_livres.map((l) => [
                l.titre,
                String(l.nb_lectures),
                l.note_moyenne != null ? l.note_moyenne.toFixed(1) : '—',
              ]),
            ],
          },
        },
        { text: 'Habitudes de lecture (30 derniers jours)', style: 'section' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Créneau préféré', readingHabits.creneau_prefere ?? '—'],
              [
                'Durée moyenne / session',
                `${readingHabits.duree_moyenne_session_min} min`,
              ],
              ['Sessions', String(readingHabits.nb_sessions)],
              ['Série moyenne', `${readingHabits.streak_moyen ?? 0} j`],
            ],
          },
        },
        { text: 'Top termes de recherche', style: 'section' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              ['Terme', 'Recherches'],
              ...searchTerms.data
                .slice(0, 10)
                .map((t) => [t.terme, String(t.nb_recherches)]),
            ],
          },
        },
      ],
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 9, color: '#666666', margin: [0, 0, 0, 16] },
        section: { fontSize: 13, bold: true, margin: [0, 16, 0, 8] },
      },
    };

    return buildPdfBuffer(docDefinition);
  }

  async getStatsXlsx(): Promise<Buffer> {
    const { dashboard, searchTerms, readingHabits } =
      await this.collectGlobalReport();

    const sheets: SheetSpec[] = [
      {
        name: 'KPIs',
        columns: [
          { header: 'Indicateur', key: 'label', width: 30 },
          { header: 'Valeur', key: 'value', width: 20 },
        ],
        rows: [
          { label: 'Utilisateurs actifs', value: dashboard.nb_utilisateurs_actifs },
          { label: 'Abonnements actifs', value: dashboard.nb_abonnements_actifs },
          { label: 'Revenu du mois (XAF)', value: dashboard.revenue_mois_courant },
          { label: 'Livres publiés', value: dashboard.nb_livres_publies },
          { label: 'Lectures (7j)', value: dashboard.nb_lectures_7j },
          { label: 'Inscriptions (7j)', value: dashboard.nb_inscriptions_7j },
        ],
      },
      {
        name: 'Top livres',
        columns: [
          { header: 'Titre', key: 'titre', width: 40 },
          { header: 'Type', key: 'type_livre', width: 15 },
          { header: 'Lectures', key: 'nb_lectures', width: 12 },
          { header: 'Note moyenne', key: 'note_moyenne', width: 14 },
        ],
        rows: dashboard.top_5_livres.map((l) => ({
          titre: l.titre,
          type_livre: l.type_livre,
          nb_lectures: l.nb_lectures,
          note_moyenne: l.note_moyenne ?? '',
        })),
      },
      {
        name: 'Habitudes de lecture',
        columns: [
          { header: 'Métrique', key: 'label', width: 30 },
          { header: 'Valeur', key: 'value', width: 20 },
        ],
        rows: [
          { label: 'Créneau préféré', value: readingHabits.creneau_prefere ?? '—' },
          {
            label: 'Durée moyenne / session (min)',
            value: readingHabits.duree_moyenne_session_min,
          },
          { label: 'Sessions', value: readingHabits.nb_sessions },
          { label: 'Série moyenne (j)', value: readingHabits.streak_moyen ?? 0 },
        ],
      },
      {
        name: 'Recherches',
        columns: [
          { header: 'Terme', key: 'terme', width: 30 },
          { header: 'Recherches', key: 'nb_recherches', width: 15 },
          { header: 'Taux de clic (%)', key: 'taux_clic', width: 16 },
        ],
        rows: searchTerms.data.map((t) => ({
          terme: t.terme,
          nb_recherches: t.nb_recherches,
          taux_clic: t.taux_clic,
        })),
      },
    ];

    return buildWorkbookBuffer(sheets);
  }

  private async collectUserReport(userId: string) {
    const [detail, readingHabits] = await Promise.all([
      this.adminUsersService.getUserDetail(userId).catch(() => null),
      this.adminUsersService.getReadingHabits(userId, { periode: '30j' }),
    ]);

    if (!detail) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return { detail, readingHabits };
  }

  async getUserPdf(userId: string): Promise<Buffer> {
    const { detail, readingHabits } = await this.collectUserReport(userId);

    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          text: `${detail.personne.prenom} ${detail.personne.nom}`,
          style: 'title',
        },
        { text: detail.auth.email, style: 'subtitle' },
        { text: 'Profil', style: 'section' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Statut', detail.auth.statut],
              ['Rôle', detail.auth.role],
              ['Commentaires', String(detail.nb_commentaires)],
              ['Notes laissées', String(detail.nb_notes)],
              ['Défis complétés', String(detail.nb_defis_completes)],
            ],
          },
        },
        { text: 'Historique abonnements', style: 'section' },
        detail.abonnements.length === 0
          ? { text: 'Aucun abonnement.', italics: true }
          : {
              table: {
                widths: ['*', 'auto', 'auto', 'auto'],
                body: [
                  ['Plan', 'Statut', 'Début', 'Fin'],
                  ...detail.abonnements.map((a) => [
                    a.plan,
                    a.statut,
                    formatDate(a.date_debut),
                    formatDate(a.date_fin),
                  ]),
                ],
              },
            },
        { text: 'Historique paiements', style: 'section' },
        detail.paiements.length === 0
          ? { text: 'Aucun paiement.', italics: true }
          : {
              table: {
                widths: ['*', 'auto', 'auto', 'auto'],
                body: [
                  ['Montant', 'Devise', 'Statut', 'Date'],
                  ...detail.paiements.map((p) => [
                    String(p.montant),
                    p.devise,
                    p.statut,
                    formatDate(p.createdAt),
                  ]),
                ],
              },
            },
        { text: 'Habitudes de lecture (30 derniers jours)', style: 'section' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Créneau préféré', readingHabits.creneau_prefere ?? '—'],
              [
                'Durée moyenne / session',
                `${readingHabits.duree_moyenne_session_min} min`,
              ],
              ['Série actuelle', `${readingHabits.streak_actuel ?? 0} j`],
              ['Meilleure série', `${readingHabits.streak_max ?? 0} j`],
            ],
          },
        },
      ],
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 9, color: '#666666', margin: [0, 0, 0, 16] },
        section: { fontSize: 13, bold: true, margin: [0, 16, 0, 8] },
      },
    };

    return buildPdfBuffer(docDefinition);
  }

  async getUserXlsx(userId: string): Promise<Buffer> {
    const { detail, readingHabits } = await this.collectUserReport(userId);

    const sheets: SheetSpec[] = [
      {
        name: 'Profil',
        columns: [
          { header: 'Champ', key: 'label', width: 25 },
          { header: 'Valeur', key: 'value', width: 30 },
        ],
        rows: [
          { label: 'Nom', value: `${detail.personne.prenom} ${detail.personne.nom}` },
          { label: 'Email', value: detail.auth.email },
          { label: 'Statut', value: detail.auth.statut },
          { label: 'Rôle', value: detail.auth.role },
          { label: 'Créneau préféré', value: readingHabits.creneau_prefere ?? '—' },
          {
            label: 'Durée moyenne / session (min)',
            value: readingHabits.duree_moyenne_session_min,
          },
          { label: 'Série actuelle (j)', value: readingHabits.streak_actuel ?? 0 },
        ],
      },
      {
        name: 'Abonnements',
        columns: [
          { header: 'Plan', key: 'plan', width: 20 },
          { header: 'Statut', key: 'statut', width: 15 },
          { header: 'Début', key: 'date_debut', width: 15 },
          { header: 'Fin', key: 'date_fin', width: 15 },
        ],
        rows: detail.abonnements.map((a) => ({
          plan: a.plan,
          statut: a.statut,
          date_debut: formatDate(a.date_debut),
          date_fin: formatDate(a.date_fin),
        })),
      },
      {
        name: 'Paiements',
        columns: [
          { header: 'Montant', key: 'montant', width: 15 },
          { header: 'Devise', key: 'devise', width: 10 },
          { header: 'Statut', key: 'statut', width: 15 },
          { header: 'Date', key: 'date', width: 15 },
        ],
        rows: detail.paiements.map((p) => ({
          montant: Number(p.montant),
          devise: p.devise,
          statut: p.statut,
          date: formatDate(p.createdAt),
        })),
      },
    ];

    return buildWorkbookBuffer(sheets);
  }

  private async collectPaymentsReport(query: AdminPaymentsQueryDto) {
    const { data: rows } = await this.adminPaymentsService.listPayments({
      ...query,
      page: 1,
      limit: EXPORT_PAYMENTS_LIMIT,
    });

    const hasDateFilter = Boolean(query.dateDebut || query.dateFin);
    const now = new Date();
    const moisCourantPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const estMoisCourant = (iso: string) => iso.startsWith(moisCourantPrefix);

    const succesTous = rows.filter((p) => p.statut === 'SUCCES');
    // Sans filtre de date explicite, le total reste borné au mois courant (comportement historique) ;
    // avec un filtre, `rows` est déjà scopé à la période choisie, donc on totalise tout ce qui a réussi dedans.
    const succesPourTotal = hasDateFilter
      ? succesTous
      : succesTous.filter((p) => estMoisCourant(p.createdAt));
    const totalEncaisse = succesPourTotal.reduce((acc, p) => acc + p.montant, 0);
    const enAttente = rows.filter((p) => p.statut === 'EN_ATTENTE').length;
    const echec = rows.filter((p) => p.statut === 'ECHEC').length;
    const moyenne =
      succesTous.length > 0
        ? Math.round(
            succesTous.reduce((acc, p) => acc + p.montant, 0) /
              succesTous.length,
          )
        : 0;

    return {
      rows,
      resume: { totalEncaisse, enAttente, echec, moyenne },
      periode: periodeLabel(query),
    };
  }

  async getPaymentsPdf(query: AdminPaymentsQueryDto): Promise<Buffer> {
    const { rows, resume, periode } = await this.collectPaymentsReport(query);

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'B LINKS — Rapport paiements', style: 'title' },
        {
          text: `Généré le ${new Date().toLocaleDateString('fr-FR')} — Période : ${periode}`,
          style: 'subtitle',
        },
        { text: 'Résumé financier', style: 'section' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                `Total encaissé (${periode})`,
                `${resume.totalEncaisse.toLocaleString('fr-FR')} XAF`,
              ],
              ['Transaction moyenne (réussies)', `${resume.moyenne.toLocaleString('fr-FR')} XAF`],
              ['Paiements en attente', String(resume.enAttente)],
              ['Paiements échoués', String(resume.echec)],
              ['Total lignes exportées', String(rows.length)],
            ],
          },
        },
        { text: 'Détail des paiements', style: 'section' },
        {
          table: {
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['Utilisateur', 'Plan', 'Montant', 'Opérateur', 'Statut', 'Date'],
              ...rows.map((p) => [
                p.auth.email,
                p.plan.plan,
                `${p.montant.toLocaleString('fr-FR')} ${p.devise}`,
                p.operateur ?? '—',
                p.statut,
                formatDateHeure(p.createdAt),
              ]),
            ],
          },
        },
      ],
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 9, color: '#666666', margin: [0, 0, 0, 16] },
        section: { fontSize: 13, bold: true, margin: [0, 16, 0, 8] },
      },
    };

    return buildPdfBuffer(docDefinition);
  }

  async getPaymentsXlsx(query: AdminPaymentsQueryDto): Promise<Buffer> {
    const { rows, resume, periode } = await this.collectPaymentsReport(query);

    const sheets: SheetSpec[] = [
      {
        name: 'Résumé',
        columns: [
          { header: 'Indicateur', key: 'label', width: 35 },
          { header: 'Valeur', key: 'value', width: 20 },
        ],
        rows: [
          { label: 'Période', value: periode },
          { label: `Total encaissé (${periode}, XAF)`, value: resume.totalEncaisse },
          { label: 'Transaction moyenne réussie (XAF)', value: resume.moyenne },
          { label: 'Paiements en attente', value: resume.enAttente },
          { label: 'Paiements échoués', value: resume.echec },
          { label: 'Total lignes exportées', value: rows.length },
        ],
      },
      {
        name: 'Paiements',
        columns: [
          { header: 'Utilisateur', key: 'utilisateur', width: 28 },
          { header: 'Plan', key: 'plan', width: 15 },
          { header: 'Montant', key: 'montant', width: 14 },
          { header: 'Devise', key: 'devise', width: 10 },
          { header: 'Opérateur', key: 'operateur', width: 16 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: 'Réf. transaction', key: 'ref_transaction', width: 24 },
          { header: 'Date', key: 'date', width: 18 },
        ],
        rows: rows.map((p) => ({
          utilisateur: p.auth.email,
          plan: p.plan.plan,
          montant: p.montant,
          devise: p.devise,
          operateur: p.operateur ?? '',
          statut: p.statut,
          ref_transaction: p.ref_transaction ?? '',
          date: formatDateHeure(p.createdAt),
        })),
      },
    ];

    return buildWorkbookBuffer(sheets);
  }

  async getPerformancePdf(query: AdminPerformanceQueryDto): Promise<Buffer> {
    const overview = await this.adminPerformanceService.getOverview(query);
    const variation =
      overview.revenu.variation_pct === null
        ? 'N/A (pas de données sur la période précédente)'
        : `${overview.revenu.variation_pct >= 0 ? '+' : ''}${overview.revenu.variation_pct.toLocaleString('fr-FR')} % vs période précédente`;

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'B LINKS — Rapport Performance', style: 'title' },
        {
          text: `Généré le ${new Date().toLocaleDateString('fr-FR')} — Période : ${overview.periode}`,
          style: 'subtitle',
        },
        { text: 'Revenu', style: 'section' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                'Revenu total',
                `${overview.revenu.total_periode.toLocaleString('fr-FR')} XAF`,
              ],
              ['Variation', variation],
              [
                'Individuel',
                `${overview.revenu.individuel_total.toLocaleString('fr-FR')} XAF`,
              ],
              [
                'Établissement',
                `${overview.revenu.etablissement_total.toLocaleString('fr-FR')} XAF`,
              ],
              [
                'Taux de succès paiement',
                `${overview.paiements.taux_succes_pct.toLocaleString('fr-FR')} %`,
              ],
              ['Paiements réussis', String(overview.paiements.succes)],
              ['Paiements en attente', String(overview.paiements.en_attente)],
              ['Paiements échoués', String(overview.paiements.echec)],
            ],
          },
        },
        { text: 'Performance par établissement', style: 'section' },
        {
          table: {
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['Établissement', 'Statut', 'Revenu', 'Membres actifs', 'Lecture (min)'],
              ...overview.etablissements.map((e) => [
                e.nom,
                e.statut,
                e.revenu
                  ? `${e.revenu.montant.toLocaleString('fr-FR')} ${e.revenu.devise} (${e.revenu.statut})`
                  : '—',
                `${e.membres_actifs_lecteurs} / ${e.membres_total}`,
                String(e.minutes_lecture_total),
              ]),
            ],
          },
        },
      ],
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 9, color: '#666666', margin: [0, 0, 0, 16] },
        section: { fontSize: 13, bold: true, margin: [0, 16, 0, 8] },
      },
    };

    return buildPdfBuffer(docDefinition);
  }

  async getPerformanceXlsx(query: AdminPerformanceQueryDto): Promise<Buffer> {
    const overview = await this.adminPerformanceService.getOverview(query);

    const sheets: SheetSpec[] = [
      {
        name: 'Résumé',
        columns: [
          { header: 'Indicateur', key: 'label', width: 35 },
          { header: 'Valeur', key: 'value', width: 20 },
        ],
        rows: [
          { label: 'Période', value: overview.periode },
          { label: 'Revenu total (XAF)', value: overview.revenu.total_periode },
          {
            label: 'Variation vs période précédente (%)',
            value: overview.revenu.variation_pct ?? 'N/A',
          },
          { label: 'Revenu individuel (XAF)', value: overview.revenu.individuel_total },
          {
            label: 'Revenu établissement (XAF)',
            value: overview.revenu.etablissement_total,
          },
          {
            label: 'Taux de succès paiement (%)',
            value: overview.paiements.taux_succes_pct,
          },
          { label: 'Paiements réussis', value: overview.paiements.succes },
          { label: 'Paiements en attente', value: overview.paiements.en_attente },
          { label: 'Paiements échoués', value: overview.paiements.echec },
        ],
      },
      {
        name: 'Établissements',
        columns: [
          { header: 'Établissement', key: 'nom', width: 28 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: 'Revenu', key: 'revenu', width: 16 },
          { header: 'Statut paiement', key: 'statut_paiement', width: 16 },
          { header: 'Membres actifs lecteurs', key: 'membres_actifs', width: 20 },
          { header: 'Membres total', key: 'membres_total', width: 14 },
          { header: 'Lecture (min)', key: 'minutes', width: 14 },
        ],
        rows: overview.etablissements.map((e) => ({
          nom: e.nom,
          statut: e.statut,
          revenu: e.revenu ? e.revenu.montant : '',
          statut_paiement: e.revenu?.statut ?? '',
          membres_actifs: e.membres_actifs_lecteurs,
          membres_total: e.membres_total,
          minutes: e.minutes_lecture_total,
        })),
      },
    ];

    return buildWorkbookBuffer(sheets);
  }
}
