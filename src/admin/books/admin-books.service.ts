import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { StatutLivre, TypeLivre } from '../../../generated/prisma/enums';
import { BOOK_LIST_INCLUDE } from '../../books/books-query.builder';
import { buildPaginationMeta } from '../../common/pagination.util';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { BookFileStorageService } from '../../storage/book-file-storage.service';
import { isR2BookObjectKey } from '../../storage/book-file-storage.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminBookListItem } from './admin-books.mapper';
import type { AdminBooksQueryDto } from './dto/admin-books-query.dto';
import type { AssignBookAuthorsDto } from './dto/assign-authors.dto';
import type { AssignBookCategoriesDto } from './dto/assign-categories.dto';
import type { CreateAdminBookDto } from './dto/create-admin-book.dto';
import type { UpdateAdminBookDto } from './dto/update-admin-book.dto';
import { assertLivreResourceRules } from './livre-resource.util';

@Injectable()
export class AdminBooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly bookStorage: BookFileStorageService,
  ) {}

  async listBooks(query: AdminBooksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.LivreWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.type_livre ? { type_livre: query.type_livre } : {}),
      ...(query.is_downloadable !== undefined
        ? { is_downloadable: query.is_downloadable }
        : {}),
      ...(q ? { titre: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.livre.findMany({
        where,
        include: BOOK_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.livre.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminBookListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createBook(
    dto: CreateAdminBookDto,
    file?: Express.Multer.File,
    couvertureFile?: Express.Multer.File,
  ) {
    const isDownloadable =
      dto.type_livre === TypeLivre.EXTERNE
        ? false
        : (dto.is_downloadable ?? false);

    let cloudinaryPublicId: string | null = null;
    const urlExterne = dto.url_externe_livre?.trim() || null;

    if (dto.type_livre === TypeLivre.INTERNE) {
      if (urlExterne) {
        throw new BadRequestException(
          'url_externe_livre ne doit pas être envoyé pour un livre INTERNE.',
        );
      }
      this.bookStorage.assertValidBookFile(file);
      const upload = await this.bookStorage.uploadBookFile(file);
      cloudinaryPublicId = upload.objectKey;
    } else {
      if (file) {
        throw new BadRequestException(
          'Le champ file ne doit pas être envoyé pour un livre EXTERNE.',
        );
      }
    }

    assertLivreResourceRules({
      type_livre: dto.type_livre,
      cloudinary_public_id: cloudinaryPublicId,
      url_externe_livre: urlExterne,
      is_downloadable: isDownloadable,
    });

    let couvertureUrl: string | null = null;
    if (couvertureFile) {
      this.cloudinary.assertValidCoverFile(couvertureFile);
      const coverUpload = await this.cloudinary.uploadBookCover(couvertureFile);
      couvertureUrl = coverUpload.secure_url;
    }

    try {
      const livre = await this.prisma.$transaction(async (tx) => {
        const created = await tx.livre.create({
          data: {
            titre: dto.titre.trim(),
            type_livre: dto.type_livre,
            cloudinary_public_id: cloudinaryPublicId,
            url_externe_livre: urlExterne,
            is_downloadable: isDownloadable,
            isbn: dto.isbn?.trim() || null,
            resume: dto.resume ?? null,
            couverture_url: couvertureUrl,
            langue: dto.langue?.trim() || 'Français',
            annee_publication: dto.annee_publication ?? null,
            nombre_pages: dto.nombre_pages ?? null,
            statut: StatutLivre.PUBLIE,
          },
        });

        await tx.statistiqueLivre.create({
          data: { livre_id: created.id },
        });

        return created;
      });

      return {
        id: livre.id,
        titre: livre.titre,
        type_livre: livre.type_livre,
        statut: livre.statut,
      };
    } catch (error) {
      if (couvertureUrl) {
        await this.cloudinary.deleteByUrl(couvertureUrl);
      }
      this.rethrowPrismaConflict(error);
      throw error;
    }
  }

  async updateBook(
    livreId: string,
    dto: UpdateAdminBookDto,
    file?: Express.Multer.File,
    couvertureFile?: Express.Multer.File,
  ) {
    const existing = await this.findLivreOrThrow(livreId);

    let nextCloudinaryId = existing.cloudinary_public_id;
    if (existing.type_livre === TypeLivre.INTERNE && file) {
      this.bookStorage.assertValidBookFile(file);
      const upload = await this.bookStorage.uploadBookFile(file);
      if (existing.cloudinary_public_id) {
        await this.deleteBookResource(existing.cloudinary_public_id);
      }
      nextCloudinaryId = upload.objectKey;
    } else if (file) {
      throw new BadRequestException(
        'Le remplacement de fichier est réservé aux livres INTERNE.',
      );
    }

    const merged = {
      type_livre: existing.type_livre,
      cloudinary_public_id:
        dto.cloudinary_public_id !== undefined
          ? dto.cloudinary_public_id.trim() || null
          : nextCloudinaryId,
      url_externe_livre:
        dto.url_externe_livre !== undefined
          ? dto.url_externe_livre.trim() || null
          : existing.url_externe_livre,
      is_downloadable:
        dto.is_downloadable !== undefined
          ? dto.is_downloadable
          : existing.is_downloadable,
    };

    if (existing.type_livre === TypeLivre.INTERNE) {
      merged.url_externe_livre = null;
    } else {
      merged.is_downloadable = false;
    }

    assertLivreResourceRules(merged);

    const data: Prisma.LivreUpdateInput = {};
    if (dto.titre !== undefined) data.titre = dto.titre.trim();
    if (dto.cloudinary_public_id !== undefined || file) {
      data.cloudinary_public_id = merged.cloudinary_public_id;
    }
    if (dto.url_externe_livre !== undefined) {
      data.url_externe_livre = merged.url_externe_livre;
    }
    if (dto.is_downloadable !== undefined) {
      data.is_downloadable = merged.is_downloadable;
    }
    if (dto.isbn !== undefined) data.isbn = dto.isbn.trim() || null;
    if (dto.resume !== undefined) data.resume = dto.resume;
    if (couvertureFile) {
      this.cloudinary.assertValidCoverFile(couvertureFile);
      const coverUpload = await this.cloudinary.uploadBookCover(
        couvertureFile,
        livreId,
      );
      data.couverture_url = coverUpload.secure_url;
    }
    if (dto.langue !== undefined) data.langue = dto.langue.trim();
    if (dto.annee_publication !== undefined) {
      data.annee_publication = dto.annee_publication;
    }
    if (dto.nombre_pages !== undefined) {
      data.nombre_pages = dto.nombre_pages;
    }

    if (Object.keys(data).length === 0) {
      return { id: existing.id, updatedAt: existing.updatedAt.toISOString() };
    }

    try {
      const updated = await this.prisma.livre.update({
        where: { id: livreId },
        data,
      });

      if (
        couvertureFile &&
        existing.couverture_url &&
        existing.couverture_url !== updated.couverture_url
      ) {
        await this.cloudinary.deleteByUrl(existing.couverture_url);
      }

      return {
        id: updated.id,
        updatedAt: updated.updatedAt.toISOString(),
        ...(couvertureFile ? { couverture_url: updated.couverture_url } : {}),
      };
    } catch (error) {
      this.rethrowPrismaConflict(error);
      throw error;
    }
  }

  async archiveBook(livreId: string) {
    await this.findLivreOrThrow(livreId);

    const updated = await this.prisma.livre.update({
      where: { id: livreId },
      data: { statut: StatutLivre.ARCHIVE },
    });

    return { id: updated.id, statut: updated.statut };
  }

  async assignCategories(livreId: string, dto: AssignBookCategoriesDto) {
    await this.findLivreOrThrow(livreId);

    const uniqueIds = [...new Set(dto.categorie_ids)];
    if (uniqueIds.length > 0) {
      const categories = await this.prisma.categorie.findMany({
        where: { id: { in: uniqueIds }, deleted_at: null },
      });
      if (categories.length !== uniqueIds.length) {
        throw new BadRequestException(
          'Une ou plusieurs catégories sont introuvables ou archivées.',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.appartenir.deleteMany({ where: { livre_id: livreId } }),
      ...(uniqueIds.length > 0
        ? [
            this.prisma.appartenir.createMany({
              data: uniqueIds.map((categorie_id) => ({
                livre_id: livreId,
                categorie_id,
              })),
            }),
          ]
        : []),
    ]);

    const rows = await this.prisma.appartenir.findMany({
      where: { livre_id: livreId },
      include: { categorie: true },
    });

    return {
      categories: rows
        .map((row) => row.categorie)
        .filter((c) => !c.deleted_at)
        .map((c) => ({ id: c.id, nom: c.nom })),
    };
  }

  async assignAuthors(livreId: string, dto: AssignBookAuthorsDto) {
    await this.findLivreOrThrow(livreId);

    const uniqueIds = [...new Set(dto.auteur_ids)];
    if (uniqueIds.length > 0) {
      const auteurs = await this.prisma.auteur.findMany({
        where: { id: { in: uniqueIds }, deleted_at: null },
      });
      if (auteurs.length !== uniqueIds.length) {
        throw new BadRequestException(
          'Un ou plusieurs auteurs sont introuvables ou archivés.',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.livreAuteur.deleteMany({ where: { livre_id: livreId } }),
      ...(uniqueIds.length > 0
        ? [
            this.prisma.livreAuteur.createMany({
              data: uniqueIds.map((auteur_id) => ({
                livre_id: livreId,
                auteur_id,
              })),
            }),
          ]
        : []),
    ]);

    const rows = await this.prisma.livreAuteur.findMany({
      where: { livre_id: livreId },
      include: { auteur: true },
    });

    return {
      auteurs: rows
        .map((row) => row.auteur)
        .filter((a) => !a.deleted_at)
        .map((a) => ({ id: a.id, nom: a.nom, prenom: a.prenom })),
    };
  }

  private async findLivreOrThrow(livreId: string) {
    const livre = await this.prisma.livre.findUnique({
      where: { id: livreId },
    });
    if (!livre) {
      throw new NotFoundException('Livre introuvable.');
    }
    return livre;
  }

  /** Supprime le fichier livre (R2 ou Cloudinary legacy selon la clé stockée). */
  private async deleteBookResource(resourceKey: string): Promise<void> {
    if (isR2BookObjectKey(resourceKey)) {
      await this.bookStorage.deleteByObjectKey(resourceKey);
    } else {
      await this.cloudinary.deleteBookByPublicId(resourceKey);
    }
  }

  private rethrowPrismaConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('ISBN déjà utilisé.');
    }
  }
}
