import type { Auteur } from '../../../generated/prisma/client';

export function mapAdminAuteurListItem(auteur: Auteur) {
  return {
    id: auteur.id,
    nom: auteur.nom,
    prenom: auteur.prenom,
    bio: auteur.bio,
    createdAt: auteur.createdAt.toISOString(),
  };
}
