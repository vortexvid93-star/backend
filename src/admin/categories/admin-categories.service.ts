import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { StatutDefi } from '../../../generated/prisma/enums';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminCategorieListItem } from './admin-categories.mapper';
import type { AdminCategoriesQueryDto } from './dto/admin-categories-query.dto';
import type { CreateAdminCategorieDto } from './dto/create-admin-categorie.dto';
import type { UpdateAdminCategorieDto } from './dto/update-admin-categorie.dto';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(query: AdminCategoriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.CategorieWhereInput = {
      deleted_at: null,
      ...(q ? { nom: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.categorie.findMany({
        where,
        include: { _count: { select: { appartenir: true } } },
        orderBy: { nom: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.categorie.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminCategorieListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createCategorie(dto: CreateAdminCategorieDto) {
    try {
      const categorie = await this.prisma.categorie.create({
        data: {
          nom: dto.nom.trim(),
          description: dto.description ?? null,
        },
      });

      return { id: categorie.id, nom: categorie.nom };
    } catch (error) {
      this.rethrowUniqueNom(error);
      throw error;
    }
  }

  async updateCategorie(categorieId: string, dto: UpdateAdminCategorieDto) {
    await this.findActiveCategorieOrThrow(categorieId);

    const data: Prisma.CategorieUpdateInput = {};
    if (dto.nom !== undefined) data.nom = dto.nom.trim();
    if (dto.description !== undefined) data.description = dto.description;

    if (Object.keys(data).length === 0) {
      const existing = await this.prisma.categorie.findUnique({
        where: { id: categorieId },
      });
      return {
        id: existing!.id,
        updatedAt: existing!.updatedAt.toISOString(),
      };
    }

    try {
      const updated = await this.prisma.categorie.update({
        where: { id: categorieId },
        data,
      });

      return {
        id: updated.id,
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      this.rethrowUniqueNom(error);
      throw error;
    }
  }

  async softDeleteCategorie(categorieId: string) {
    await this.findActiveCategorieOrThrow(categorieId);

    const activeDefi = await this.prisma.defi.findFirst({
      where: {
        categorie_id: categorieId,
        statut: StatutDefi.ACTIF,
      },
      select: { id: true },
    });

    if (activeDefi) {
      throw new ConflictException(
        'Catégorie référencée par un défi actif — suppression impossible.',
      );
    }

    const updated = await this.prisma.categorie.update({
      where: { id: categorieId },
      data: { deleted_at: new Date() },
    });

    return { deleted_at: updated.deleted_at!.toISOString() };
  }

  private async findActiveCategorieOrThrow(categorieId: string) {
    const categorie = await this.prisma.categorie.findFirst({
      where: { id: categorieId, deleted_at: null },
    });
    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    return categorie;
  }

  private rethrowUniqueNom(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Nom déjà utilisé.');
    }
  }
}
