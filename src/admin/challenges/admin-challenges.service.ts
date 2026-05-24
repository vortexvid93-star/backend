import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  StatutDefi,
  StatutUserDefi,
} from '../../../generated/prisma/enums';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminChallengeListItem } from './admin-challenges.mapper';
import {
  assertDefiDates,
  assertObjectifPositif,
  resolveDefiTargetIds,
} from './defi-rules.util';
import type { AdminChallengeParticipantsQueryDto } from './dto/admin-challenge-participants-query.dto';
import type { AdminChallengesQueryDto } from './dto/admin-challenges-query.dto';
import type { CreateAdminChallengeDto } from './dto/create-admin-challenge.dto';
import type { UpdateAdminChallengeDto } from './dto/update-admin-challenge.dto';

@Injectable()
export class AdminChallengesService {
  constructor(private readonly prisma: PrismaService) {}

  async listChallenges(query: AdminChallengesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DefiWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.defi.findMany({
        where,
        include: {
          badge: { select: { nom: true, icone: true } },
          _count: { select: { userdefis: true } },
        },
        orderBy: { date_debut: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.defi.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminChallengeListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createChallenge(dto: CreateAdminChallengeDto) {
    assertObjectifPositif(dto.objectif_valeur);

    const dateDebut = new Date(dto.date_debut);
    const dateFin = new Date(dto.date_fin);
    assertDefiDates(dateDebut, dateFin);

    const badge = await this.prisma.badge.findUnique({
      where: { id: dto.badge_id },
    });
    if (!badge) {
      throw new NotFoundException('badge_id inexistant.');
    }

    const targets = resolveDefiTargetIds(dto.type, {
      categorie_id: dto.categorie_id,
      auteur_id: dto.auteur_id,
      livre_id: dto.livre_id,
    });

    await this.assertTargetsExist(targets);

    try {
      const defi = await this.prisma.defi.create({
        data: {
          titre: dto.titre.trim(),
          description: dto.description ?? null,
          type: dto.type,
          objectif_valeur: dto.objectif_valeur,
          points_bonus: dto.points_bonus ?? 0,
          date_debut: dateDebut,
          date_fin: dateFin,
          badge_id: dto.badge_id,
          categorie_id: targets.categorie_id,
          auteur_id: targets.auteur_id,
          livre_id: targets.livre_id,
          statut: StatutDefi.ACTIF,
        },
      });

      return { id: defi.id };
    } catch (error) {
      this.rethrowDefiConstraint(error);
      throw error;
    }
  }

  async updateChallenge(defiId: string, dto: UpdateAdminChallengeDto) {
    const existing = await this.findDefiOrThrow(defiId);

    if (existing.statut !== StatutDefi.ACTIF) {
      throw new BadRequestException(
        'Seuls les défis ACTIF peuvent être modifiés.',
      );
    }

    const nextDateFin =
      dto.date_fin !== undefined ? new Date(dto.date_fin) : existing.date_fin;

    if (dto.date_fin !== undefined) {
      assertDefiDates(existing.date_debut, nextDateFin);
    }

    if (dto.objectif_valeur !== undefined) {
      assertObjectifPositif(dto.objectif_valeur);
    }

    const data: Prisma.DefiUpdateInput = {};
    if (dto.titre !== undefined) data.titre = dto.titre.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.date_fin !== undefined) data.date_fin = nextDateFin;
    if (dto.objectif_valeur !== undefined) {
      data.objectif_valeur = dto.objectif_valeur;
    }

    if (Object.keys(data).length === 0) {
      return {
        id: existing.id,
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    const updated = await this.prisma.defi.update({
      where: { id: defiId },
      data,
    });

    return {
      id: updated.id,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async cancelChallenge(defiId: string) {
    await this.findDefiOrThrow(defiId);

    const [updatedDefi, failedParticipations] = await this.prisma.$transaction([
      this.prisma.defi.update({
        where: { id: defiId },
        data: { statut: StatutDefi.ANNULE },
      }),
      this.prisma.userDefi.updateMany({
        where: {
          defi_id: defiId,
          statut: StatutUserDefi.EN_COURS,
        },
        data: { statut: StatutUserDefi.ECHOUE },
      }),
    ]);

    return {
      statut: updatedDefi.statut,
      nb_utilisateurs_echoues: failedParticipations.count,
    };
  }

  async listParticipants(
    defiId: string,
    query: AdminChallengeParticipantsQueryDto,
  ) {
    await this.findDefiOrThrow(defiId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserDefiWhereInput = {
      defi_id: defiId,
      ...(query.statut ? { statut: query.statut } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.userDefi.findMany({
        where,
        include: {
          auth: {
            select: {
              id: true,
              email: true,
              personne: { select: { nom: true, prenom: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userDefi.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        auth: {
          id: row.auth.id,
          email: row.auth.email,
          personne: {
            nom: row.auth.personne.nom,
            prenom: row.auth.personne.prenom,
          },
        },
        progression: row.progression,
        statut: row.statut,
        date_completion: row.date_completion?.toISOString() ?? null,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private async findDefiOrThrow(defiId: string) {
    const defi = await this.prisma.defi.findUnique({ where: { id: defiId } });
    if (!defi) {
      throw new NotFoundException('Défi introuvable.');
    }
    return defi;
  }

  private async assertTargetsExist(targets: {
    categorie_id: string | null;
    auteur_id: string | null;
    livre_id: string | null;
  }) {
    if (targets.categorie_id) {
      const cat = await this.prisma.categorie.findFirst({
        where: { id: targets.categorie_id, deleted_at: null },
      });
      if (!cat) {
        throw new NotFoundException('Catégorie introuvable.');
      }
    }
    if (targets.auteur_id) {
      const auteur = await this.prisma.auteur.findFirst({
        where: { id: targets.auteur_id, deleted_at: null },
      });
      if (!auteur) {
        throw new NotFoundException('Auteur introuvable.');
      }
    }
    if (targets.livre_id) {
      const livre = await this.prisma.livre.findUnique({
        where: { id: targets.livre_id },
      });
      if (!livre) {
        throw new NotFoundException('Livre introuvable.');
      }
    }
  }

  private rethrowDefiConstraint(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Contrainte type/FK violée pour ce défi.',
        );
      }
      if (error.code === 'P2004' || error.code === 'P2010') {
        throw new BadRequestException(
          'Contrainte chk_defi_exclusivite ou chk_defi_dates violée.',
        );
      }
    }
  }
}
