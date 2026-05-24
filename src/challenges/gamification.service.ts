import { Injectable } from '@nestjs/common';
import {
  StatutDefi,
  StatutUserDefi,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ChallengesEngineService } from './challenges-engine.service';
import {
  computeDaysRemaining,
  computeProgressPercent,
} from './challenges-progress.util';

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ChallengesEngineService,
  ) {}

  async getOverview(authId: string) {
    await this.engine.syncExpiredParticipations(authId);
    const now = new Date();

    const [
      badgesObtenus,
      totalBadges,
      userBadges,
      defisEnCours,
      defisCompletes,
      defisEchoques,
      participationsActives,
      dernierBadge,
      defiUrgent,
    ] = await Promise.all([
      this.prisma.userBadge.count({ where: { auth_id: authId } }),
      this.prisma.badge.count(),
      this.prisma.userBadge.findMany({
        where: { auth_id: authId },
        include: { badge: { select: { points: true } } },
      }),
      this.prisma.userDefi.count({
        where: { auth_id: authId, statut: StatutUserDefi.EN_COURS },
      }),
      this.prisma.userDefi.count({
        where: { auth_id: authId, statut: StatutUserDefi.COMPLETE },
      }),
      this.prisma.userDefi.count({
        where: { auth_id: authId, statut: StatutUserDefi.ECHOUE },
      }),
      this.prisma.userDefi.findMany({
        where: {
          auth_id: authId,
          statut: StatutUserDefi.EN_COURS,
          defi: { statut: StatutDefi.ACTIF, date_fin: { gt: now } },
        },
        include: { defi: { include: { badge: true } } },
        orderBy: { defi: { date_fin: 'asc' } },
        take: 3,
      }),
      this.prisma.userBadge.findFirst({
        where: { auth_id: authId },
        include: { badge: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userDefi.findFirst({
        where: {
          auth_id: authId,
          statut: StatutUserDefi.EN_COURS,
          defi: {
            statut: StatutDefi.ACTIF,
            date_fin: { gt: now, lte: new Date(now.getTime() + 7 * 86400000) },
          },
        },
        include: { defi: true },
        orderBy: { defi: { date_fin: 'asc' } },
      }),
    ]);

    const points_badges = userBadges.reduce(
      (s, r) => s + r.badge.points,
      0,
    );

    const bonusRows = await this.prisma.userDefi.findMany({
      where: { auth_id: authId, statut: StatutUserDefi.COMPLETE },
      include: { defi: { select: { points_bonus: true } } },
    });
    const points_bonus_defis = bonusRows.reduce(
      (s, r) => s + r.defi.points_bonus,
      0,
    );

    return {
      badges: {
        obtenus: badgesObtenus,
        total: totalBadges,
        pourcentage:
          totalBadges === 0
            ? 0
            : Math.round((badgesObtenus / totalBadges) * 10000) / 100,
        points_badges,
      },
      defis: {
        en_cours: defisEnCours,
        completes: defisCompletes,
        echoques: defisEchoques,
        actifs_resume: participationsActives.map((row) => ({
          defi_id: row.defi_id,
          titre: row.defi.titre,
          progression: row.progression,
          objectif_valeur: row.defi.objectif_valeur,
          pourcentage: computeProgressPercent(
            row.progression,
            row.defi.objectif_valeur,
          ),
          jours_restants: computeDaysRemaining(row.defi.date_fin, now),
          badge_icone: row.defi.badge.icone,
        })),
      },
      points_total: points_badges + points_bonus_defis,
      points_bonus_defis,
      badge_recent: dernierBadge
        ? {
            nom: dernierBadge.badge.nom,
            icone: dernierBadge.badge.icone,
            couleur: dernierBadge.badge.couleur,
            obtenu_le: dernierBadge.createdAt.toISOString(),
          }
        : null,
      defi_urgent: defiUrgent
        ? {
            defi_id: defiUrgent.defi_id,
            titre: defiUrgent.defi.titre,
            jours_restants: computeDaysRemaining(defiUrgent.defi.date_fin, now),
            pourcentage: computeProgressPercent(
              defiUrgent.progression,
              defiUrgent.defi.objectif_valeur,
            ),
          }
        : null,
    };
  }
}
