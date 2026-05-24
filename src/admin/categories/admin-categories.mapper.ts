import type { Categorie } from '../../../generated/prisma/client';

type CategorieWithCount = Categorie & {
  _count: { appartenir: number };
};

export function mapAdminCategorieListItem(categorie: CategorieWithCount) {
  return {
    id: categorie.id,
    nom: categorie.nom,
    description: categorie.description,
    nb_livres: categorie._count.appartenir,
    createdAt: categorie.createdAt.toISOString(),
  };
}
