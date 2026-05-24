import type { Badge, Defi } from '../../../generated/prisma/client';

type DefiAdminRow = Defi & {
  badge: Pick<Badge, 'nom' | 'icone'>;
  _count: { userdefis: number };
};

export function mapAdminChallengeListItem(defi: DefiAdminRow) {
  return {
    id: defi.id,
    titre: defi.titre,
    type: defi.type,
    statut: defi.statut,
    date_debut: defi.date_debut.toISOString(),
    date_fin: defi.date_fin.toISOString(),
    objectif_valeur: defi.objectif_valeur,
    points_bonus: defi.points_bonus,
    nb_participants: defi._count.userdefis,
    badge: {
      nom: defi.badge.nom,
      icone: defi.badge.icone,
    },
  };
}
