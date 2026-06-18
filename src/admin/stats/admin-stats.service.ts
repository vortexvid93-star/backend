import { Injectable } from '@nestjs/common';
import {
  AuthProvider,
  AuthRole,
  AuthStatut,
  StatutAbonnement,
  StatutLivre,
  StatutPaiement,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  dateDepuisJours,
  debutMoisCourant,
  parsePeriodeJours,
} from './admin-periode.util';
import type { AdminStatsBooksQueryDto } from './dto/admin-stats-books-query.dto';
import type { AdminStatsSearchTermsQueryDto } from './dto/admin-stats-search-terms-query.dto';
import type { AdminStatsUsersQueryDto } from './dto/admin-stats-users-query.dto';
import {
  AdminActivityType,
  type AdminStatsActivityQueryDto,
} from './dto/admin-stats-activity-query.dto';

function activeAbonnementsWhere(at: Date) {
  return {
    statut: StatutAbonnement.ACTIF,
    date_debut: { lte: at },
    date_fin: { gt: at },
  };
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const septJours = dateDepuisJours(7, now);
    const debutMois = debutMoisCourant(now);

    const [
      nb_utilisateurs_actifs,
      nb_abonnements_actifs,
      revenueAgg,
      nb_livres_publies,
      lectures7jAgg,
      nb_inscriptions_7j,
      nb_paiements_succes_7j,
      topStats,
    ] = await Promise.all([
      this.prisma.auth.count({ where: { statut: AuthStatut.ACTIF } }),
      this.prisma.abonnement.count({
        where: activeAbonnementsWhere(now),
      }),
      this.prisma.paiement.aggregate({
        where: {
          statut: StatutPaiement.SUCCES,
          createdAt: { gte: debutMois },
        },
        _sum: { montant: true },
      }),
      this.prisma.livre.count({ where: { statut: StatutLivre.PUBLIE } }),
      this.prisma.statistiqueLivre.aggregate({
        _sum: { nb_lectures_7j: true },
      }),
      this.prisma.auth.count({
        where: { date_inscription: { gte: septJours } },
      }),
      this.prisma.paiement.count({
        where: {
          statut: StatutPaiement.SUCCES,
          createdAt: { gte: septJours },
        },
      }),
      this.prisma.statistiqueLivre.findMany({
        include: {
          livre: {
            select: { titre: true, type_livre: true, statut: true },
          },
        },
        orderBy: { nb_lectures: 'desc' },
        take: 5,
      }),
    ]);

    return {
      nb_utilisateurs_actifs,
      nb_abonnements_actifs,
      revenue_mois_courant: Number(revenueAgg._sum.montant ?? 0),
      nb_livres_publies,
      nb_lectures_7j: lectures7jAgg._sum.nb_lectures_7j ?? 0,
      nb_inscriptions_7j,
      nb_paiements_succes_7j,
      top_5_livres: topStats.map((row) => ({
        titre: row.livre.titre,
        type_livre: row.livre.type_livre,
        nb_lectures: row.nb_lectures,
        note_moyenne: row.note_moyenne,
      })),
    };
  }

  async getBookStats(query: AdminStatsBooksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? 'nb_lectures';

    const orderBy: Prisma.StatistiqueLivreOrderByWithRelationInput = {
      [sort]: 'desc',
    };

    const [rows, total] = await Promise.all([
      this.prisma.statistiqueLivre.findMany({
        include: {
          livre: {
            select: { id: true, titre: true, type_livre: true, statut: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.statistiqueLivre.count(),
    ]);

    return {
      data: rows.map((row) => ({
        livre: {
          id: row.livre.id,
          titre: row.livre.titre,
          type_livre: row.livre.type_livre,
          statut: row.livre.statut,
        },
        nb_lectures: row.nb_lectures,
        nb_terminees: row.nb_terminees,
        note_moyenne: row.note_moyenne,
        nb_notes: row.nb_notes,
        nb_lectures_7j: row.nb_lectures_7j,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getUserStats(query: AdminStatsUsersQueryDto) {
    const jours = parsePeriodeJours(query.periode, '30j');
    const since = dateDepuisJours(jours);
    const now = new Date();

    const inscriptions = await this.prisma.auth.findMany({
      where: { date_inscription: { gte: since } },
      select: {
        date_inscription: true,
        statut: true,
        auth_provider: true,
      },
    });

    const byDay = new Map<string, number>();
    const repartition_provider: Record<AuthProvider, number> = {
      LOCAL: 0,
      GOOGLE: 0,
      HYBRID: 0,
    };
    const repartition_statut: Record<AuthStatut, number> = {
      PENDING: 0,
      ACTIF: 0,
      BANNI: 0,
    };

    let actifsSurPeriode = 0;

    for (const row of inscriptions) {
      const day = row.date_inscription.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      repartition_provider[row.auth_provider] += 1;
      repartition_statut[row.statut] += 1;
      if (row.statut === AuthStatut.ACTIF) actifsSurPeriode += 1;
    }

    const inscriptions_par_jour = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const totalPeriode = inscriptions.length;
    const taux_activation =
      totalPeriode === 0
        ? 0
        : Math.round((actifsSurPeriode / totalPeriode) * 10000) / 100;

    const abonnesActifs = await this.prisma.abonnement.findMany({
      where: activeAbonnementsWhere(now),
      select: { auth_id: true },
      distinct: ['auth_id'],
    });

    const nb_abonnes_actifs = abonnesActifs.length;

    return {
      inscriptions_par_jour,
      repartition_provider,
      repartition_statut,
      taux_activation,
      nb_abonnes_actifs,
    };
  }

  async getSearchTermsStats(query: AdminStatsSearchTermsQueryDto) {
    const joursEffectifs = query.periode === '7j' ? 7 : 30;
    const since = dateDepuisJours(joursEffectifs);

    const rows = await this.prisma.historiqueRecherche.findMany({
      where: { createdAt: { gte: since } },
      select: {
        terme: true,
        nb_resultats: true,
        a_clique: true,
      },
    });

    const rowsForData = query.no_results
      ? rows.filter((row) => row.nb_resultats === 0)
      : rows;

    type Agg = {
      nb_recherches: number;
      clics: number;
      sum_resultats: number;
    };

    const map = new Map<string, Agg>();

    for (const row of rowsForData) {
      const terme = row.terme.trim().toLowerCase();
      const agg = map.get(terme) ?? {
        nb_recherches: 0,
        clics: 0,
        sum_resultats: 0,
      };
      agg.nb_recherches += 1;
      if (row.a_clique) agg.clics += 1;
      agg.sum_resultats += row.nb_resultats;
      map.set(terme, agg);
    }

    const data = [...map.entries()]
      .map(([terme, agg]) => ({
        terme,
        nb_recherches: agg.nb_recherches,
        taux_clic:
          agg.nb_recherches === 0
            ? 0
            : Math.round((agg.clics / agg.nb_recherches) * 10000) / 100,
        nb_resultats_moyen:
          agg.nb_recherches === 0
            ? 0
            : Math.round((agg.sum_resultats / agg.nb_recherches) * 100) / 100,
      }))
      .sort((a, b) => b.nb_recherches - a.nb_recherches);

    const sansResultMap = new Map<string, number>();
    for (const row of rows) {
      if (row.nb_resultats !== 0) continue;
      const terme = row.terme.trim().toLowerCase();
      sansResultMap.set(terme, (sansResultMap.get(terme) ?? 0) + 1);
    }

    const top_sans_resultats = [...sansResultMap.entries()]
      .map(([terme, nb_recherches]) => ({ terme, nb_recherches }))
      .sort((a, b) => b.nb_recherches - a.nb_recherches)
      .slice(0, 10);

    return { data, top_sans_resultats };
  }

  async getActivity(query: AdminStatsActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const fetchSize = page * limit;
    const jours = parsePeriodeJours(query.periode, '7j');
    const since = dateDepuisJours(jours);

    const includeInscriptions =
      !query.type || query.type === AdminActivityType.INSCRIPTION;
    const includePaiements =
      !query.type || query.type === AdminActivityType.PAIEMENT;

    type ActivityRow = {
      type: AdminActivityType;
      date: Date;
      payload: Record<string, unknown>;
    };

    const fetches: Promise<ActivityRow[]>[] = [];

    if (includeInscriptions) {
      fetches.push(
        this.prisma.auth
          .findMany({
            where: {
              role: AuthRole.USER,
              date_inscription: { gte: since },
            },
            orderBy: { date_inscription: 'desc' },
            take: fetchSize,
            include: {
              personne: { select: { nom: true, prenom: true } },
            },
          })
          .then((rows) =>
            rows.map((row) => ({
              type: AdminActivityType.INSCRIPTION as const,
              date: row.date_inscription,
              payload: {
                auth_id: row.id,
                email: row.email,
                nom: row.personne.nom,
                prenom: row.personne.prenom,
                auth_provider: row.auth_provider,
                statut: row.statut,
              },
            })),
          ),
      );
    }

    if (includePaiements) {
      fetches.push(
        this.prisma.paiement
          .findMany({
            where: { createdAt: { gte: since } },
            orderBy: { createdAt: 'desc' },
            take: fetchSize,
            include: {
              auth: {
                select: {
                  id: true,
                  email: true,
                  personne: { select: { nom: true, prenom: true } },
                },
              },
              plan: { select: { plan: true } },
            },
          })
          .then((rows) =>
            rows.map((row) => ({
              type: AdminActivityType.PAIEMENT as const,
              date: row.createdAt,
              payload: {
                id: row.id,
                auth_id: row.auth.id,
                email: row.auth.email,
                nom: row.auth.personne.nom,
                prenom: row.auth.personne.prenom,
                montant: Number(row.montant),
                devise: row.devise,
                statut: row.statut,
                operateur: row.operateur,
                plan: row.plan.plan,
              },
            })),
          ),
      );
    }

    const merged = (await Promise.all(fetches))
      .flat()
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const skip = (page - 1) * limit;
    const slice = merged.slice(skip, skip + limit);

    const countPromises: Promise<number>[] = [];
    if (includeInscriptions) {
      countPromises.push(
        this.prisma.auth.count({
          where: {
            role: AuthRole.USER,
            date_inscription: { gte: since },
          },
        }),
      );
    }
    if (includePaiements) {
      countPromises.push(
        this.prisma.paiement.count({
          where: { createdAt: { gte: since } },
        }),
      );
    }

    const counts = await Promise.all(countPromises);
    const total = query.type
      ? (counts[0] ?? 0)
      : counts.reduce((sum, n) => sum + n, 0);

    return {
      data: slice.map((item) => ({
        type: item.type,
        date: item.date.toISOString(),
        ...item.payload,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
