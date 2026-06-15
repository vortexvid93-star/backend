import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RaisonRecommandation,
  StatutLivre,
  StatutProgression,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { BOOK_LIST_INCLUDE } from '../books/books-query.builder';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapRecommandation,
  mapSimilarLivre,
  RECOMMANDATION_LIVRE_INCLUDE,
} from './discovery.mapper';
import type { InteractRecommendationDto } from './dto/interact-recommendation.dto';
import type { RecommendationsPicksQueryDto } from './dto/recommendations-picks-query.dto';
import type { RecommendationsQueryDto } from './dto/recommendations-query.dto';
import type { RecommendationsRefreshDto } from './dto/recommendations-refresh.dto';
import type { SimilarBooksQueryDto } from './dto/similar-books-query.dto';
import { RECOMMENDATIONS_CONSTANTS as C } from './recommendations.constants';
import { RecommendationsEngineService } from './recommendations-engine.service';
import { getRaisonLibelle } from './recommendations-context.util';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: RecommendationsEngineService,
  ) {}

  private publishedUnreadWhere(
    authId: string,
    typeLivre?: RecommendationsQueryDto['type_livre'],
  ): Prisma.RecommandationWhereInput {
    return {
      auth_id: authId,
      livre: {
        statut: StatutLivre.PUBLIE,
        ...(typeLivre ? { type_livre: typeLivre } : {}),
        // N'exclut que les livres terminés — les livres en cours restent recommandables
        progressions: {
          none: { auth_id: authId, statut: StatutProgression.TERMINE },
        },
      },
    };
  }

  private buildListWhere(
    authId: string,
    query: RecommendationsQueryDto,
  ): Prisma.RecommandationWhereInput {
    return {
      ...this.publishedUnreadWhere(authId, query.type_livre),
      ...(query.raison ? { raison: query.raison } : {}),
      ...(query.vu !== undefined ? { vu: query.vu } : {}),
      ...(query.clique !== undefined ? { clique: query.clique } : {}),
      ...(query.score_min !== undefined
        ? { score: { gte: query.score_min } }
        : {}),
    };
  }

  async listRecommendations(authId: string, query: RecommendationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(authId, query);

    const [rows, total, ctx] = await Promise.all([
      this.prisma.recommandation.findMany({
        where,
        include: RECOMMANDATION_LIVRE_INCLUDE,
        orderBy: { score: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.recommandation.count({ where }),
      this.engine.buildContext(authId),
    ]);

    return {
      data: rows.map((row) => mapRecommandation(row, ctx)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getSummary(authId: string) {
    const base = this.publishedUnreadWhere(authId);

    const [total, nonVues, parRaison, meilleurScore] = await Promise.all([
      this.prisma.recommandation.count({ where: base }),
      this.prisma.recommandation.count({ where: { ...base, vu: false } }),
      this.prisma.recommandation.groupBy({
        by: ['raison'],
        where: base,
        _count: { raison: true },
      }),
      this.prisma.recommandation.findFirst({
        where: base,
        orderBy: { score: 'desc' },
        select: { score: true, livre: { select: { titre: true } } },
      }),
    ]);

    const par_raison = Object.values(RaisonRecommandation).map((raison) => {
      const found = parRaison.find((r) => r.raison === raison);
      return {
        raison,
        libelle: getRaisonLibelle(raison),
        count: found?._count.raison ?? 0,
      };
    });

    const score =
      meilleurScore?.score != null
        ? typeof meilleurScore.score === 'object' &&
          'toNumber' in meilleurScore.score
          ? meilleurScore.score.toNumber()
          : Number(meilleurScore.score)
        : null;

    return {
      total,
      non_vues: nonVues,
      par_raison,
      meilleur_score: score,
      meilleur_titre: meilleurScore?.livre.titre ?? null,
    };
  }

  async getPicks(authId: string, query: RecommendationsPicksQueryDto) {
    const limit = query.limit ?? C.MAX_PICKS_DEFAULT;
    const where = this.publishedUnreadWhere(authId);

    const [rows, ctx] = await Promise.all([
      this.prisma.recommandation.findMany({
        where,
        include: RECOMMANDATION_LIVRE_INCLUDE,
        orderBy: { score: 'desc' },
        take: limit,
      }),
      this.engine.buildContext(authId),
    ]);

    const picks = rows.map((row) => mapRecommandation(row, ctx));

    // Fallback : si le pool de recommandations est insuffisant, compléter avec des livres populaires
    if (picks.length < limit) {
      const alreadyShownIds = new Set(picks.map((p) => p.livre.id));
      type FallbackLivre = Awaited<
        ReturnType<typeof this.prisma.livre.findFirst>
      > & {
        livre_auteurs: {
          auteur: {
            id: string;
            nom: string;
            prenom: string;
            deleted_at: Date | null;
          };
        }[];
        appartenir: {
          categorie: { id: string; nom: string; deleted_at: Date | null };
        }[];
        statistique: {
          note_moyenne: number | null;
          nb_lectures: number;
        } | null;
      };

      const fallbackBooks = (await this.prisma.livre.findMany({
        where: {
          statut: StatutLivre.PUBLIE,
          id: { notIn: [...alreadyShownIds] },
          progressions: {
            none: { auth_id: authId, statut: StatutProgression.TERMINE },
          },
        },
        include: BOOK_LIST_INCLUDE,
        orderBy: [
          { statistique: { nb_lectures: 'desc' } },
          { createdAt: 'desc' },
        ],
        take: limit - picks.length,
      })) as unknown as FallbackLivre[];

      for (const livre of fallbackBooks) {
        picks.push({
          id: `catalogue-${livre.id}`,
          livre: {
            id: livre.id,
            titre: livre.titre,
            couverture_url: livre.couverture_url,
            type_livre: livre.type_livre,
            note_moyenne: livre.statistique?.note_moyenne ?? null,
            nb_lectures: livre.statistique?.nb_lectures ?? 0,
            auteurs: livre.livre_auteurs
              .filter((la) => !la.auteur.deleted_at)
              .map((la) => ({
                id: la.auteur.id,
                nom: la.auteur.nom,
                prenom: la.auteur.prenom,
              })),
            categories: livre.appartenir
              .filter((a) => !a.categorie.deleted_at)
              .map((a) => ({ id: a.categorie.id, nom: a.categorie.nom })),
          },
          score: 0,
          raison: RaisonRecommandation.POPULAR,
          raison_libelle: 'Populaire',
          contexte: null,
          vu: false,
          clique: false,
        });
      }
    }

    return { data: picks, limit };
  }

  async getByReason(authId: string) {
    const where = this.publishedUnreadWhere(authId);
    const ctx = await this.engine.buildContext(authId);

    const grouped = await Promise.all(
      Object.values(RaisonRecommandation).map(async (raison) => {
        const rows = await this.prisma.recommandation.findMany({
          where: { ...where, raison },
          include: RECOMMANDATION_LIVRE_INCLUDE,
          orderBy: { score: 'desc' },
          take: 10,
        });
        return {
          raison,
          libelle: getRaisonLibelle(raison),
          count: await this.prisma.recommandation.count({
            where: { ...where, raison },
          }),
          items: rows.map((row) => mapRecommandation(row, ctx)),
        };
      }),
    );

    return { groupes: grouped.filter((g) => g.count > 0) };
  }

  async refresh(authId: string, dto: RecommendationsRefreshDto) {
    const limit = dto.limit ?? C.MAX_TOTAL_PER_REFRESH;
    const result = await this.engine.refreshForUser(authId, limit);
    const summary = await this.getSummary(authId);
    return {
      message: 'Recommandations recalculées à partir de votre historique.',
      ...result,
      summary,
    };
  }

  async getById(authId: string, id: string) {
    const row = await this.prisma.recommandation.findUnique({
      where: { id },
      include: RECOMMANDATION_LIVRE_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException('Recommandation introuvable.');
    }
    if (row.auth_id !== authId) {
      throw new ForbiddenException(
        'Recommandation appartient à un autre utilisateur.',
      );
    }

    const ctx = await this.engine.buildContext(authId);
    return mapRecommandation(row, ctx);
  }

  async getForBook(
    authId: string,
    livreId: string,
    query: SimilarBooksQueryDto,
  ) {
    const livre = await this.prisma.livre.findFirst({
      where: { id: livreId, statut: StatutLivre.PUBLIE },
    });
    if (!livre) {
      throw new NotFoundException('Livre introuvable.');
    }

    return this.buildSimilarResponse(
      authId,
      livreId,
      query.limit ?? C.MAX_SIMILAR_DEFAULT,
    );
  }

  async getSimilarBooks(
    authId: string,
    livreId: string,
    query: SimilarBooksQueryDto,
  ) {
    return this.getForBook(authId, livreId, query);
  }

  private async buildSimilarResponse(
    authId: string,
    livreId: string,
    limit: number,
  ) {
    const ctx = await this.engine.buildContext(authId);
    const [scored, sourceLivre, excluded] = await Promise.all([
      this.engine.computeSimilarForBook(authId, livreId, limit),
      this.prisma.livre.findFirst({
        where: { id: livreId, statut: StatutLivre.PUBLIE },
        include: {
          appartenir: { select: { categorie_id: true } },
          livre_auteurs: { select: { auteur_id: true } },
        },
      }),
      this.engine.getExcludedLivreIds(authId),
    ]);

    if (scored.length === 0) {
      return {
        livre_id: livreId,
        data: [],
        message:
          'Aucun livre similaire disponible : vous avez peut‑être déjà ouvert tous les titres proches, ou le catalogue est limité pour ce livre.',
        diagnostique: {
          livre_a_categories: (sourceLivre?.appartenir.length ?? 0) > 0,
          livre_a_auteurs: (sourceLivre?.livre_auteurs.length ?? 0) > 0,
          nb_livres_deja_ouverts: excluded.size,
          conseil:
            'Lancez POST /recommendations/refresh ou explorez GET /books pour découvrir d’autres titres.',
        },
      };
    }

    const livres = await this.prisma.livre.findMany({
      where: { id: { in: scored.map((s) => s.livre_id) } },
      include: BOOK_LIST_INCLUDE,
    });
    const byId = new Map(livres.map((l) => [l.id, l]));

    const data = scored
      .map((s) => {
        const livre = byId.get(s.livre_id);
        if (!livre) return null;
        return mapSimilarLivre(livre, s.score, s.raison, ctx);
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    const stored = await this.prisma.recommandation.findMany({
      where: {
        auth_id: authId,
        livre_id: { in: scored.map((s) => s.livre_id) },
      },
      select: { livre_id: true, id: true },
    });
    const storedMap = new Map(stored.map((r) => [r.livre_id, r.id]));

    return {
      livre_id: livreId,
      data: data.map((item) => ({
        ...item,
        recommendation_id: storedMap.get(item.livre.id) ?? null,
      })),
    };
  }

  async markAllSeen(authId: string) {
    const result = await this.prisma.recommandation.updateMany({
      where: { auth_id: authId, vu: false },
      data: { vu: true },
    });
    return {
      message: 'Toutes les recommandations ont été marquées comme vues.',
      updated: result.count,
    };
  }

  async dismiss(authId: string, id: string) {
    return this.interact(authId, id, { vu: true });
  }

  async interact(authId: string, id: string, dto: InteractRecommendationDto) {
    if (dto.vu !== true && dto.clique !== true) {
      throw new BadRequestException(
        'Indiquez au moins vu: true ou clique: true.',
      );
    }

    const row = await this.prisma.recommandation.findUnique({
      where: { id },
      include: RECOMMANDATION_LIVRE_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException('Recommandation introuvable.');
    }

    if (row.auth_id !== authId) {
      throw new ForbiddenException(
        'Recommandation appartient à un autre utilisateur.',
      );
    }

    const updated = await this.prisma.recommandation.update({
      where: { id },
      data: {
        ...(dto.vu === true ? { vu: true } : {}),
        ...(dto.clique === true ? { clique: true, vu: true } : {}),
      },
      include: RECOMMANDATION_LIVRE_INCLUDE,
    });

    const ctx = await this.engine.buildContext(authId);
    return mapRecommandation(updated, ctx);
  }

  async getDashboardSlice(authId: string) {
    const [summary, picks] = await Promise.all([
      this.getSummary(authId),
      this.getPicks(authId, { limit: 5 }),
    ]);
    return {
      nb_recos_non_vues: summary.non_vues,
      picks: picks.data,
    };
  }
}
