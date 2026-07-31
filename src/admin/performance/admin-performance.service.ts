import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { StatutPaiement } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { dateDepuisJours, parsePeriodeJours } from '../stats/admin-periode.util';
import type { AdminPerformanceQueryDto } from './dto/admin-performance-query.dto';

type RevenueRow = { montant: Prisma.Decimal; createdAt: Date };

function bucketByDay(rows: RevenueRow[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(row.montant));
  }
  return byDay;
}

@Injectable()
export class AdminPerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vue d'ensemble business de la plateforme : revenu (individuel +
   * établissement fusionnés) en série journalière, santé des paiements, et
   * performance de chaque établissement (revenu + engagement de lecture réel
   * de ses membres) — calculée en une poignée de requêtes groupées plutôt
   * qu'en bouclant sur chaque établissement (évite le N+1).
   */
  async getOverview(query: AdminPerformanceQueryDto) {
    const periode = query.periode ?? '30j';
    const jours = parsePeriodeJours(periode, '30j');
    const since = dateDepuisJours(jours);
    // Fenêtre de même durée juste avant `since`, pour afficher une variation
    // (ex. "+12 % vs période précédente"), comme les tableaux de bord SaaS.
    const previousSince = dateDepuisJours(jours * 2);

    const [
      individuelSucces,
      etablissementSucces,
      individuelSuccesPrecedent,
      etablissementSuccesPrecedent,
      individuelEnAttente,
      individuelEchec,
      etablissementEnAttente,
      etablissementEchec,
      etablissements,
      membres,
      lectureParUtilisateur,
    ] = await Promise.all([
      this.prisma.paiement.findMany({
        where: { statut: StatutPaiement.SUCCES, createdAt: { gte: since } },
        select: { montant: true, createdAt: true },
      }),
      this.prisma.paiementEtablissement.findMany({
        where: { statut: StatutPaiement.SUCCES, createdAt: { gte: since } },
        select: { montant: true, createdAt: true },
      }),
      this.prisma.paiement.aggregate({
        where: {
          statut: StatutPaiement.SUCCES,
          createdAt: { gte: previousSince, lt: since },
        },
        _sum: { montant: true },
      }),
      this.prisma.paiementEtablissement.aggregate({
        where: {
          statut: StatutPaiement.SUCCES,
          createdAt: { gte: previousSince, lt: since },
        },
        _sum: { montant: true },
      }),
      this.prisma.paiement.count({
        where: { statut: StatutPaiement.EN_ATTENTE, createdAt: { gte: since } },
      }),
      this.prisma.paiement.count({
        where: { statut: StatutPaiement.ECHEC, createdAt: { gte: since } },
      }),
      this.prisma.paiementEtablissement.count({
        where: { statut: StatutPaiement.EN_ATTENTE, createdAt: { gte: since } },
      }),
      this.prisma.paiementEtablissement.count({
        where: { statut: StatutPaiement.ECHEC, createdAt: { gte: since } },
      }),
      this.prisma.etablissement.findMany({
        include: { paiement: true },
      }),
      this.prisma.etablissementMembre.findMany({
        select: { etablissement_id: true, auth_id: true },
      }),
      this.prisma.sessionLecture.groupBy({
        by: ['auth_id'],
        _sum: { duree_min: true },
        _count: true,
      }),
    ]);

    const byDay = bucketByDay(individuelSucces);
    for (const [day, montant] of bucketByDay(etablissementSucces)) {
      byDay.set(day, (byDay.get(day) ?? 0) + montant);
    }
    const serie_jour = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, montant]) => ({ date, montant }));

    const individuel_total = individuelSucces.reduce(
      (s, r) => s + Number(r.montant),
      0,
    );
    const etablissement_total = etablissementSucces.reduce(
      (s, r) => s + Number(r.montant),
      0,
    );
    const total_periode = individuel_total + etablissement_total;

    const total_periode_precedente =
      Number(individuelSuccesPrecedent._sum.montant ?? 0) +
      Number(etablissementSuccesPrecedent._sum.montant ?? 0);
    const variation_pct =
      total_periode_precedente === 0
        ? null
        : Math.round(
            ((total_periode - total_periode_precedente) /
              total_periode_precedente) *
              10000,
          ) / 100;

    const succes = individuelSucces.length + etablissementSucces.length;
    const en_attente = individuelEnAttente + etablissementEnAttente;
    const echec = individuelEchec + etablissementEchec;
    const totalPaiements = succes + en_attente + echec;
    const taux_succes_pct =
      totalPaiements === 0
        ? 0
        : Math.round((succes / totalPaiements) * 10000) / 100;

    const lectureParAuth = new Map(
      lectureParUtilisateur.map((row) => [
        row.auth_id,
        { minutes: row._sum.duree_min ?? 0 },
      ]),
    );
    const membresParEtablissement = new Map<string, string[]>();
    for (const m of membres) {
      const list = membresParEtablissement.get(m.etablissement_id) ?? [];
      list.push(m.auth_id);
      membresParEtablissement.set(m.etablissement_id, list);
    }

    const etablissementsPerf = etablissements
      .map((etab) => {
        const authIds = membresParEtablissement.get(etab.id) ?? [];
        let minutes_lecture_total = 0;
        let membres_actifs_lecteurs = 0;
        for (const authId of authIds) {
          const lecture = lectureParAuth.get(authId);
          if (lecture) {
            minutes_lecture_total += lecture.minutes;
            membres_actifs_lecteurs += 1;
          }
        }
        return {
          id: etab.id,
          nom: etab.nom,
          statut: etab.statut,
          revenu: etab.paiement
            ? {
                montant: Number(etab.paiement.montant),
                devise: etab.paiement.devise,
                statut: etab.paiement.statut,
              }
            : null,
          membres_total: authIds.length,
          membres_actifs_lecteurs,
          minutes_lecture_total,
        };
      })
      .sort((a, b) => (b.revenu?.montant ?? 0) - (a.revenu?.montant ?? 0));

    return {
      periode,
      revenu: {
        total_periode,
        total_periode_precedente,
        variation_pct,
        individuel_total,
        etablissement_total,
        serie_jour,
      },
      paiements: { succes, en_attente, echec, taux_succes_pct },
      etablissements: etablissementsPerf,
      top_etablissement: etablissementsPerf[0] ?? null,
    };
  }
}
