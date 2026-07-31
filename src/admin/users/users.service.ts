import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import {
  AuthProvider,
  AuthRole,
  AuthStatut,
  StatutAbonnement,
  StatutEtablissement,
  StatutUserDefi,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { Prisma as PrismaRuntime } from '../../../generated/prisma/client';
import { AUTH_CONSTANTS } from '../../auth/auth.constants';
import { AuthCacheService } from '../../auth/services/auth-cache.service';
import { buildPaginationMeta } from '../../common/pagination.util';
import {
  findAuthByEmail,
  normalizeEmail,
} from '../../common/normalize-email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { activeSubscriptionWhere } from '../../payments/subscription-query.util';
import { hasActiveEtablissementMembership } from '../../etablissements/etablissement-access.util';
import { StreakService } from '../../challenges/streak.service';
import {
  dateDepuisJours,
  parsePeriodeJours,
} from '../stats/admin-periode.util';
import { computeReadingHabits } from '../stats/admin-reading-habits.util';
import type { AdminStatsReadingHabitsQueryDto } from '../stats/dto/admin-stats-reading-habits-query.dto';
import type { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import type { BanUserDto } from './dto/ban-user.dto';
import type { CreateAdminDto } from './dto/create-admin.dto';
import {
  mapAdminAbonnement,
  mapAdminPaiement,
  mapAdminUserDetailAuth,
  mapAdminUserDetailPersonne,
  mapAdminUserListItem,
} from './users.mapper';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AuthCacheService,
    private readonly streakService: StreakService,
  ) {}

  async listUsers(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const now = new Date();

    const conditions: Prisma.AuthWhereInput[] = [
      ...(query.statut ? [{ statut: query.statut }] : []),
      ...(query.role ? [{ role: query.role }] : []),
      ...(q
        ? [
            {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                {
                  personne: {
                    OR: [
                      { nom: { contains: q, mode: 'insensitive' as const } },
                      { prenom: { contains: q, mode: 'insensitive' as const } },
                    ],
                  },
                },
              ],
            },
          ]
        : []),
    ];

    if (query.abonnement_actif !== undefined) {
      const activeCondition: Prisma.AuthWhereInput = {
        OR: [
          {
            abonnements: {
              some: {
                statut: StatutAbonnement.ACTIF,
                date_debut: { lte: now },
                date_fin: { gt: now },
              },
            },
          },
          {
            etablissement_memberships: {
              some: {
                retire_le: null,
                etablissement: {
                  statut: StatutEtablissement.ACTIF,
                  date_fin: { gt: now },
                },
              },
            },
          },
        ],
      };
      conditions.push(
        query.abonnement_actif ? activeCondition : { NOT: activeCondition },
      );
    }

    const where: Prisma.AuthWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      this.prisma.auth.findMany({
        where,
        include: { personne: true },
        orderBy: { date_inscription: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auth.count({ where }),
    ]);

    const data = await Promise.all(
      rows.map(async (auth) => {
        const [abonnement, membreEtablissement] = await Promise.all([
          this.prisma.abonnement.findFirst({
            where: activeSubscriptionWhere(auth.id, now),
            orderBy: { date_debut: 'desc' },
            include: { plan: true },
          }),
          hasActiveEtablissementMembership(this.prisma, auth.id, now),
        ]);
        return mapAdminUserListItem(auth, abonnement, membreEtablissement);
      }),
    );

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getUserDetail(authId: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { id: authId },
      include: { personne: true },
    });
    if (!auth) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const [
      abonnements,
      paiements,
      nb_commentaires,
      nb_notes,
      nb_defis_completes,
      membre_etablissement,
    ] = await Promise.all([
      this.prisma.abonnement.findMany({
        where: { auth_id: authId },
        include: { plan: true },
        orderBy: { date_debut: 'desc' },
      }),
      this.prisma.paiement.findMany({
        where: { auth_id: authId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commentaire.count({ where: { auth_id: authId } }),
      this.prisma.noter.count({ where: { auth_id: authId } }),
      this.prisma.userDefi.count({
        where: { auth_id: authId, statut: StatutUserDefi.COMPLETE },
      }),
      hasActiveEtablissementMembership(this.prisma, authId),
    ]);

    return {
      auth: mapAdminUserDetailAuth(auth),
      personne: mapAdminUserDetailPersonne(auth.personne),
      abonnements: abonnements.map(mapAdminAbonnement),
      paiements: paiements.map(mapAdminPaiement),
      nb_commentaires,
      nb_notes,
      nb_defis_completes,
      membre_etablissement,
    };
  }

  async getReadingHabits(
    authId: string,
    query: AdminStatsReadingHabitsQueryDto,
  ) {
    const auth = await this.prisma.auth.findUnique({ where: { id: authId } });
    if (!auth) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const jours = parsePeriodeJours(query.periode, '30j');
    const since = dateDepuisJours(jours);
    const sincePrecedente = dateDepuisJours(jours * 2);

    const [sessions, sessionsPrecedentes, dailyStats] = await Promise.all([
      this.prisma.sessionLecture.findMany({
        where: { auth_id: authId, createdAt: { gte: since } },
        select: { createdAt: true, duree_min: true },
      }),
      this.prisma.sessionLecture.findMany({
        where: {
          auth_id: authId,
          createdAt: { gte: sincePrecedente, lt: since },
        },
        select: { duree_min: true },
      }),
      this.streakService.getDailyStats(authId),
    ]);

    const habitudes = computeReadingHabits(sessions, sessionsPrecedentes);

    return {
      ...habitudes,
      streak_actuel: dailyStats.streak_actuel,
      streak_max: dailyStats.streak_max,
    };
  }

  async banUser(targetId: string, adminId: string, dto: BanUserDto) {
    if (targetId === adminId) {
      throw new BadRequestException(
        'Un administrateur ne peut pas se bannir lui-même.',
      );
    }

    const auth = await this.prisma.auth.findUnique({ where: { id: targetId } });
    if (!auth) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (dto.raison?.trim()) {
      this.logger.warn(
        `Bannissement auth=${targetId} par admin=${adminId} — raison: ${dto.raison.trim()}`,
      );
    }

    const updated = await this.prisma.auth.update({
      where: { id: targetId },
      data: {
        statut: AuthStatut.BANNI,
        refresh_token: null,
        refresh_token_expires_at: null,
      },
    });

    if (auth.jti) {
      this.cache.blacklistJti(auth.jti);
    }

    return { id: updated.id, statut: updated.statut };
  }

  async unbanUser(targetId: string) {
    const auth = await this.prisma.auth.findUnique({ where: { id: targetId } });
    if (!auth) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const updated = await this.prisma.auth.update({
      where: { id: targetId },
      data: { statut: AuthStatut.ACTIF },
    });

    return { id: updated.id, statut: updated.statut };
  }

  async createAdmin(dto: CreateAdminDto) {
    const email = normalizeEmail(dto.email);
    const existing = await findAuthByEmail(this.prisma, email);
    if (existing) {
      throw new ConflictException('Email déjà associé à un compte existant.');
    }

    const passwordHash = await hash(dto.password, AUTH_CONSTANTS.BCRYPT_ROUNDS);

    try {
      const auth = await this.prisma.$transaction(async (tx) => {
        const personne = await tx.personne.create({
          data: {
            nom: dto.nom.trim(),
            prenom: dto.prenom.trim(),
          },
        });
        return tx.auth.create({
          data: {
            personne_id: personne.id,
            email,
            mot_de_passe_hash: passwordHash,
            auth_provider: AuthProvider.LOCAL,
            role: AuthRole.ADMIN,
            statut: AuthStatut.ACTIF,
            email_verified: true,
          },
        });
      });

      return {
        id: auth.id,
        email: auth.email,
        role: auth.role,
        statut: auth.statut,
      };
    } catch (err) {
      if (
        err instanceof PrismaRuntime.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email déjà associé à un compte existant.');
      }
      throw err;
    }
  }
}
