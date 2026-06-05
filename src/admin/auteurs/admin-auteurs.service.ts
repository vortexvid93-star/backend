import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { StatutDefi } from '../../../generated/prisma/enums';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminAuteurListItem } from './admin-auteurs.mapper';
import type { AdminAuteursQueryDto } from './dto/admin-auteurs-query.dto';
import type { CreateAdminAuteurDto } from './dto/create-admin-auteur.dto';
import type { UpdateAdminAuteurDto } from './dto/update-admin-auteur.dto';

@Injectable()
export class AdminAuteursService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuteurs(query: AdminAuteursQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.AuteurWhereInput = {
      deleted_at: null,
      ...(q ? { nom: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auteur.findMany({
        where,
        include: { _count: { select: { livre_auteurs: true } } },
        orderBy: { nom: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.auteur.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminAuteurListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createAuteur(dto: CreateAdminAuteurDto) {
    const auteur = await this.prisma.auteur.create({
      data: {
        nom: dto.nom.trim(),
        prenom: dto.prenom?.trim() || null,
        bio: dto.bio ?? null,
      },
    });

    return { id: auteur.id, nom: auteur.nom };
  }

  async updateAuteur(auteurId: string, dto: UpdateAdminAuteurDto) {
    await this.findActiveAuteurOrThrow(auteurId);

    const data: Prisma.AuteurUpdateInput = {};
    if (dto.nom !== undefined) data.nom = dto.nom.trim();
    if (dto.prenom !== undefined) data.prenom = dto.prenom.trim() || null;
    if (dto.bio !== undefined) data.bio = dto.bio;

    if (Object.keys(data).length === 0) {
      const existing = await this.prisma.auteur.findUnique({
        where: { id: auteurId },
      });
      return {
        id: existing!.id,
        updatedAt: existing!.updatedAt.toISOString(),
      };
    }

    const updated = await this.prisma.auteur.update({
      where: { id: auteurId },
      data,
    });

    return {
      id: updated.id,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async softDeleteAuteur(auteurId: string) {
    await this.findActiveAuteurOrThrow(auteurId);

    const activeDefi = await this.prisma.defi.findFirst({
      where: {
        auteur_id: auteurId,
        statut: StatutDefi.ACTIF,
      },
      select: { id: true },
    });

    if (activeDefi) {
      throw new ConflictException(
        'Auteur référencé par un défi actif — suppression impossible.',
      );
    }

    const updated = await this.prisma.auteur.update({
      where: { id: auteurId },
      data: { deleted_at: new Date() },
    });

    return { deleted_at: updated.deleted_at!.toISOString() };
  }

  private async findActiveAuteurOrThrow(auteurId: string) {
    const auteur = await this.prisma.auteur.findFirst({
      where: { id: auteurId, deleted_at: null },
    });
    if (!auteur) {
      throw new NotFoundException('Auteur introuvable.');
    }
    return auteur;
  }
}
