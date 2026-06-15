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
  StatutUserDefi,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { AUTH_CONSTANTS } from '../../auth/auth.constants';
import { AuthCacheService } from '../../auth/services/auth-cache.service';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { activeSubscriptionWhere } from '../../payments/subscription-query.util';
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AuthCacheService,
  ) {}

  async listUsers(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.AuthWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              {
                personne: {
                  OR: [
                    { nom: { contains: q, mode: 'insensitive' } },
                    { prenom: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

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

    const now = new Date();
    const data = await Promise.all(
      rows.map(async (auth) => {
        const abonnement = await this.prisma.abonnement.findFirst({
          where: activeSubscriptionWhere(auth.id, now),
          orderBy: { date_debut: 'desc' },
          include: { plan: true },
        });
        return mapAdminUserListItem(auth, abonnement);
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
    ]);

    return {
      auth: mapAdminUserDetailAuth(auth),
      personne: mapAdminUserDetailPersonne(auth.personne),
      abonnements: abonnements.map(mapAdminAbonnement),
      paiements: paiements.map(mapAdminPaiement),
      nb_commentaires,
      nb_notes,
      nb_defis_completes,
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
    const existing = await this.prisma.auth.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email déjà associé à un compte existant.');
    }

    const passwordHash = await hash(dto.password, AUTH_CONSTANTS.BCRYPT_ROUNDS);

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
  }
}
