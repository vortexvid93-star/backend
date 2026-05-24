import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatutAbonnement,
  StatutCommentaire,
  StatutDefi,
  StatutProgression,
  StatutUserDefi,
} from '../../generated/prisma/enums';
import { ChallengesEngineService } from '../challenges/challenges-engine.service';
import { RecommendationsService } from '../discovery/recommendations.service';
import { computeProgressPercent } from '../challenges/challenges-progress.util';
import { buildPaginationMeta } from '../common/pagination.util';
import { activeSubscriptionWhere } from '../payments/subscription-query.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType, type ActivityQueryDto } from './dto/activity-query.dto';
import type { ChallengesQueryDto } from './dto/challenges-query.dto';
import type { ReadingQueryDto } from './dto/reading-query.dto';
import type { SocialQueryDto } from './dto/social-query.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import {
  aggregateTopCategories,
  computeProfileCompletion,
  computeReadingStreak,
  groupCountByMonth,
  resolveReadingOrderBy,
} from './profile-aggregates.util';
import {
  mapDashboardProfile,
  mapFullProfile,
  mapPersonne,
  mapReadingItem,
} from './profile.mapper';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly challengesEngine: ChallengesEngineService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async getProfile(authId: string) {
    const auth = await this.findAuthWithActivePersonne(authId);
    const abonnement = await this.findActiveAbonnement(authId);
    return mapFullProfile(auth, abonnement);
  }

  async updateProfile(authId: string, dto: UpdateProfileDto) {
    const auth = await this.findAuthWithActivePersonne(authId);

    const personneData: Record<string, unknown> = {};
    if (dto.nom !== undefined) personneData.nom = dto.nom;
    if (dto.prenom !== undefined) personneData.prenom = dto.prenom;
    if (dto.date_naissance !== undefined) {
      personneData.date_naissance = new Date(dto.date_naissance);
    }
    if (dto.photo_profil_url !== undefined) {
      personneData.photo_profil_url = dto.photo_profil_url;
    }
    if (dto.bio !== undefined) personneData.bio = dto.bio;
    if (dto.genre !== undefined) personneData.genre = dto.genre;
    if (dto.ecole !== undefined) personneData.ecole = dto.ecole;
    if (dto.niveau !== undefined) personneData.niveau = dto.niveau;

    const authData: Record<string, unknown> = {};
    if (dto.numero_telephone !== undefined) {
      authData.numero_telephone = dto.numero_telephone;
    }

    const hasPersonneUpdate = Object.keys(personneData).length > 0;
    const hasAuthUpdate = Object.keys(authData).length > 0;

    if (!hasPersonneUpdate && !hasAuthUpdate) {
      return {
        personne: mapPersonne(auth.personne),
        numero_telephone: auth.numero_telephone,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let personne = auth.personne;
      if (hasPersonneUpdate) {
        personne = await tx.personne.update({
          where: { id: auth.personne_id },
          data: personneData,
        });
      }

      let numero_telephone = auth.numero_telephone;
      if (hasAuthUpdate) {
        const updatedAuth = await tx.auth.update({
          where: { id: authId },
          data: authData,
        });
        numero_telephone = updatedAuth.numero_telephone;
      }

      return { personne, numero_telephone };
    });

    return {
      personne: mapPersonne(updated.personne),
      numero_telephone: updated.numero_telephone,
    };
  }

  async uploadProfilePhoto(authId: string, file: Express.Multer.File) {
    const auth = await this.findAuthWithActivePersonne(authId);
    this.cloudinary.assertValidImageFile(file);

    const upload = await this.cloudinary.uploadProfilePhoto(authId, file);

    const personne = await this.prisma.personne.update({
      where: { id: auth.personne_id },
      data: { photo_profil_url: upload.secure_url },
    });

    return {
      photo_profil_url: upload.secure_url,
      personne: mapPersonne(personne),
    };
  }

  async getBadges(authId: string) {
    const rows = await this.prisma.userBadge.findMany({
      where: { auth_id: authId },
      include: { badge: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: rows.map((row) => ({
        badge: {
          id: row.badge.id,
          nom: row.badge.nom,
          icone: row.badge.icone,
          couleur: row.badge.couleur,
          points: row.badge.points,
          description: row.badge.description,
        },
        obtenu_le: row.createdAt.toISOString(),
      })),
    };
  }

  async getChallengesSummary(authId: string) {
    await this.challengesEngine.syncExpiredParticipations(authId);
    const now = new Date();

    const [en_cours, completes, echoques, participationsEnCours] =
      await Promise.all([
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
            defi: {
              statut: StatutDefi.ACTIF,
              date_fin: { gt: now },
            },
          },
          include: { defi: true },
          orderBy: { defi: { date_fin: 'asc' } },
        }),
      ]);

    const mapParticipationSummary = (
      row: (typeof participationsEnCours)[number],
    ) => {
      const pourcentage =
        row.defi.objectif_valeur > 0
          ? Math.min(
              100,
              Math.round(
                (row.progression / row.defi.objectif_valeur) * 10000,
              ) / 100,
            )
          : 0;
      return {
        defi_id: row.defi_id,
        titre: row.defi.titre,
        type: row.defi.type,
        date_fin: row.defi.date_fin.toISOString(),
        progression: row.progression,
        objectif_valeur: row.defi.objectif_valeur,
        pourcentage,
      };
    };

    const prochaine =
      participationsEnCours.length > 0
        ? mapParticipationSummary(participationsEnCours[0])
        : null;

    const defiPlusAvance = participationsEnCours.reduce<
      ReturnType<typeof mapParticipationSummary> | null
    >((best, row) => {
      const current = mapParticipationSummary(row);
      if (!best || current.pourcentage > best.pourcentage) return current;
      return best;
    }, null);

    return {
      en_cours,
      completes,
      echoques,
      prochaine_echeance: prochaine,
      defi_plus_avance: defiPlusAvance,
    };
  }

  async getChallenges(authId: string, query: ChallengesQueryDto) {
    await this.challengesEngine.syncExpiredParticipations(authId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      auth_id: authId,
      ...(query.statut ? { statut: query.statut } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.userDefi.findMany({
        where,
        include: {
          defi: { include: { badge: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userDefi.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        defi: {
          id: row.defi.id,
          titre: row.defi.titre,
          type: row.defi.type,
          objectif_valeur: row.defi.objectif_valeur,
          points_bonus: row.defi.points_bonus,
          date_fin: row.defi.date_fin.toISOString(),
          badge: {
            nom: row.defi.badge.nom,
            icone: row.defi.badge.icone,
          },
        },
        progression: row.progression,
        statut: row.statut,
        date_completion: row.date_completion?.toISOString() ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async deleteProfilePhoto(authId: string) {
    const auth = await this.findAuthWithActivePersonne(authId);

    if (!auth.personne.photo_profil_url) {
      throw new BadRequestException('Aucune photo de profil à supprimer.');
    }

    await this.cloudinary.deleteByUrl(auth.personne.photo_profil_url);

    const personne = await this.prisma.personne.update({
      where: { id: auth.personne_id },
      data: { photo_profil_url: null },
    });

    return {
      message: 'Photo de profil supprimée.',
      personne: mapPersonne(personne),
    };
  }

  async getReading(authId: string, query: ReadingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      auth_id: authId,
      ...(query.statut ? { statut: query.statut } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.progressionLecture.findMany({
        where,
        include: {
          livre: {
            select: {
              id: true,
              titre: true,
              couverture_url: true,
              type_livre: true,
              nombre_pages: true,
            },
          },
        },
        orderBy: resolveReadingOrderBy(query.sort),
        skip,
        take: limit,
      }),
      this.prisma.progressionLecture.count({ where }),
    ]);

    return {
      data: rows.map(mapReadingItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getDashboard(authId: string) {
    const auth = await this.findAuthWithActivePersonne(authId);
    const now = new Date();

    const [
      abonnement,
      stats,
      challengesSummary,
      nb_notifications_non_lues,
      dernierBadge,
      recos,
    ] = await Promise.all([
      this.findActiveAbonnement(authId),
      this.buildStatsSnapshot(authId, auth.personne.points),
      this.buildChallengesSummarySnapshot(authId, now),
      this.prisma.notification.count({
        where: { auth_id: authId, lu: false },
      }),
      this.prisma.userBadge.findFirst({
        where: { auth_id: authId },
        orderBy: { createdAt: 'desc' },
        include: { badge: true },
      }),
      this.recommendationsService.getDashboardSlice(authId),
    ]);

    return {
      profil: mapDashboardProfile(auth, abonnement),
      stats,
      defis: challengesSummary,
      nb_notifications_non_lues,
      recommandations: recos,
      badge_recent: dernierBadge
        ? {
            nom: dernierBadge.badge.nom,
            icone: dernierBadge.badge.icone,
            couleur: dernierBadge.badge.couleur,
            obtenu_le: dernierBadge.createdAt.toISOString(),
          }
        : null,
    };
  }

  async getActivity(authId: string, query: ActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const fetchSize = page * limit;

    const includeTypes = query.type
      ? [query.type]
      : [
          ActivityType.LIVRE_TERMINE,
          ActivityType.BADGE_OBTENU,
          ActivityType.DEFI_COMPLETE,
          ActivityType.COMMENTAIRE,
        ];

    const fetches: Promise<
      {
        type: ActivityType;
        date: Date;
        payload: Record<string, unknown>;
      }[]
    >[] = [];

    if (includeTypes.includes(ActivityType.LIVRE_TERMINE)) {
      fetches.push(
        this.prisma.progressionLecture
          .findMany({
            where: {
              auth_id: authId,
              statut: StatutProgression.TERMINE,
              date_fin: { not: null },
            },
            orderBy: { date_fin: 'desc' },
            take: fetchSize,
            include: {
              livre: {
                select: { id: true, titre: true, couverture_url: true },
              },
            },
          })
          .then((rows) =>
            rows.map((row) => ({
              type: ActivityType.LIVRE_TERMINE as const,
              date: row.date_fin!,
              payload: {
                livre_id: row.livre.id,
                titre: row.livre.titre,
                couverture_url: row.livre.couverture_url,
                duree_lecture_min: row.duree_lecture_min,
              },
            })),
          ),
      );
    }

    if (includeTypes.includes(ActivityType.BADGE_OBTENU)) {
      fetches.push(
        this.prisma.userBadge
          .findMany({
            where: { auth_id: authId },
            orderBy: { createdAt: 'desc' },
            take: fetchSize,
            include: { badge: true },
          })
          .then((rows) =>
            rows.map((row) => ({
              type: ActivityType.BADGE_OBTENU as const,
              date: row.createdAt,
              payload: {
                badge_id: row.badge.id,
                nom: row.badge.nom,
                icone: row.badge.icone,
                couleur: row.badge.couleur,
                points: row.badge.points,
              },
            })),
          ),
      );
    }

    if (includeTypes.includes(ActivityType.DEFI_COMPLETE)) {
      fetches.push(
        this.prisma.userDefi
          .findMany({
            where: {
              auth_id: authId,
              statut: StatutUserDefi.COMPLETE,
              date_completion: { not: null },
            },
            orderBy: { date_completion: 'desc' },
            take: fetchSize,
            include: { defi: { include: { badge: true } } },
          })
          .then((rows) =>
            rows.map((row) => ({
              type: ActivityType.DEFI_COMPLETE as const,
              date: row.date_completion!,
              payload: {
                defi_id: row.defi_id,
                titre: row.defi.titre,
                points_bonus: row.defi.points_bonus,
                badge: {
                  nom: row.defi.badge.nom,
                  icone: row.defi.badge.icone,
                },
              },
            })),
          ),
      );
    }

    if (includeTypes.includes(ActivityType.COMMENTAIRE)) {
      fetches.push(
        this.prisma.commentaire
          .findMany({
            where: {
              auth_id: authId,
              statut: StatutCommentaire.PUBLIE,
            },
            orderBy: { createdAt: 'desc' },
            take: fetchSize,
            include: {
              livre: { select: { id: true, titre: true, couverture_url: true } },
            },
          })
          .then((rows) =>
            rows.map((row) => ({
              type: ActivityType.COMMENTAIRE as const,
              date: row.createdAt,
              payload: {
                commentaire_id: row.id,
                livre_id: row.livre.id,
                livre_titre: row.livre.titre,
                couverture_url: row.livre.couverture_url,
                extrait:
                  row.contenu.length > 120
                    ? `${row.contenu.slice(0, 117)}...`
                    : row.contenu,
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
    if (!query.type || query.type === ActivityType.LIVRE_TERMINE) {
      countPromises.push(
        this.prisma.progressionLecture.count({
          where: {
            auth_id: authId,
            statut: StatutProgression.TERMINE,
            date_fin: { not: null },
          },
        }),
      );
    }
    if (!query.type || query.type === ActivityType.BADGE_OBTENU) {
      countPromises.push(
        this.prisma.userBadge.count({ where: { auth_id: authId } }),
      );
    }
    if (!query.type || query.type === ActivityType.DEFI_COMPLETE) {
      countPromises.push(
        this.prisma.userDefi.count({
          where: {
            auth_id: authId,
            statut: StatutUserDefi.COMPLETE,
            date_completion: { not: null },
          },
        }),
      );
    }
    if (!query.type || query.type === ActivityType.COMMENTAIRE) {
      countPromises.push(
        this.prisma.commentaire.count({
          where: {
            auth_id: authId,
            statut: StatutCommentaire.PUBLIE,
          },
        }),
      );
    }

    const counts = await Promise.all(countPromises);
    const total = query.type
      ? counts[0] ?? 0
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

  async getCompletion(authId: string) {
    const auth = await this.findAuthWithActivePersonne(authId);
    const completion = computeProfileCompletion(
      auth.personne,
      auth.numero_telephone,
    );

    return {
      ...completion,
      total_champs: 7,
    };
  }

  async getActions(authId: string) {
    await this.challengesEngine.syncExpiredParticipations(authId);
    const auth = await this.findAuthWithActivePersonne(authId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const completion = computeProfileCompletion(
      auth.personne,
      auth.numero_telephone,
    );

    const [
      abonnement,
      defiUrgent,
      livreStale,
      defiDisponible,
      defiAvance,
    ] = await Promise.all([
      this.findActiveAbonnement(authId),
      this.prisma.userDefi.findFirst({
        where: {
          auth_id: authId,
          statut: StatutUserDefi.EN_COURS,
          defi: {
            statut: StatutDefi.ACTIF,
            date_fin: { gt: now, lte: twoDaysFromNow },
          },
        },
        include: { defi: true },
        orderBy: { defi: { date_fin: 'asc' } },
      }),
      this.prisma.progressionLecture.findFirst({
        where: {
          auth_id: authId,
          statut: StatutProgression.EN_COURS,
          derniere_maj: { lt: sevenDaysAgo },
        },
        include: { livre: { select: { id: true, titre: true } } },
        orderBy: { derniere_maj: 'asc' },
      }),
      this.prisma.defi.findFirst({
        where: {
          statut: StatutDefi.ACTIF,
          date_fin: { gt: now },
          userdefis: { none: { auth_id: authId } },
        },
        orderBy: { date_fin: 'asc' },
        select: { id: true, titre: true, date_fin: true },
      }),
      this.prisma.userDefi.findMany({
        where: {
          auth_id: authId,
          statut: StatutUserDefi.EN_COURS,
          defi: {
            statut: StatutDefi.ACTIF,
            date_fin: { gt: now, lte: sevenDaysFromNow },
          },
        },
        include: { defi: { include: { badge: true } } },
      }),
    ]);

    type ActionItem = {
      code: string;
      priorite: 'haute' | 'moyenne' | 'basse';
      titre: string;
      description: string;
      cible?: { type: string; id: string };
    };

    const actions: ActionItem[] = [];

    if (completion.pourcentage < 100) {
      actions.push({
        code: 'COMPLETER_PROFIL',
        priorite: completion.pourcentage < 50 ? 'haute' : 'moyenne',
        titre: 'Compléter votre profil',
        description: `Profil complété à ${completion.pourcentage} %. Champs manquants : ${completion.champs_manquants.join(', ')}.`,
        cible: { type: 'profil', id: authId },
      });
    }

    if (!auth.email_verified) {
      actions.push({
        code: 'VERIFIER_EMAIL',
        priorite: 'haute',
        titre: 'Vérifier votre adresse e-mail',
        description:
          'Votre compte n’est pas encore vérifié. Consultez votre boîte mail ou demandez un nouveau code OTP.',
        cible: { type: 'auth', id: authId },
      });
    }

    if (abonnement && abonnement.date_fin <= sevenDaysFromNow) {
      const jours = Math.max(
        0,
        Math.ceil(
          (abonnement.date_fin.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      actions.push({
        code: 'RENOUVELER_ABONNEMENT',
        priorite: jours <= 3 ? 'haute' : 'moyenne',
        titre: 'Renouveler votre abonnement',
        description: `Votre abonnement expire dans ${jours} jour(s).`,
        cible: { type: 'abonnement', id: abonnement.id },
      });
    } else if (!abonnement) {
      actions.push({
        code: 'SOUSCRIRE_ABONNEMENT',
        priorite: 'moyenne',
        titre: 'Activer un abonnement',
        description:
          'Aucun abonnement actif. Souscrivez à un plan pour accéder à tout le catalogue.',
        cible: { type: 'plans', id: 'catalogue' },
      });
    }

    if (defiUrgent) {
      actions.push({
        code: 'FINIR_DEFI',
        priorite: 'haute',
        titre: 'Défi bientôt terminé',
        description: `« ${defiUrgent.defi.titre} » se termine le ${defiUrgent.defi.date_fin.toISOString().slice(0, 10)}.`,
        cible: { type: 'defi', id: defiUrgent.defi_id },
      });
    }

    if (livreStale) {
      actions.push({
        code: 'REPRENDRE_LECTURE',
        priorite: 'moyenne',
        titre: 'Reprendre votre lecture',
        description: `Vous n’avez pas ouvert « ${livreStale.livre.titre} » depuis plus de 7 jours.`,
        cible: { type: 'livre', id: livreStale.livre_id },
      });
    }

    if (defiDisponible) {
      actions.push({
        code: 'REJOINDRE_DEFI',
        priorite: 'basse',
        titre: 'Nouveau défi disponible',
        description: `Relevez le défi « ${defiDisponible.titre} ».`,
        cible: { type: 'defi', id: defiDisponible.id },
      });
    }

    const defiProcheFin = defiAvance
      .map((row) => ({
        row,
        pct: computeProgressPercent(
          row.progression,
          row.defi.objectif_valeur,
        ),
      }))
      .filter((x) => x.pct >= 70)
      .sort((a, b) => b.pct - a.pct)[0];

    if (defiProcheFin && defiProcheFin.row.defi_id !== defiUrgent?.defi_id) {
      const restant =
        defiProcheFin.row.defi.objectif_valeur - defiProcheFin.row.progression;
      actions.push({
        code: 'PROGRESSER_DEFI',
        priorite: 'moyenne',
        titre: 'Vous y êtes presque',
        description: `« ${defiProcheFin.row.defi.titre} » : ${defiProcheFin.pct} % — encore ${restant} unité(s).`,
        cible: { type: 'defi', id: defiProcheFin.row.defi_id },
      });
    }

    const badgeProche = defiAvance
      .map((row) => ({
        row,
        pct: computeProgressPercent(
          row.progression,
          row.defi.objectif_valeur,
        ),
      }))
      .filter((x) => x.pct >= 50 && x.pct < 100)
      .sort((a, b) => b.pct - a.pct)[0];

    if (badgeProche) {
      actions.push({
        code: 'DEBLOQUER_BADGE',
        priorite: 'basse',
        titre: 'Badge à portée de main',
        description: `Terminez « ${badgeProche.row.defi.titre} » pour débloquer le badge « ${badgeProche.row.defi.badge.nom} ».`,
        cible: { type: 'badge', id: badgeProche.row.defi.badge_id },
      });
    }

    const prioriteOrder = { haute: 0, moyenne: 1, basse: 2 };
    actions.sort(
      (a, b) => prioriteOrder[a.priorite] - prioriteOrder[b.priorite],
    );

    return { data: actions, total: actions.length };
  }

  async getStatsReading(authId: string) {
    const [termines, allProgressions, streakRows] = await Promise.all([
      this.prisma.progressionLecture.findMany({
        where: {
          auth_id: authId,
          statut: StatutProgression.TERMINE,
          date_fin: { not: null },
        },
        select: {
          date_fin: true,
          duree_lecture_min: true,
          livre: {
            include: {
              appartenir: {
                include: { categorie: { select: { id: true, nom: true } } },
              },
            },
          },
        },
      }),
      this.prisma.progressionLecture.aggregate({
        where: { auth_id: authId, statut: StatutProgression.TERMINE },
        _avg: { duree_lecture_min: true },
        _sum: { duree_lecture_min: true },
        _count: true,
      }),
      this.prisma.progressionLecture.findMany({
        where: { auth_id: authId },
        select: { derniere_maj: true },
        orderBy: { derniere_maj: 'desc' },
        take: 365,
      }),
    ]);

    const dureeTotale = termines.reduce((s, r) => s + r.duree_lecture_min, 0);
    const nbTermines = termines.length;

    return {
      livres_termines_par_mois: groupCountByMonth(termines),
      duree_lecture_totale_min: dureeTotale,
      duree_moyenne_par_livre_termine_min:
        nbTermines > 0 ? Math.round(dureeTotale / nbTermines) : 0,
      top_categories: aggregateTopCategories(termines),
      serie_lecture_jours: computeReadingStreak(
        streakRows.map((r) => r.derniere_maj),
      ),
      resume: {
        total_livres_termines: allProgressions._count,
        duree_totale_min: allProgressions._sum.duree_lecture_min ?? 0,
        duree_moyenne_min: Math.round(
          allProgressions._avg.duree_lecture_min ?? 0,
        ),
      },
    };
  }

  async getStatsSocial(authId: string) {
    const [nb_commentaires, notations, distributionRows] = await Promise.all([
      this.prisma.commentaire.count({
        where: {
          auth_id: authId,
          statut: StatutCommentaire.PUBLIE,
        },
      }),
      this.prisma.noter.findMany({
        where: { auth_id: authId },
        select: { valeur: true },
      }),
      this.prisma.noter.groupBy({
        by: ['valeur'],
        where: { auth_id: authId },
        _count: { valeur: true },
      }),
    ]);

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of distributionRows) {
      if (row.valeur >= 1 && row.valeur <= 5) {
        distribution[row.valeur] = row._count.valeur;
      }
    }

    const note_moyenne_donnee =
      notations.length > 0
        ? Math.round(
            (notations.reduce((s, n) => s + n.valeur, 0) / notations.length) *
              100,
          ) / 100
        : null;

    return {
      nb_commentaires,
      nb_notes_donnees: notations.length,
      note_moyenne_donnee,
      distribution_notes: distribution,
    };
  }

  async getBadgesSummary(authId: string) {
    const [obtenus, total, pointsObtenus] = await Promise.all([
      this.prisma.userBadge.count({ where: { auth_id: authId } }),
      this.prisma.badge.count(),
      this.prisma.userBadge.findMany({
        where: { auth_id: authId },
        include: { badge: { select: { points: true } } },
      }),
    ]);

    const points_badges = pointsObtenus.reduce(
      (sum, row) => sum + row.badge.points,
      0,
    );

    return {
      obtenus,
      total,
      pourcentage:
        total === 0 ? 0 : Math.round((obtenus / total) * 10000) / 100,
      points_badges,
    };
  }

  async getMyComments(authId: string, query: SocialQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      auth_id: authId,
      statut: StatutCommentaire.PUBLIE,
    };

    const [rows, total] = await Promise.all([
      this.prisma.commentaire.findMany({
        where,
        include: {
          livre: { select: { id: true, titre: true, couverture_url: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commentaire.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        contenu: row.contenu,
        livre: {
          id: row.livre.id,
          titre: row.livre.titre,
          couverture_url: row.livre.couverture_url,
        },
        cree_le: row.createdAt.toISOString(),
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getMyRatings(authId: string, query: SocialQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { auth_id: authId };

    const [rows, total] = await Promise.all([
      this.prisma.noter.findMany({
        where,
        include: {
          livre: { select: { id: true, titre: true, couverture_url: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.noter.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        livre: {
          id: row.livre.id,
          titre: row.livre.titre,
          couverture_url: row.livre.couverture_url,
        },
        valeur: row.valeur,
        note_le: row.updatedAt.toISOString(),
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getStats(authId: string) {
    const auth = await this.findAuthWithActivePersonne(authId);
    return this.buildStatsSnapshot(authId, auth.personne.points);
  }

  private async findAuthWithActivePersonne(authId: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { id: authId },
      include: { personne: true },
    });

    if (!auth?.personne || auth.personne.deleted_at) {
      throw new NotFoundException('Profil introuvable.');
    }

    return auth;
  }

  private async findActiveAbonnement(authId: string) {
    return this.prisma.abonnement.findFirst({
      where: activeSubscriptionWhere(authId),
      orderBy: { date_debut: 'desc' },
      include: { plan: true },
    });
  }

  private async buildStatsSnapshot(authId: string, totalPoints: number) {
    const [
      total_livres_lus,
      dureeAgg,
      nb_badges_obtenus,
      nb_defis_completes,
      livres_en_cours,
      livres_abandonnes,
      livreEnCours,
    ] = await Promise.all([
      this.prisma.progressionLecture.count({
        where: { auth_id: authId, statut: StatutProgression.TERMINE },
      }),
      this.prisma.progressionLecture.aggregate({
        where: { auth_id: authId },
        _sum: { duree_lecture_min: true },
      }),
      this.prisma.userBadge.count({ where: { auth_id: authId } }),
      this.prisma.userDefi.count({
        where: { auth_id: authId, statut: StatutUserDefi.COMPLETE },
      }),
      this.prisma.progressionLecture.count({
        where: { auth_id: authId, statut: StatutProgression.EN_COURS },
      }),
      this.prisma.progressionLecture.count({
        where: { auth_id: authId, statut: StatutProgression.ABANDONNE },
      }),
      this.prisma.progressionLecture.findFirst({
        where: { auth_id: authId, statut: StatutProgression.EN_COURS },
        orderBy: { derniere_maj: 'desc' },
        include: { livre: true },
      }),
    ]);

    return {
      total_livres_lus,
      total_duree_lecture_min: dureeAgg._sum.duree_lecture_min ?? 0,
      total_points: totalPoints,
      nb_badges_obtenus,
      nb_defis_completes,
      livres_en_cours,
      livres_abandonnes,
      livre_en_cours_actuel: livreEnCours
        ? {
            livre_id: livreEnCours.livre_id,
            titre: livreEnCours.livre.titre,
            couverture_url: livreEnCours.livre.couverture_url,
            pourcentage: livreEnCours.pourcentage,
          }
        : null,
    };
  }

  private async buildChallengesSummarySnapshot(authId: string, now: Date) {
    const [en_cours, completes, echoques, participationsEnCours] =
      await Promise.all([
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
            defi: {
              statut: StatutDefi.ACTIF,
              date_fin: { gt: now },
            },
          },
          include: { defi: true },
          orderBy: { defi: { date_fin: 'asc' } },
          take: 1,
        }),
      ]);

    const prochaine = participationsEnCours[0];
    const mapProchaine = prochaine
      ? {
          defi_id: prochaine.defi_id,
          titre: prochaine.defi.titre,
          date_fin: prochaine.defi.date_fin.toISOString(),
          progression: prochaine.progression,
          objectif_valeur: prochaine.defi.objectif_valeur,
          pourcentage:
            prochaine.defi.objectif_valeur > 0
              ? Math.min(
                  100,
                  Math.round(
                    (prochaine.progression / prochaine.defi.objectif_valeur) *
                      10000,
                  ) / 100,
                )
              : 0,
        }
      : null;

    return {
      en_cours,
      completes,
      echoques,
      prochaine_echeance: mapProchaine,
    };
  }
}
