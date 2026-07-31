import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  StatutBibliotheque,
  TypeBibliotheque,
} from '../../../generated/prisma/enums';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminBibliothequeListItem } from './admin-libraries.mapper';
import { assertBibliothequeUrlRules } from './bibliotheque-resource.util';
import type { AdminLibrariesQueryDto } from './dto/admin-libraries-query.dto';
import type { AddLibraryBooksDto } from './dto/add-library-books.dto';
import type { CreateAdminLibraryDto } from './dto/create-admin-library.dto';
import type { UpdateAdminLibraryDto } from './dto/update-admin-library.dto';

@Injectable()
export class AdminLibrariesService {
  constructor(private readonly prisma: PrismaService) {}

  async listLibraries(query: AdminLibrariesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BibliothequeWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.bibliotheque.findMany({
        where,
        include: { _count: { select: { appartient: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bibliotheque.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminBibliothequeListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createLibrary(dto: CreateAdminLibraryDto) {
    const urlExterne =
      dto.type === TypeBibliotheque.EXTERNE
        ? dto.url_externe?.trim() || null
        : null;

    assertBibliothequeUrlRules({
      type: dto.type,
      url_externe: urlExterne,
    });

    try {
      const library = await this.prisma.bibliotheque.create({
        data: {
          nom: dto.nom.trim(),
          type: dto.type,
          url_externe: urlExterne,
          description: dto.description ?? null,
          couverture_url: dto.couverture_url?.trim() || null,
          statut: StatutBibliotheque.ACTIVE,
        },
      });

      return {
        id: library.id,
        nom: library.nom,
        type: library.type,
      };
    } catch (error) {
      this.rethrowCheckConstraint(error);
      throw error;
    }
  }

  async updateLibrary(libraryId: string, dto: UpdateAdminLibraryDto) {
    const existing = await this.findBibliothequeOrThrow(libraryId);

    const nextUrl =
      dto.url_externe !== undefined
        ? dto.url_externe.trim() || null
        : existing.url_externe;

    assertBibliothequeUrlRules({
      type: existing.type,
      url_externe: nextUrl,
    });

    const data: Prisma.BibliothequeUpdateInput = {};
    if (dto.nom !== undefined) data.nom = dto.nom.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.couverture_url !== undefined) {
      data.couverture_url = dto.couverture_url.trim() || null;
    }
    if (
      dto.url_externe !== undefined &&
      existing.type === TypeBibliotheque.EXTERNE
    ) {
      data.url_externe = nextUrl;
    } else if (
      dto.url_externe !== undefined &&
      existing.type === TypeBibliotheque.INTERNE
    ) {
      throw new BadRequestException(
        'url_externe ne peut pas être modifié sur une bibliothèque INTERNE.',
      );
    }

    if (Object.keys(data).length === 0) {
      return {
        id: existing.id,
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    try {
      const updated = await this.prisma.bibliotheque.update({
        where: { id: libraryId },
        data,
      });
      return {
        id: updated.id,
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      this.rethrowCheckConstraint(error);
      throw error;
    }
  }

  async archiveLibrary(libraryId: string) {
    await this.findBibliothequeOrThrow(libraryId);

    const updated = await this.prisma.bibliotheque.update({
      where: { id: libraryId },
      data: { statut: StatutBibliotheque.ARCHIVEE },
    });

    return { statut: updated.statut };
  }

  async unarchiveLibrary(libraryId: string) {
    await this.findBibliothequeOrThrow(libraryId);

    const updated = await this.prisma.bibliotheque.update({
      where: { id: libraryId },
      data: { statut: StatutBibliotheque.ACTIVE },
    });

    return { statut: updated.statut };
  }

  async deleteLibrary(libraryId: string) {
    const library = await this.findBibliothequeOrThrow(libraryId);

    if (library.statut !== StatutBibliotheque.ARCHIVEE) {
      throw new BadRequestException(
        'Seule une bibliothèque archivée peut être supprimée définitivement.',
      );
    }

    await this.prisma.bibliotheque.delete({ where: { id: libraryId } });

    return { id: libraryId };
  }

  async addBooks(libraryId: string, dto: AddLibraryBooksDto) {
    const library = await this.findBibliothequeOrThrow(libraryId);

    if (library.type !== TypeBibliotheque.INTERNE) {
      throw new BadRequestException(
        'Seules les bibliothèques INTERNE acceptent des livres associés (RG29).',
      );
    }

    const uniqueIds = [...new Set(dto.livre_ids)];
    const livres = await this.prisma.livre.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    if (livres.length !== uniqueIds.length) {
      throw new NotFoundException('Bibliothèque ou livre introuvable.');
    }

    const result = await this.prisma.appartient.createMany({
      data: uniqueIds.map((livre_id) => ({
        bibliotheque_id: libraryId,
        livre_id,
      })),
      skipDuplicates: true,
    });

    return { added: result.count };
  }

  async removeBook(bibliothequeId: string, livreId: string) {
    await this.findBibliothequeOrThrow(bibliothequeId);

    const deleted = await this.prisma.appartient.deleteMany({
      where: {
        bibliotheque_id: bibliothequeId,
        livre_id: livreId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Association introuvable.');
    }

    return { message: 'Association supprimee.' };
  }

  private async findBibliothequeOrThrow(libraryId: string) {
    const library = await this.prisma.bibliotheque.findUnique({
      where: { id: libraryId },
    });
    if (!library) {
      throw new NotFoundException('Bibliothèque introuvable.');
    }
    return library;
  }

  private rethrowCheckConstraint(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2004' || error.code === 'P2010') {
        throw new BadRequestException(
          'Contrainte url_externe violée (INTERNE sans URL, EXTERNE avec URL obligatoire).',
        );
      }
    }
  }
}
