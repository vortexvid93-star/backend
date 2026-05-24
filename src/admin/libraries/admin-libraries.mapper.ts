import type { Bibliotheque } from '../../../generated/prisma/client';
import { TypeBibliotheque } from '../../../generated/prisma/enums';

type BibliothequeWithCount = Bibliotheque & {
  _count: { appartient: number };
};

export function mapAdminBibliothequeListItem(library: BibliothequeWithCount) {
  const isExterne = library.type === TypeBibliotheque.EXTERNE;

  return {
    id: library.id,
    nom: library.nom,
    type: library.type,
    statut: library.statut,
    nb_livres: library._count.appartient,
    url_externe: isExterne ? library.url_externe : null,
  };
}
