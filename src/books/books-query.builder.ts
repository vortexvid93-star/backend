import type { Prisma } from '../../generated/prisma/client';
import { StatutLivre, type TypeLivre } from '../../generated/prisma/enums';

export const BOOK_LIST_INCLUDE = {
  livre_auteurs: { include: { auteur: true } },
  appartenir: { include: { categorie: true } },
  statistique: true,
} satisfies Prisma.LivreInclude;

export enum BooksSort {
  NOTE_MOYENNE = 'note_moyenne',
  NB_LECTURES = 'nb_lectures',
  NB_LECTURES_7J = 'nb_lectures_7j',
  RECENT = 'recent',
  TITRE = 'titre',
}

export interface PublishedLivreFilters {
  q?: string;
  type_livre?: TypeLivre;
  categorie_id?: string;
  auteur_id?: string;
  langue?: string;
  is_downloadable?: boolean;
  bibliotheque_id?: string;
}

/** Recherche sur les métadonnées catalogue (pas le contenu du fichier hébergé). */
export function buildLivreMetadataSearch(q: string): Prisma.LivreWhereInput {
  const term = q.trim();
  if (!term) return {};

  return {
    OR: [
      { titre: { contains: term, mode: 'insensitive' } },
      { isbn: { contains: term, mode: 'insensitive' } },
      { resume: { contains: term, mode: 'insensitive' } },
      { langue: { contains: term, mode: 'insensitive' } },
      {
        livre_auteurs: {
          some: {
            auteur: {
              OR: [
                { nom: { contains: term, mode: 'insensitive' } },
                { prenom: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      },
    ],
  };
}

export function buildPublishedLivreWhere(
  filters: PublishedLivreFilters,
): Prisma.LivreWhereInput {
  const q = filters.q?.trim();

  return {
    statut: StatutLivre.PUBLIE,
    ...(q ? buildLivreMetadataSearch(q) : {}),
    ...(filters.type_livre ? { type_livre: filters.type_livre } : {}),
    ...(filters.langue ? { langue: filters.langue } : {}),
    ...(filters.is_downloadable !== undefined
      ? { is_downloadable: filters.is_downloadable }
      : {}),
    ...(filters.categorie_id
      ? { appartenir: { some: { categorie_id: filters.categorie_id } } }
      : {}),
    ...(filters.auteur_id
      ? { livre_auteurs: { some: { auteur_id: filters.auteur_id } } }
      : {}),
    ...(filters.bibliotheque_id
      ? { appartient: { some: { bibliotheque_id: filters.bibliotheque_id } } }
      : {}),
  };
}

export function resolveBooksOrderBy(
  sort: BooksSort,
): Prisma.LivreOrderByWithRelationInput {
  switch (sort) {
    case BooksSort.TITRE:
      return { titre: 'asc' };
    case BooksSort.NOTE_MOYENNE:
      return {
        statistique: { note_moyenne: { sort: 'desc', nulls: 'last' } },
      };
    case BooksSort.NB_LECTURES:
      return { statistique: { nb_lectures: 'desc' } };
    case BooksSort.NB_LECTURES_7J:
      return { statistique: { nb_lectures_7j: 'desc' } };
    case BooksSort.RECENT:
    default:
      return { createdAt: 'desc' };
  }
}
