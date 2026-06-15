import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  RaisonRecommandation,
  StatutLivre,
  StatutProgression,
  type TypeLivre,
} from '../../generated/prisma/enums';
import { BOOK_LIST_INCLUDE } from '../books/books-query.builder';
import { PrismaService } from '../prisma/prisma.service';
import type { RecommendationContext } from './recommendations-context.util';
import { RECOMMENDATIONS_CONSTANTS as C } from './recommendations.constants';

type ScoredCandidate = {
  livre_id: string;
  score: number;
  raison: RaisonRecommandation;
  hint?: { categorie_nom?: string; auteur_nom?: string };
};

@Injectable()
export class RecommendationsEngineService {
  private readonly logger = new Logger(RecommendationsEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buildContext(authId: string): Promise<RecommendationContext> {
    const [finished, searches] = await Promise.all([
      this.prisma.progressionLecture.findMany({
        where: { auth_id: authId, statut: StatutProgression.TERMINE },
        include: {
          livre: {
            include: {
              appartenir: { include: { categorie: true } },
              livre_auteurs: { include: { auteur: true } },
            },
          },
        },
        orderBy: { date_fin: 'desc' },
        take: C.FINISHED_BOOKS_LOOKBACK,
      }),
      this.prisma.historiqueRecherche.findMany({
        where: { auth_id: authId },
        orderBy: { createdAt: 'desc' },
        take: C.SEARCH_HISTORY_LOOKBACK,
        select: { terme: true },
      }),
    ]);

    return {
      finishedBooks: finished.map((row) => ({
        id: row.livre.id,
        titre: row.livre.titre,
        categorieIds: row.livre.appartenir.map((a) => a.categorie.id),
        categorieNoms: row.livre.appartenir.map((a) => a.categorie.nom),
        auteurIds: row.livre.livre_auteurs.map((a) => a.auteur.id),
        auteurNoms: row.livre.livre_auteurs.map((a) =>
          [a.auteur.prenom, a.auteur.nom].filter(Boolean).join(' '),
        ),
      })),
      recentSearchTerms: searches.map((s) => s.terme.trim()).filter(Boolean),
    };
  }

  async getExcludedLivreIds(authId: string): Promise<Set<string>> {
    const rows = await this.prisma.progressionLecture.findMany({
      where: { auth_id: authId },
      select: { livre_id: true },
    });
    return new Set(rows.map((r) => r.livre_id));
  }

  async refreshForUser(
    authId: string,
    limit: number = C.MAX_TOTAL_PER_REFRESH,
  ): Promise<{ upserted: number; removed: number }> {
    const excluded = await this.getExcludedLivreIds(authId);
    const ctx = await this.buildContext(authId);
    const candidates = await this.collectAllCandidates(authId, excluded, ctx);
    const merged = this.mergeCandidates(candidates);
    const boosted = await this.applySearchBoostToLivres(
      merged,
      ctx.recentSearchTerms,
    );
    const top = boosted.sort((a, b) => b.score - a.score).slice(0, limit);

    const removed = await this.prisma.recommandation.deleteMany({
      where: {
        auth_id: authId,
        livre_id: { in: [...excluded] },
      },
    });

    let upserted = 0;
    for (const item of top) {
      await this.prisma.recommandation.upsert({
        where: {
          auth_id_livre_id: { auth_id: authId, livre_id: item.livre_id },
        },
        create: {
          auth_id: authId,
          livre_id: item.livre_id,
          score: this.toDecimalScore(item.score),
          raison: item.raison,
        },
        update: {
          score: this.toDecimalScore(item.score),
          raison: item.raison,
        },
      });
      upserted += 1;
    }

    return { upserted, removed: removed.count };
  }

  async refreshAfterBookCompleted(
    authId: string,
    completedLivreId: string,
  ): Promise<void> {
    try {
      const excluded = await this.getExcludedLivreIds(authId);
      const ctx = await this.buildContext(authId);
      const source = ctx.finishedBooks.find((b) => b.id === completedLivreId);

      const partial: ScoredCandidate[] = [];
      if (source) {
        partial.push(
          ...(await this.collectGenreCandidates(
            excluded,
            new Set(source.categorieIds),
            ctx,
          )),
          ...(await this.collectAuthorCandidates(
            excluded,
            new Set(source.auteurIds),
            ctx,
          )),
        );
      }

      const merged = this.mergeCandidates(partial);
      const boosted = (
        await this.applySearchBoostToLivres(merged, ctx.recentSearchTerms)
      ).slice(0, 15);

      for (const item of boosted) {
        await this.prisma.recommandation.upsert({
          where: {
            auth_id_livre_id: { auth_id: authId, livre_id: item.livre_id },
          },
          create: {
            auth_id: authId,
            livre_id: item.livre_id,
            score: this.toDecimalScore(item.score),
            raison: item.raison,
          },
          update: {
            score: this.toDecimalScore(item.score),
            raison: item.raison,
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `refreshAfterBookCompleted échoué pour ${authId}: ${String(err)}`,
      );
    }
  }

  async computeSimilarForBook(
    authId: string,
    livreId: string,
    limit: number,
  ): Promise<ScoredCandidate[]> {
    const livre = await this.prisma.livre.findFirst({
      where: { id: livreId, statut: StatutLivre.PUBLIE },
      include: BOOK_LIST_INCLUDE,
    });
    if (!livre) return [];

    const excluded = await this.getExcludedLivreIds(authId);
    excluded.add(livreId);
    const ctx = await this.buildContext(authId);

    const catIds = new Set(
      livre.appartenir.map((a) => a.categorie_id ?? a.categorie.id),
    );
    const autIds = new Set(livre.livre_auteurs.map((a) => a.auteur_id));

    let candidates = this.mergeCandidates([
      ...(await this.collectGenreCandidates(excluded, catIds, ctx)),
      ...(await this.collectAuthorCandidates(excluded, autIds, ctx)),
    ]);

    if (candidates.length < limit) {
      candidates = this.mergeCandidates([
        ...candidates,
        ...(await this.collectPopularCandidates(excluded)),
        ...(await this.collectTrendingCandidates(excluded)),
        ...(await this.collectSameTypeCandidates(excluded, livre.type_livre)),
      ]);
    }

    const boosted = await this.applySearchBoostToLivres(
      candidates,
      ctx.recentSearchTerms,
    );
    return boosted.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async collectSameTypeCandidates(
    excluded: Set<string>,
    typeLivre: TypeLivre,
  ): Promise<ScoredCandidate[]> {
    const livres = await this.prisma.livre.findMany({
      where: {
        statut: StatutLivre.PUBLIE,
        type_livre: typeLivre,
        id: { notIn: [...excluded] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return livres.map((l, i) => ({
      livre_id: l.id,
      score: Math.min(C.SCORE_MAX, 0.62 + (20 - i) * 0.008),
      raison: RaisonRecommandation.TRENDING,
    }));
  }

  private async collectAllCandidates(
    authId: string,
    excluded: Set<string>,
    ctx: RecommendationContext,
  ): Promise<ScoredCandidate[]> {
    const genreIds = new Set(ctx.finishedBooks.flatMap((b) => b.categorieIds));
    const authorIds = new Set(ctx.finishedBooks.flatMap((b) => b.auteurIds));

    return [
      ...(await this.collectGenreCandidates(excluded, genreIds, ctx)),
      ...(await this.collectAuthorCandidates(excluded, authorIds, ctx)),
      ...(await this.collectPopularCandidates(excluded)),
      ...(await this.collectTrendingCandidates(excluded)),
    ];
  }

  private async collectGenreCandidates(
    excluded: Set<string>,
    categorieIds: Set<string>,
    _ctx: RecommendationContext,
  ): Promise<ScoredCandidate[]> {
    if (categorieIds.size === 0) return [];

    const livres = await this.prisma.livre.findMany({
      where: {
        statut: StatutLivre.PUBLIE,
        id: { notIn: [...excluded] },
        appartenir: { some: { categorie_id: { in: [...categorieIds] } } },
      },
      include: {
        appartenir: { include: { categorie: true } },
      },
      take: 40,
    });

    return livres.map((livre) => {
      const overlap = livre.appartenir.filter((a) =>
        categorieIds.has(a.categorie_id),
      ).length;
      const catNom =
        overlap > 0 ? livre.appartenir[0]?.categorie.nom : undefined;
      return {
        livre_id: livre.id,
        score: Math.min(C.SCORE_MAX, 0.72 + Math.min(overlap, 5) * 0.04),
        raison: RaisonRecommandation.SAME_GENRE,
        hint: catNom ? { categorie_nom: catNom } : undefined,
      };
    });
  }

  private async collectAuthorCandidates(
    excluded: Set<string>,
    auteurIds: Set<string>,
    ctx: RecommendationContext,
  ): Promise<ScoredCandidate[]> {
    if (auteurIds.size === 0) return [];
    void ctx;

    const livres = await this.prisma.livre.findMany({
      where: {
        statut: StatutLivre.PUBLIE,
        id: { notIn: [...excluded] },
        livre_auteurs: { some: { auteur_id: { in: [...auteurIds] } } },
      },
      include: {
        livre_auteurs: { include: { auteur: true } },
      },
      take: 40,
    });

    return livres.map((livre) => {
      const aut = livre.livre_auteurs[0]?.auteur;
      const auteurNom = aut
        ? [aut.prenom, aut.nom].filter(Boolean).join(' ')
        : undefined;
      return {
        livre_id: livre.id,
        score: 0.78,
        raison: RaisonRecommandation.SAME_AUTHOR,
        hint: auteurNom ? { auteur_nom: auteurNom } : undefined,
      };
    });
  }

  private async collectPopularCandidates(
    excluded: Set<string>,
  ): Promise<ScoredCandidate[]> {
    const stats = await this.prisma.statistiqueLivre.findMany({
      where: {
        livre: {
          statut: StatutLivre.PUBLIE,
          id: { notIn: [...excluded] },
        },
      },
      include: { livre: true },
      orderBy: [{ nb_terminees: 'desc' }, { nb_lectures: 'desc' }],
      take: 30,
    });

    if (stats.length === 0) {
      const fallback = await this.prisma.livre.findMany({
        where: { statut: StatutLivre.PUBLIE, id: { notIn: [...excluded] } },
        take: 15,
        orderBy: { createdAt: 'desc' },
      });
      return fallback.map((l, i) => ({
        livre_id: l.id,
        score: 0.6 + (15 - i) * 0.01,
        raison: RaisonRecommandation.POPULAR,
      }));
    }

    const maxTerminees = Math.max(1, ...stats.map((s) => s.nb_terminees));

    return stats.map((s) => {
      const ratio = s.nb_terminees / maxTerminees;
      const notePart = s.note_moyenne != null ? (s.note_moyenne / 5) * 0.15 : 0;
      return {
        livre_id: s.livre_id,
        score: Math.min(C.SCORE_MAX, 0.58 + ratio * 0.32 + notePart),
        raison: RaisonRecommandation.POPULAR,
      };
    });
  }

  private async collectTrendingCandidates(
    excluded: Set<string>,
  ): Promise<ScoredCandidate[]> {
    const since = new Date();
    since.setDate(since.getDate() - C.TRENDING_WINDOW_DAYS);

    const grouped = await this.prisma.progressionLecture.groupBy({
      by: ['livre_id'],
      where: {
        derniere_maj: { gte: since },
        livre: {
          statut: StatutLivre.PUBLIE,
          id: { notIn: [...excluded] },
        },
      },
      _count: { livre_id: true },
      orderBy: { _count: { livre_id: 'desc' } },
      take: 25,
    });

    if (grouped.length === 0) {
      const recent = await this.prisma.livre.findMany({
        where: { statut: StatutLivre.PUBLIE, id: { notIn: [...excluded] } },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      });
      return recent.map((l, i) => ({
        livre_id: l.id,
        score: 0.62 + (12 - i) * 0.01,
        raison: RaisonRecommandation.TRENDING,
      }));
    }

    const maxCount = Math.max(1, ...grouped.map((g) => g._count.livre_id));

    return grouped.map((g) => ({
      livre_id: g.livre_id,
      score: Math.min(C.SCORE_MAX, 0.6 + (g._count.livre_id / maxCount) * 0.35),
      raison: RaisonRecommandation.TRENDING,
    }));
  }

  private mergeCandidates(items: ScoredCandidate[]): ScoredCandidate[] {
    const map = new Map<string, ScoredCandidate>();
    for (const item of items) {
      const prev = map.get(item.livre_id);
      if (!prev || item.score > prev.score) {
        map.set(item.livre_id, item);
      }
    }
    return [...map.values()].filter((c) => c.score >= C.SCORE_MIN);
  }

  async applySearchBoostToLivres(
    items: ScoredCandidate[],
    terms: string[],
  ): Promise<ScoredCandidate[]> {
    if (terms.length === 0) return items;

    const livreIds = items.map((i) => i.livre_id);
    const livres = await this.prisma.livre.findMany({
      where: { id: { in: livreIds } },
      select: { id: true, titre: true, resume: true },
    });
    const byId = new Map(livres.map((l) => [l.id, l]));

    return items.map((item) => {
      const livre = byId.get(item.livre_id);
      if (!livre) return item;
      const haystack = `${livre.titre} ${livre.resume ?? ''}`.toLowerCase();
      const matched = terms.some((t) =>
        haystack.includes(t.toLowerCase().slice(0, 80)),
      );
      if (!matched) return item;
      return {
        ...item,
        score: Math.min(C.SCORE_MAX, item.score + C.SEARCH_SCORE_BOOST),
      };
    });
  }

  private toDecimalScore(score: number): Prisma.Decimal {
    return new Prisma.Decimal(
      Math.min(C.SCORE_MAX, Math.max(0, score)).toFixed(3),
    );
  }
}
