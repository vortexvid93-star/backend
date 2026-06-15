import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatutDefi,
  StatutProgression,
  StatutUserDefi,
  TypeDefi,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  analyzeMission,
  computeInitialMissionProgress,
} from './challenges-mission-plan.util';
import { ChallengesEngineService } from './challenges-engine.service';
import {
  computeDaysRemaining,
  computeProgressPercent,
} from './challenges-progress.util';
import { mapChallengeDetail, mapChallengeListItem } from './challenges.mapper';
import type { ChallengesQueryDto } from './dto/challenges-query.dto';
import type { ExpiringQueryDto } from './dto/expiring-query.dto';
import type { RecommendedQueryDto } from './dto/recommended-query.dto';

const activeDefiWhere = (): Prisma.DefiWhereInput => ({
  statut: StatutDefi.ACTIF,
  date_fin: { gt: new Date() },
});

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ChallengesEngineService,
  ) {}

  async listActiveChallenges(authId: string, query: ChallengesQueryDto) {
    await this.engine.syncExpiredParticipations(authId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DefiWhereInput = {
      ...activeDefiWhere(),
      ...(query.type ? { type: query.type } : {}),
      ...(query.categorie_id ? { categorie_id: query.categorie_id } : {}),
      ...(query.auteur_id ? { auteur_id: query.auteur_id } : {}),
      ...(query.livre_id ? { livre_id: query.livre_id } : {}),
      ...(query.inscrit === true
        ? { userdefis: { some: { auth_id: authId } } }
        : query.inscrit === false
          ? { userdefis: { none: { auth_id: authId } } }
          : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.defi.findMany({
        where,
        include: {
          badge: true,
          userdefis: { where: { auth_id: authId }, take: 1 },
        },
        orderBy: [{ date_fin: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.defi.count({ where }),
    ]);

    return {
      data: rows.map((row) =>
        this.enrichListItem(row, row.userdefis[0] ?? null),
      ),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getRecommended(authId: string, query: RecommendedQueryDto) {
    await this.engine.syncExpiredParticipations(authId);
    const limit = query.limit ?? 5;
    const now = new Date();

    const [categorieScores, candidats] = await Promise.all([
      this.prisma.progressionLecture.findMany({
        where: {
          auth_id: authId,
          statut: StatutProgression.TERMINE,
        },
        select: {
          livre: {
            select: {
              appartenir: { select: { categorie_id: true } },
              livre_auteurs: { select: { auteur_id: true } },
            },
          },
        },
        take: 50,
      }),
      this.prisma.defi.findMany({
        where: {
          ...activeDefiWhere(),
          userdefis: { none: { auth_id: authId } },
        },
        include: {
          badge: true,
          userdefis: { where: { auth_id: authId }, take: 1 },
        },
        orderBy: { date_fin: 'asc' },
        take: 50,
      }),
    ]);

    const catCount = new Map<string, number>();
    const autCount = new Map<string, number>();
    for (const row of categorieScores) {
      for (const a of row.livre.appartenir) {
        catCount.set(a.categorie_id, (catCount.get(a.categorie_id) ?? 0) + 1);
      }
      for (const la of row.livre.livre_auteurs) {
        autCount.set(la.auteur_id, (autCount.get(la.auteur_id) ?? 0) + 1);
      }
    }

    const scored = candidats
      .map((defi) => {
        let score = 0;
        if (
          defi.type === TypeDefi.CATEGORIE &&
          defi.categorie_id &&
          catCount.has(defi.categorie_id)
        ) {
          score += 10 + (catCount.get(defi.categorie_id) ?? 0);
        }
        if (
          defi.type === TypeDefi.AUTEUR &&
          defi.auteur_id &&
          autCount.has(defi.auteur_id)
        ) {
          score += 10 + (autCount.get(defi.auteur_id) ?? 0);
        }
        if (defi.type === TypeDefi.NB_LIVRES) score += 3;
        const daysLeft = computeDaysRemaining(defi.date_fin, now);
        if (daysLeft <= 14) score += 2;
        return { defi, score };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.defi.date_fin.getTime() - b.defi.date_fin.getTime(),
      )
      .slice(0, limit);

    return {
      data: scored.map(({ defi, score }) => ({
        ...this.enrichListItem(defi, defi.userdefis[0] ?? null),
        score_pertinence: score,
      })),
    };
  }

  async listExpiring(authId: string, query: ExpiringQueryDto) {
    await this.engine.syncExpiredParticipations(authId);
    const days = query.days ?? 7;
    const now = new Date();
    const limitDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.defi.findMany({
      where: {
        ...activeDefiWhere(),
        date_fin: { gt: now, lte: limitDate },
      },
      include: {
        badge: true,
        userdefis: { where: { auth_id: authId }, take: 1 },
      },
      orderBy: { date_fin: 'asc' },
      take: 20,
    });

    return {
      data: rows.map((row) => ({
        ...this.enrichListItem(row, row.userdefis[0] ?? null),
        jours_restants: computeDaysRemaining(row.date_fin, now),
        inscrit: Boolean(row.userdefis[0]),
      })),
      days,
    };
  }

  async getChallengeStats(defiId: string) {
    const defi = await this.prisma.defi.findUnique({ where: { id: defiId } });
    if (!defi) {
      throw new NotFoundException('Défi introuvable.');
    }

    const [nb_participants, nb_completions] = await Promise.all([
      this.prisma.userDefi.count({ where: { defi_id: defiId } }),
      this.prisma.userDefi.count({
        where: { defi_id: defiId, statut: StatutUserDefi.COMPLETE },
      }),
    ]);

    return {
      defi_id: defiId,
      nb_participants,
      nb_completions,
      taux_completion:
        nb_participants === 0
          ? 0
          : Math.round((nb_completions / nb_participants) * 10000) / 100,
    };
  }

  async getChallengeById(authId: string, defiId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const defi = await this.prisma.defi.findUnique({
      where: { id: defiId },
      include: {
        badge: true,
        categorie: true,
        auteur: true,
        livre: true,
        userdefis: { where: { auth_id: authId }, take: 1 },
      },
    });

    if (!defi) {
      throw new NotFoundException('Défi introuvable.');
    }

    const participation = defi.userdefis[0] ?? null;
    return {
      ...mapChallengeDetail(defi, participation),
      jours_restants: computeDaysRemaining(defi.date_fin),
      pourcentage: participation
        ? computeProgressPercent(
            participation.progression,
            defi.objectif_valeur,
          )
        : null,
      est_actif: defi.statut === StatutDefi.ACTIF && defi.date_fin > new Date(),
    };
  }

  async getChallengeProgress(authId: string, defiId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const defi = await this.prisma.defi.findUnique({
      where: { id: defiId },
      include: {
        badge: true,
        categorie: true,
        auteur: true,
        livre: true,
        userdefis: { where: { auth_id: authId }, take: 1 },
      },
    });

    if (!defi) {
      throw new NotFoundException('Défi introuvable.');
    }

    const participation = defi.userdefis[0] ?? null;
    const pourcentage = participation
      ? computeProgressPercent(participation.progression, defi.objectif_valeur)
      : 0;

    const prochaine_action = await this.buildProchaineAction(
      authId,
      defi,
      participation,
    );

    const analyse_mission = analyzeMission(
      defi,
      participation?.progression ?? 0,
    );

    return {
      defi_id: defi.id,
      titre: defi.titre,
      type: defi.type,
      objectif_valeur: defi.objectif_valeur,
      date_fin: defi.date_fin.toISOString(),
      jours_restants: computeDaysRemaining(defi.date_fin),
      inscrit: Boolean(participation),
      participation: participation
        ? {
            progression: participation.progression,
            statut: participation.statut,
            date_completion:
              participation.date_completion?.toISOString() ?? null,
          }
        : null,
      pourcentage,
      prochaine_action,
      analyse_mission,
      badge: {
        id: defi.badge.id,
        nom: defi.badge.nom,
        icone: defi.badge.icone,
        couleur: defi.badge.couleur,
      },
    };
  }

  async listChallengesForBook(authId: string, livreId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const livre = await this.prisma.livre.findUnique({
      where: { id: livreId },
      select: {
        id: true,
        titre: true,
        appartenir: { select: { categorie_id: true } },
        livre_auteurs: { select: { auteur_id: true } },
      },
    });

    if (!livre) {
      throw new NotFoundException('Livre introuvable.');
    }

    const categorieIds = livre.appartenir.map((a) => a.categorie_id);
    const auteurIds = livre.livre_auteurs.map((a) => a.auteur_id);

    const rows = await this.prisma.defi.findMany({
      where: {
        ...activeDefiWhere(),
        OR: [
          { type: TypeDefi.NB_LIVRES },
          { type: TypeDefi.LIVRE_SPECIFIQUE, livre_id: livreId },
          ...(categorieIds.length
            ? [
                {
                  type: TypeDefi.CATEGORIE,
                  categorie_id: { in: categorieIds },
                },
              ]
            : []),
          ...(auteurIds.length
            ? [{ type: TypeDefi.AUTEUR, auteur_id: { in: auteurIds } }]
            : []),
        ],
      },
      include: {
        badge: true,
        userdefis: { where: { auth_id: authId }, take: 1 },
      },
      orderBy: { date_fin: 'asc' },
    });

    return {
      livre: { id: livre.id, titre: livre.titre },
      data: rows.map((row) =>
        this.enrichListItem(row, row.userdefis[0] ?? null),
      ),
    };
  }

  async leaveChallenge(authId: string, defiId: string) {
    const participation = await this.prisma.userDefi.findUnique({
      where: {
        auth_id_defi_id: { auth_id: authId, defi_id: defiId },
      },
    });

    if (!participation) {
      throw new NotFoundException('Participation introuvable pour ce défi.');
    }

    if (
      participation.progression > 0 ||
      participation.statut !== StatutUserDefi.EN_COURS
    ) {
      throw new BadRequestException(
        'Impossible de quitter ce défi : progression déjà commencée.',
      );
    }

    await this.prisma.userDefi.delete({
      where: {
        auth_id_defi_id: { auth_id: authId, defi_id: defiId },
      },
    });

    return { message: 'Participation au défi annulée.' };
  }

  async joinChallenge(authId: string, defiId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const defi = await this.prisma.defi.findUnique({
      where: { id: defiId },
      include: {
        badge: true,
        categorie: true,
        auteur: true,
        livre: true,
      },
    });

    if (!defi) {
      throw new NotFoundException('Défi introuvable.');
    }

    if (defi.statut !== StatutDefi.ACTIF || defi.date_fin <= new Date()) {
      throw new BadRequestException('Défi terminé ou annulé.');
    }

    const existing = await this.prisma.userDefi.findUnique({
      where: {
        auth_id_defi_id: { auth_id: authId, defi_id: defiId },
      },
    });

    if (existing) {
      throw new ConflictException('Déjà inscrit à ce défi.');
    }

    const now = new Date();
    const participation = await this.prisma.$transaction(async (tx) => {
      const initialProgress = await computeInitialMissionProgress(
        tx,
        authId,
        defi,
      );
      const isComplete = initialProgress >= defi.objectif_valeur;

      const row = await tx.userDefi.create({
        data: {
          auth_id: authId,
          defi_id: defiId,
          progression: initialProgress,
          statut: isComplete
            ? StatutUserDefi.COMPLETE
            : StatutUserDefi.EN_COURS,
          ...(isComplete ? { date_completion: now } : {}),
        },
      });

      if (isComplete) {
        await this.engine.awardOnChallengeComplete(tx, authId, {
          ...defi,
          badge: defi.badge,
        });
      }

      return row;
    });

    const analyse_mission = analyzeMission(defi, participation.progression);

    return {
      defi_id: defiId,
      statut: participation.statut,
      progression: participation.progression,
      analyse_mission,
      message:
        participation.statut === StatutUserDefi.COMPLETE
          ? `Félicitations ! Vous avez déjà accompli « ${defi.titre} ».`
          : 'Inscription au défi confirmée. Suivez votre plan de mission.',
    };
  }

  async getMyParticipation(authId: string, defiId: string) {
    await this.engine.syncExpiredParticipations(authId);

    const row = await this.prisma.userDefi.findUnique({
      where: {
        auth_id_defi_id: { auth_id: authId, defi_id: defiId },
      },
      include: {
        defi: { include: { badge: true } },
      },
    });

    if (!row) {
      throw new NotFoundException('Participation introuvable pour ce défi.');
    }

    return {
      defi: {
        id: row.defi.id,
        titre: row.defi.titre,
        type: row.defi.type,
        objectif_valeur: row.defi.objectif_valeur,
        points_bonus: row.defi.points_bonus,
        date_debut: row.defi.date_debut.toISOString(),
        date_fin: row.defi.date_fin.toISOString(),
        badge: {
          id: row.defi.badge.id,
          nom: row.defi.badge.nom,
          icone: row.defi.badge.icone,
          couleur: row.defi.badge.couleur,
          points: row.defi.badge.points,
        },
      },
      progression: row.progression,
      statut: row.statut,
      pourcentage: computeProgressPercent(
        row.progression,
        row.defi.objectif_valeur,
      ),
      jours_restants: computeDaysRemaining(row.defi.date_fin),
      date_completion: row.date_completion?.toISOString() ?? null,
    };
  }

  private enrichListItem(
    defi: Parameters<typeof mapChallengeListItem>[0],
    participation: Parameters<typeof mapChallengeListItem>[1],
  ) {
    const base = mapChallengeListItem(defi, participation);
    return {
      ...base,
      jours_restants: computeDaysRemaining(defi.date_fin),
      pourcentage: participation
        ? computeProgressPercent(
            participation.progression,
            defi.objectif_valeur,
          )
        : null,
    };
  }

  private async buildProchaineAction(
    authId: string,
    defi: {
      id: string;
      type: TypeDefi;
      objectif_valeur: number;
      categorie_id: string | null;
      livre_id: string | null;
      auteur_id: string | null;
      titre: string;
      categorie?: { nom: string } | null;
      auteur?: { nom: string; prenom: string | null } | null;
      livre?: { id: string; titre: string } | null;
    },
    participation: { progression: number; statut: StatutUserDefi } | null,
  ) {
    if (!participation || participation.statut !== StatutUserDefi.EN_COURS) {
      return {
        code: 'REJOINDRE',
        message: 'Inscrivez-vous au défi pour commencer à progresser.',
        cible: { type: 'defi', id: defi.id },
      };
    }

    const restant = Math.max(
      0,
      defi.objectif_valeur - participation.progression,
    );

    switch (defi.type) {
      case TypeDefi.NB_LIVRES: {
        const enCours = await this.prisma.progressionLecture.findFirst({
          where: {
            auth_id: authId,
            statut: StatutProgression.EN_COURS,
            pourcentage: { gte: 50 },
          },
          include: { livre: { select: { id: true, titre: true } } },
          orderBy: { pourcentage: 'desc' },
        });
        return {
          code: 'TERMINER_LIVRES',
          message: `Terminez encore ${restant} livre(s) pour compléter ce défi.`,
          restant,
          cible: enCours
            ? {
                type: 'livre',
                id: enCours.livre.id,
                titre: enCours.livre.titre,
              }
            : { type: 'catalogue', id: 'books' },
        };
      }
      case TypeDefi.DUREE_LECTURE:
        return {
          code: 'LIRE_MINUTES',
          message: `Lisez encore ${restant} minute(s) (temps cumulé sur vos sessions).`,
          restant,
          cible: { type: 'lecture', id: authId },
        };
      case TypeDefi.CATEGORIE: {
        const nom = defi.categorie?.nom ?? 'cette catégorie';
        return {
          code: 'LIVRES_CATEGORIE',
          message: `Terminez encore ${restant} livre(s) de la catégorie « ${nom} ».`,
          restant,
          cible: defi.categorie_id
            ? { type: 'categorie', id: defi.categorie_id }
            : null,
        };
      }
      case TypeDefi.AUTEUR: {
        const nom = defi.auteur
          ? [defi.auteur.prenom, defi.auteur.nom].filter(Boolean).join(' ')
          : 'cet auteur';
        return {
          code: 'LIVRES_AUTEUR',
          message: `Terminez encore ${restant} livre(s) de ${nom}.`,
          restant,
          cible: defi.auteur_id ? { type: 'auteur', id: defi.auteur_id } : null,
        };
      }
      case TypeDefi.LIVRE_SPECIFIQUE:
        return {
          code: 'TERMINER_LIVRE',
          message: defi.livre
            ? `Terminez le livre « ${defi.livre.titre} ».`
            : 'Terminez le livre associé à ce défi.',
          restant,
          cible: defi.livre
            ? { type: 'livre', id: defi.livre.id, titre: defi.livre.titre }
            : defi.livre_id
              ? { type: 'livre', id: defi.livre_id }
              : null,
        };
      default:
        return {
          code: 'CONTINUER',
          message: 'Continuez à lire pour progresser.',
          restant,
          cible: null,
        };
    }
  }
}
