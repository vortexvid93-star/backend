import { Injectable, NotFoundException } from '@nestjs/common';
import { StatutDefi, StatutUserDefi } from '../../generated/prisma/enums';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ChallengesEngineService } from './challenges-engine.service';
import { computeProgressPercent } from './challenges-progress.util';
import { mapBadgeSummary } from './challenges.mapper';
import type { BadgesQueryDto } from './dto/badges-query.dto';

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ChallengesEngineService,
  ) {}

  async listBadges(authId: string, query: BadgesQueryDto) {
    await this.engine.syncExpiredParticipations(authId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const obtainedRows = await this.prisma.userBadge.findMany({
      where: { auth_id: authId },
      select: { badge_id: true },
    });
    const obtainedIds = new Set(obtainedRows.map((row) => row.badge_id));

    const allBadges = await this.prisma.badge.findMany({
      orderBy: [{ points: 'desc' }, { nom: 'asc' }],
    });

    let filtered = allBadges;
    if (query.obtenu === true) {
      filtered = allBadges.filter((b) => obtainedIds.has(b.id));
    } else if (query.obtenu === false) {
      filtered = allBadges.filter((b) => !obtainedIds.has(b.id));
    }

    const total = filtered.length;
    const pageRows = filtered.slice(skip, skip + limit);

    return {
      data: pageRows.map((badge) => ({
        id: badge.id,
        nom: badge.nom,
        icone: badge.icone,
        couleur: badge.couleur,
        description: badge.description,
        points: badge.points,
        obtenu: obtainedIds.has(badge.id),
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getBadgeById(authId: string, badgeId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge introuvable.');
    }

    const [userBadge, defisActifs] = await Promise.all([
      this.prisma.userBadge.findUnique({
        where: {
          auth_id_badge_id: { auth_id: authId, badge_id: badgeId },
        },
      }),
      this.prisma.defi.findMany({
        where: {
          badge_id: badgeId,
          statut: StatutDefi.ACTIF,
          date_fin: { gt: new Date() },
        },
        select: {
          id: true,
          titre: true,
          type: true,
          objectif_valeur: true,
          date_fin: true,
        },
        orderBy: { date_fin: 'asc' },
        take: 20,
      }),
    ]);

    return {
      ...mapBadgeSummary(badge),
      description: badge.description,
      obtenu: Boolean(userBadge),
      obtenu_le: userBadge?.createdAt.toISOString() ?? null,
      defis_actifs: defisActifs.map((defi) => ({
        id: defi.id,
        titre: defi.titre,
        type: defi.type,
        objectif_valeur: defi.objectif_valeur,
        date_fin: defi.date_fin.toISOString(),
      })),
    };
  }

  async getBadgePath(authId: string, badgeId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
    });
    if (!badge) {
      throw new NotFoundException('Badge introuvable.');
    }

    const [userBadge, defis, participations] = await Promise.all([
      this.prisma.userBadge.findUnique({
        where: { auth_id_badge_id: { auth_id: authId, badge_id: badgeId } },
      }),
      this.prisma.defi.findMany({
        where: { badge_id: badgeId },
        orderBy: { date_fin: 'desc' },
        take: 30,
      }),
      this.prisma.userDefi.findMany({
        where: {
          auth_id: authId,
          defi: { badge_id: badgeId },
        },
        include: { defi: true },
      }),
    ]);

    const partByDefi = new Map(participations.map((p) => [p.defi_id, p]));

    return {
      badge: mapBadgeSummary(badge),
      obtenu: Boolean(userBadge),
      obtenu_le: userBadge?.createdAt.toISOString() ?? null,
      defis: defis.map((defi) => {
        const part = partByDefi.get(defi.id);
        return {
          id: defi.id,
          titre: defi.titre,
          statut_defi: defi.statut,
          type: defi.type,
          objectif_valeur: defi.objectif_valeur,
          date_fin: defi.date_fin.toISOString(),
          participation: part
            ? {
                progression: part.progression,
                statut: part.statut,
                pourcentage: computeProgressPercent(
                  part.progression,
                  defi.objectif_valeur,
                ),
              }
            : null,
        };
      }),
      defis_completes_historique: participations
        .filter((p) => p.statut === StatutUserDefi.COMPLETE)
        .map((p) => ({
          defi_id: p.defi_id,
          titre: p.defi.titre,
          date_completion: p.date_completion?.toISOString() ?? null,
        })),
    };
  }

  async getNextBadge(authId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const obtained = await this.prisma.userBadge.findMany({
      where: { auth_id: authId },
      select: { badge_id: true },
    });
    const obtainedSet = new Set(obtained.map((r) => r.badge_id));

    const participations = await this.prisma.userDefi.findMany({
      where: {
        auth_id: authId,
        statut: StatutUserDefi.EN_COURS,
        defi: {
          statut: StatutDefi.ACTIF,
          date_fin: { gt: new Date() },
        },
      },
      include: { defi: { include: { badge: true } } },
    });

    const candidates = participations
      .filter((p) => !obtainedSet.has(p.defi.badge_id))
      .map((p) => ({
        badge: p.defi.badge,
        defi_id: p.defi_id,
        defi_titre: p.defi.titre,
        pourcentage: computeProgressPercent(
          p.progression,
          p.defi.objectif_valeur,
        ),
        progression: p.progression,
        objectif_valeur: p.defi.objectif_valeur,
      }))
      .sort((a, b) => b.pourcentage - a.pourcentage);

    if (candidates.length === 0) {
      const defiSansBadge = await this.prisma.defi.findFirst({
        where: {
          statut: StatutDefi.ACTIF,
          date_fin: { gt: new Date() },
          ...(obtainedSet.size > 0
            ? { badge_id: { notIn: [...obtainedSet] } }
            : {}),
          userdefis: { none: { auth_id: authId } },
        },
        include: { badge: true },
        orderBy: { date_fin: 'asc' },
      });

      if (!defiSansBadge) {
        return { prochain: null };
      }

      return {
        prochain: {
          badge: mapBadgeSummary(defiSansBadge.badge),
          defi: { id: defiSansBadge.id, titre: defiSansBadge.titre },
          pourcentage: 0,
          message: 'Rejoignez le défi pour débloquer ce badge.',
        },
      };
    }

    const best = candidates[0];
    return {
      prochain: {
        badge: mapBadgeSummary(best.badge),
        defi: { id: best.defi_id, titre: best.defi_titre },
        pourcentage: best.pourcentage,
        progression: best.progression,
        objectif_valeur: best.objectif_valeur,
        message: `Plus que ${best.objectif_valeur - best.progression} unité(s) sur « ${best.defi_titre} ».`,
      },
    };
  }
}
