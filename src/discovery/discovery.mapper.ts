import type { RaisonRecommandation } from '../../generated/prisma/enums';
import type {
  Auteur,
  HistoriqueRecherche,
  Notification,
  Prisma,
} from '../../generated/prisma/client';
import type { LivreCatalogRow } from '../books/books.mapper';
import { BOOK_LIST_INCLUDE } from '../books/books-query.builder';
import {
  buildRecommendationContexte,
  getRaisonLibelle,
  type RecommendationContext,
} from './recommendations-context.util';

export const RECOMMANDATION_LIVRE_INCLUDE = {
  livre: {
    include: BOOK_LIST_INCLUDE,
  },
} as const;

export type RecommandationRow = {
  id: string;
  score: { toNumber(): number } | number | string;
  raison: string;
  vu: boolean;
  clique: boolean;
  livre: LivreCatalogRow;
};

function mapAuteursSearch(auteurs: { auteur: Auteur }[]) {
  return auteurs
    .map((row) => row.auteur)
    .filter((auteur) => !auteur.deleted_at)
    .map((auteur) => ({
      id: auteur.id,
      nom: auteur.nom,
      prenom: auteur.prenom,
    }));
}

export function mapLivreSearchItem(livre: LivreCatalogRow) {
  return {
    id: livre.id,
    titre: livre.titre,
    couverture_url: livre.couverture_url,
    type_livre: livre.type_livre,
    auteurs: mapAuteursSearch(livre.livre_auteurs),
    note_moyenne: livre.statistique?.note_moyenne ?? null,
  };
}

function mapCategoriesBrief(livre: LivreCatalogRow) {
  return livre.appartenir
    .map((row) => row.categorie)
    .filter((c) => !c.deleted_at)
    .map((c) => ({ id: c.id, nom: c.nom }));
}

export function mapRecommandation(
  row: RecommandationRow,
  ctx?: RecommendationContext,
) {
  const score =
    typeof row.score === 'object' && row.score !== null && 'toNumber' in row.score
      ? row.score.toNumber()
      : Number(row.score);

  const raison = row.raison as RaisonRecommandation;
  const contexte = ctx
    ? buildRecommendationContexte(raison, row.livre, ctx)
    : null;

  return {
    id: row.id,
    livre: {
      id: row.livre.id,
      titre: row.livre.titre,
      couverture_url: row.livre.couverture_url,
      type_livre: row.livre.type_livre,
      note_moyenne: row.livre.statistique?.note_moyenne ?? null,
      nb_lectures: row.livre.statistique?.nb_lectures ?? 0,
      auteurs: mapAuteursSearch(row.livre.livre_auteurs),
      categories: mapCategoriesBrief(row.livre),
    },
    score,
    raison,
    raison_libelle: getRaisonLibelle(raison),
    contexte,
    vu: row.vu,
    clique: row.clique,
  };
}

export function mapSimilarLivre(
  livre: LivreCatalogRow,
  score: number,
  raison: RaisonRecommandation,
  ctx?: RecommendationContext,
) {
  const contexte = ctx
    ? buildRecommendationContexte(raison, livre, ctx)
    : null;
  return {
    livre: {
      id: livre.id,
      titre: livre.titre,
      couverture_url: livre.couverture_url,
      type_livre: livre.type_livre,
      note_moyenne: livre.statistique?.note_moyenne ?? null,
      auteurs: mapAuteursSearch(livre.livre_auteurs),
      categories: mapCategoriesBrief(livre),
    },
    score,
    raison,
    raison_libelle: getRaisonLibelle(raison),
    contexte,
  };
}

export function mapHistoriqueRecherche(row: HistoriqueRecherche) {
  return {
    id: row.id,
    terme: row.terme,
    nb_resultats: row.nb_resultats,
    a_clique: row.a_clique,
    createdAt: row.createdAt,
  };
}

export function mapNotification(row: Notification) {
  return {
    id: row.id,
    titre: row.titre,
    contenu: row.contenu,
    type: row.type,
    lu: row.lu,
    createdAt: row.createdAt,
  };
}

export function buildSearchTextWhere(term: string): Prisma.LivreWhereInput {
  const q = term;
  return {
    OR: [
      { titre: { contains: q, mode: 'insensitive' } },
      { resume: { contains: q, mode: 'insensitive' } },
      {
        livre_auteurs: {
          some: {
            auteur: {
              OR: [
                { nom: { contains: q, mode: 'insensitive' } },
                { prenom: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      },
    ],
  };
}
