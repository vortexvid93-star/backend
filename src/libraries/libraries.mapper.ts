import type { Bibliotheque } from '../../generated/prisma/client';
import { TypeBibliotheque } from '../../generated/prisma/enums';
import type { LivreCatalogRow } from '../books/books.mapper';
import { mapLivreCatalogItem } from '../books/books.mapper';

type BibliothequeWithCount = Bibliotheque & {
  _count: { appartient: number };
};

export function mapBibliothequeListItem(library: BibliothequeWithCount) {
  const isExterne = library.type === TypeBibliotheque.EXTERNE;

  return {
    id: library.id,
    nom: library.nom,
    description: library.description,
    couverture_url: library.couverture_url,
    type: library.type,
    url_externe: isExterne ? library.url_externe : null,
    nb_livres: isExterne ? null : library._count.appartient,
  };
}

export function mapLivrePopulaire(livre: LivreCatalogRow) {
  const item = mapLivreCatalogItem(livre);
  return {
    id: item.id,
    titre: item.titre,
    couverture_url: item.couverture_url,
    note_moyenne: item.note_moyenne,
    nb_lectures: item.nb_lectures,
  };
}

export function mapBibliothequeDetail(
  library: BibliothequeWithCount,
  livresPopulaires: LivreCatalogRow[],
) {
  const isExterne = library.type === TypeBibliotheque.EXTERNE;

  return {
    id: library.id,
    nom: library.nom,
    description: library.description,
    couverture_url: library.couverture_url,
    type: library.type,
    url_externe: library.url_externe,
    statut: library.statut,
    nb_livres: isExterne ? null : library._count.appartient,
    acces_livres: isExterne ? ('EXTERNE_REDIRECT' as const) : ('CATALOGUE_INTERNE' as const),
    livres_populaires: isExterne
      ? []
      : livresPopulaires.map(mapLivrePopulaire),
  };
}
