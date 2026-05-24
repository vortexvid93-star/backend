import type { Badge } from '../../../generated/prisma/client';

type BadgeWithCount = Badge & {
  _count: { userbadges: number };
};

export function mapAdminBadgeListItem(badge: BadgeWithCount) {
  return {
    id: badge.id,
    nom: badge.nom,
    icone: badge.icone,
    couleur: badge.couleur,
    description: badge.description,
    points: badge.points,
    nb_utilisateurs: badge._count.userbadges,
  };
}
