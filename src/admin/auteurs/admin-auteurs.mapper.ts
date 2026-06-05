import type { Auteur } from '../../../generated/prisma/client';

type AuteurWithCount = Auteur & {
  _count: { livre_auteurs: number };
};

export function mapAdminAuteurListItem(auteur: AuteurWithCount) {
  return {
    id: auteur.id,
    nom: auteur.nom,
    prenom: auteur.prenom,
    bio: auteur.bio,
    nb_livres: auteur._count.livre_auteurs,
    createdAt: auteur.createdAt.toISOString(),
  };
}
