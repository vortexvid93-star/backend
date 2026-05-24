import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatutBibliotheque,
  StatutLivre,
  TypeBibliotheque,
} from '../../generated/prisma/enums';
import { BooksCatalogService } from '../books/books-catalog.service';
import {
  BOOK_LIST_INCLUDE,
  BooksSort,
} from '../books/books-query.builder';
import type { LivreCatalogRow } from '../books/books.mapper';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
  LibrariesSort,
  type LibrariesQueryDto,
} from './dto/libraries-query.dto';
import type { LibraryBooksQueryDto } from './dto/library-books-query.dto';
import type { LibraryInProgressQueryDto } from './dto/library-in-progress-query.dto';
import {
  mapBibliothequeDetail,
  mapBibliothequeListItem,
} from './libraries.mapper';

@Injectable()
export class LibrariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booksCatalog: BooksCatalogService,
  ) {}

  async listLibraries(query: LibrariesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.BibliothequeWhereInput = {
      statut: StatutBibliotheque.ACTIVE,
      ...(query.type ? { type: query.type } : {}),
      ...(q
        ? {
            OR: [
              { nom: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = this.resolveLibrariesOrderBy(query.sort);

    const [rows, total] = await Promise.all([
      this.prisma.bibliotheque.findMany({
        where,
        include: { _count: { select: { appartient: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.bibliotheque.count({ where }),
    ]);

    return {
      data: rows.map(mapBibliothequeListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getLibrariesSummary() {
    const [internes, externes, livresInternes] = await Promise.all([
      this.prisma.bibliotheque.count({
        where: { statut: StatutBibliotheque.ACTIVE, type: TypeBibliotheque.INTERNE },
      }),
      this.prisma.bibliotheque.count({
        where: { statut: StatutBibliotheque.ACTIVE, type: TypeBibliotheque.EXTERNE },
      }),
      this.prisma.livre.count({
        where: {
          statut: StatutLivre.PUBLIE,
          appartient: {
            some: {
              bibliotheque: {
                statut: StatutBibliotheque.ACTIVE,
                type: TypeBibliotheque.INTERNE,
              },
            },
          },
        },
      }),
    ]);

    return {
      nb_bibliotheques_actives: internes + externes,
      nb_internes: internes,
      nb_externes: externes,
      total_livres_catalogue_interne: livresInternes,
    };
  }

  async getLibraryById(id: string) {
    const library = await this.findActiveLibraryWithCount(id);

    let livresPopulaires: LivreCatalogRow[] = [];

    if (library.type === TypeBibliotheque.INTERNE) {
      livresPopulaires = await this.prisma.livre.findMany({
        where: {
          statut: StatutLivre.PUBLIE,
          appartient: { some: { bibliotheque_id: id } },
        },
        include: BOOK_LIST_INCLUDE,
        orderBy: { statistique: { nb_lectures: 'desc' } },
        take: 3,
      });
    }

    return mapBibliothequeDetail(library, livresPopulaires);
  }

  async getLibraryStats(id: string) {
    const library = await this.findActiveLibrary(id);

    if (library.type === TypeBibliotheque.EXTERNE) {
      return {
        bibliotheque_id: id,
        type: library.type,
        nb_livres: null,
        note_moyenne_globale: null,
        total_lectures: null,
        total_terminees: null,
        repartition_type_livre: [],
        message:
          'Bibliothèque externe : les livres ne sont pas hébergés dans le catalogue.',
      };
    }

    const livres = await this.prisma.livre.findMany({
      where: {
        statut: StatutLivre.PUBLIE,
        appartient: { some: { bibliotheque_id: id } },
      },
      select: {
        type_livre: true,
        statistique: {
          select: {
            note_moyenne: true,
            nb_lectures: true,
            nb_terminees: true,
          },
        },
      },
    });

    const nb_livres = livres.length;
    let sumNotes = 0;
    let countNotes = 0;
    let total_lectures = 0;
    let total_terminees = 0;
    const typeCount = new Map<string, number>();

    for (const livre of livres) {
      typeCount.set(livre.type_livre, (typeCount.get(livre.type_livre) ?? 0) + 1);
      if (livre.statistique?.note_moyenne != null) {
        sumNotes += livre.statistique.note_moyenne;
        countNotes += 1;
      }
      total_lectures += livre.statistique?.nb_lectures ?? 0;
      total_terminees += livre.statistique?.nb_terminees ?? 0;
    }

    return {
      bibliotheque_id: id,
      type: library.type,
      nb_livres,
      note_moyenne_globale:
        countNotes > 0
          ? Math.round((sumNotes / countNotes) * 100) / 100
          : null,
      total_lectures,
      total_terminees,
      repartition_type_livre: [...typeCount.entries()].map(
        ([type_livre, count]) => ({ type_livre, count }),
      ),
    };
  }

  async getLibraryCategories(id: string) {
    const library = await this.findActiveLibrary(id);

    if (library.type === TypeBibliotheque.EXTERNE) {
      return { data: [] };
    }

    const rows = await this.prisma.appartenir.findMany({
      where: {
        livre: {
          statut: StatutLivre.PUBLIE,
          appartient: { some: { bibliotheque_id: id } },
        },
        categorie: { deleted_at: null },
      },
      select: {
        categorie_id: true,
        categorie: { select: { id: true, nom: true } },
        livre_id: true,
      },
    });

    const byCategory = new Map<
      string,
      { categorie_id: string; nom: string; nb_livres: number }
    >();

    for (const row of rows) {
      const existing = byCategory.get(row.categorie_id);
      if (existing) {
        existing.nb_livres += 1;
      } else {
        byCategory.set(row.categorie_id, {
          categorie_id: row.categorie.id,
          nom: row.categorie.nom,
          nb_livres: 1,
        });
      }
    }

    const data = [...byCategory.values()].sort((a, b) =>
      a.nom.localeCompare(b.nom),
    );

    return { data };
  }

  async listLibraryBooks(
    authId: string,
    libraryId: string,
    query: LibraryBooksQueryDto,
  ) {
    const library = await this.findActiveLibrary(libraryId);

    if (library.type === TypeBibliotheque.EXTERNE) {
      throw new BadRequestException(
        'Bibliothèque de type EXTERNE : aucun livre en base. Utilisez url_externe.',
      );
    }

    return this.booksCatalog.listForLibrary(
      authId,
      {
        bibliotheque_id: libraryId,
        q: query.q,
        type_livre: query.type_livre,
        categorie_id: query.categorie_id,
        auteur_id: query.auteur_id,
        langue: query.langue,
        is_downloadable: query.is_downloadable,
      },
      query.page ?? 1,
      query.limit ?? 20,
      query.sort ?? BooksSort.RECENT,
    );
  }

  async listLibraryBooksInProgress(
    authId: string,
    libraryId: string,
    query: LibraryInProgressQueryDto,
  ) {
    const library = await this.findActiveLibrary(libraryId);

    if (library.type === TypeBibliotheque.EXTERNE) {
      throw new BadRequestException(
        'Bibliothèque de type EXTERNE : aucune progression en base.',
      );
    }

    return this.booksCatalog.listInProgressForLibrary(
      authId,
      libraryId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  private resolveLibrariesOrderBy(
    sort: LibrariesSort = LibrariesSort.NOM,
  ): Prisma.BibliothequeOrderByWithRelationInput {
    if (sort === LibrariesSort.NB_LIVRES) {
      return { appartient: { _count: 'desc' } };
    }
    return { nom: 'asc' };
  }

  private async findActiveLibrary(id: string) {
    const library = await this.prisma.bibliotheque.findUnique({
      where: { id },
    });

    if (!library || library.statut !== StatutBibliotheque.ACTIVE) {
      throw new NotFoundException('Bibliothèque introuvable ou non active.');
    }

    return library;
  }

  private async findActiveLibraryWithCount(id: string) {
    const library = await this.prisma.bibliotheque.findUnique({
      where: { id },
      include: { _count: { select: { appartient: true } } },
    });

    if (!library || library.statut !== StatutBibliotheque.ACTIVE) {
      throw new NotFoundException('Bibliothèque introuvable ou non active.');
    }

    return library;
  }
}
