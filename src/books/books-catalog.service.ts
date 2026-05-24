import { Injectable, NotFoundException } from '@nestjs/common';
import { StatutLivre } from '../../generated/prisma/enums';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  BOOK_LIST_INCLUDE,
  BooksSort,
  buildPublishedLivreWhere,
  resolveBooksOrderBy,
  type PublishedLivreFilters,
} from './books-query.builder';
import {
  mapLivreCatalogItem,
  mapLivreDetail,
  mapLivreLibraryItemWithUser,
} from './books.mapper';
import { StatutProgression } from '../../generated/prisma/enums';
import { evaluateBookAccess } from './books-access.eligibility';
import type { BooksCatalogQueryDto } from './dto/books-catalog-query.dto';

@Injectable()
export class BooksCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCatalog(authId: string, query: BooksCatalogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filters: PublishedLivreFilters = {
      q: query.q,
      type_livre: query.type_livre,
      categorie_id: query.categorie_id,
      auteur_id: query.auteur_id,
      langue: query.langue,
      is_downloadable: query.is_downloadable,
      bibliotheque_id: query.bibliotheque_id,
    };

    const { rows, total } = await this.fetchPublished(
      filters,
      page,
      limit,
      query.sort ?? BooksSort.RECENT,
    );

    const searchTerm = query.q?.trim();
    if (searchTerm) {
      await this.prisma.historiqueRecherche.create({
        data: {
          auth_id: authId,
          terme: searchTerm,
          nb_resultats: total,
        },
      });
    }

    return {
      data: rows.map(mapLivreCatalogItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async listForLibrary(
    authId: string,
    filters: PublishedLivreFilters,
    page: number,
    limit: number,
    sort: BooksSort,
  ) {
    const result = await this.fetchPublished(filters, page, limit, sort);
    const livreIds = result.rows.map((row) => row.id);

    const progressions =
      livreIds.length === 0
        ? []
        : await this.prisma.progressionLecture.findMany({
            where: { auth_id: authId, livre_id: { in: livreIds } },
          });

    const progressionByLivre = new Map(
      progressions.map((row) => [row.livre_id, row]),
    );

    return {
      data: result.rows.map((livre) =>
        mapLivreLibraryItemWithUser(
          livre,
          progressionByLivre.get(livre.id),
        ),
      ),
      meta: buildPaginationMeta(page, limit, result.total),
    };
  }

  async listInProgressForLibrary(
    authId: string,
    bibliothequeId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      auth_id: authId,
      statut: StatutProgression.EN_COURS,
      livre: {
        statut: StatutLivre.PUBLIE,
        appartient: { some: { bibliotheque_id: bibliothequeId } },
      },
    };

    const [rows, total] = await Promise.all([
      this.prisma.progressionLecture.findMany({
        where,
        include: {
          livre: { include: BOOK_LIST_INCLUDE },
        },
        orderBy: { derniere_maj: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.progressionLecture.count({ where }),
    ]);

    return {
      data: rows.map((row) =>
        mapLivreLibraryItemWithUser(row.livre, row),
      ),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private async fetchPublished(
    filters: PublishedLivreFilters,
    page: number,
    limit: number,
    sort: BooksSort,
  ) {
    const skip = (page - 1) * limit;
    const where = buildPublishedLivreWhere(filters);
    const orderBy = resolveBooksOrderBy(sort);

    const [rows, total] = await Promise.all([
      this.prisma.livre.findMany({
        where,
        include: BOOK_LIST_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.livre.count({ where }),
    ]);

    return { rows, total };
  }

  async getBookDetail(authId: string, livreId: string) {
    const livre = await this.prisma.livre.findFirst({
      where: { id: livreId, statut: StatutLivre.PUBLIE },
      include: BOOK_LIST_INCLUDE,
    });

    if (!livre) {
      throw new NotFoundException('Livre introuvable ou archivé.');
    }

    const [progression, notation] = await Promise.all([
      this.prisma.progressionLecture.findUnique({
        where: { auth_id_livre_id: { auth_id: authId, livre_id: livreId } },
      }),
      this.prisma.noter.findUnique({
        where: { auth_id_livre_id: { auth_id: authId, livre_id: livreId } },
      }),
    ]);

    const access = await evaluateBookAccess(this.prisma, authId, livre);

    return mapLivreDetail(livre, progression, notation?.valeur ?? null, {
      peut_lire: access.peut_lire,
      peut_telecharger: access.peut_telecharger,
      raison_blocage: access.raison_blocage,
      ressource_disponible: access.ressource_disponible,
      acces_type: access.acces_type,
    });
  }

  async findPublishedBook(livreId: string) {
    const livre = await this.prisma.livre.findFirst({
      where: { id: livreId, statut: StatutLivre.PUBLIE },
    });

    if (!livre) {
      throw new NotFoundException('Livre introuvable ou archivé.');
    }

    return livre;
  }
}
