import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatutLivre } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { BOOK_LIST_INCLUDE } from '../books/books-query.builder';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildSearchTextWhere,
  mapHistoriqueRecherche,
  mapLivreSearchItem,
} from './discovery.mapper';
import type { SearchHistoryQueryDto } from './dto/search-history-query.dto';
import type { SearchQueryDto } from './dto/search-query.dto';

const ONE_HOUR_MS = 60 * 60 * 1000;

function normalizeSearchTerm(q: string): string {
  return q.trim();
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchBooks(authId: string, query: SearchQueryDto) {
    const terme = normalizeSearchTerm(query.q);
    if (terme.length < 2) {
      throw new BadRequestException('Terme trop court (minimum 2 caractères).');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LivreWhereInput = {
      statut: StatutLivre.PUBLIE,
      AND: [
        buildSearchTextWhere(terme),
        ...(query.categorie_id
          ? [{ appartenir: { some: { categorie_id: query.categorie_id } } }]
          : []),
        ...(query.langue ? [{ langue: query.langue }] : []),
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.livre.findMany({
        where,
        include: BOOK_LIST_INCLUDE,
        orderBy: { titre: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.livre.count({ where }),
    ]);

    await this.recordSearchHistory(authId, terme, total);

    return {
      data: rows.map(mapLivreSearchItem),
      meta: buildPaginationMeta(page, limit, total),
      terme,
    };
  }

  async listSearchHistory(authId: string, query: SearchHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { auth_id: authId };

    const [rows, total] = await Promise.all([
      this.prisma.historiqueRecherche.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.historiqueRecherche.count({ where }),
    ]);

    return {
      data: rows.map(mapHistoriqueRecherche),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async clearSearchHistory(authId: string) {
    const result = await this.prisma.historiqueRecherche.deleteMany({
      where: { auth_id: authId },
    });

    return {
      message: 'Historique de recherche effacé.',
      nb_supprimees: result.count,
    };
  }

  async deleteSearchHistory(authId: string, id: string) {
    const row = await this.prisma.historiqueRecherche.findUnique({
      where: { id },
    });

    if (!row) {
      throw new NotFoundException('Entrée introuvable.');
    }

    if (row.auth_id !== authId) {
      throw new ForbiddenException(
        "Entrée appartient à un autre utilisateur.",
      );
    }

    await this.prisma.historiqueRecherche.delete({ where: { id } });

    return { message: 'Entree supprimee.' };
  }

  async markSearchHistoryClick(authId: string, id: string) {
    const row = await this.prisma.historiqueRecherche.findUnique({
      where: { id },
    });

    if (!row || row.auth_id !== authId) {
      throw new NotFoundException('Entrée introuvable.');
    }

    const updated = await this.prisma.historiqueRecherche.update({
      where: { id },
      data: { a_clique: true },
    });

    return { a_clique: updated.a_clique };
  }

  private async recordSearchHistory(
    authId: string,
    terme: string,
    nbResultats: number,
  ) {
    const since = new Date(Date.now() - ONE_HOUR_MS);
    const recent = await this.prisma.historiqueRecherche.findFirst({
      where: {
        auth_id: authId,
        terme,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      await this.prisma.historiqueRecherche.update({
        where: { id: recent.id },
        data: { nb_resultats: nbResultats },
      });
      return;
    }

    await this.prisma.historiqueRecherche.create({
      data: {
        auth_id: authId,
        terme,
        nb_resultats: nbResultats,
      },
    });
  }
}
