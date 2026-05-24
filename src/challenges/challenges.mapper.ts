import { TypeDefi } from '../../generated/prisma/enums';
import type { Badge, Categorie, Auteur, Livre, UserDefi } from '../../generated/prisma/client';

type DefiWithBadge = {
  id: string;
  titre: string;
  description: string | null;
  type: TypeDefi;
  objectif_valeur: number;
  points_bonus: number;
  date_debut: Date;
  date_fin: Date;
  badge: Badge;
  categorie?: Categorie | null;
  auteur?: Auteur | null;
  livre?: Livre | null;
};

export function mapBadgeSummary(badge: Badge) {
  return {
    id: badge.id,
    nom: badge.nom,
    icone: badge.icone,
    couleur: badge.couleur,
    points: badge.points,
  };
}

export function mapMaParticipation(
  participation: Pick<UserDefi, 'progression' | 'statut' | 'date_completion'> | null | undefined,
) {
  if (!participation) return null;
  return {
    progression: participation.progression,
    statut: participation.statut,
    ...(participation.date_completion !== undefined
      ? { date_completion: participation.date_completion?.toISOString() ?? null }
      : {}),
  };
}

export function mapChallengeListItem(
  defi: DefiWithBadge,
  participation: Pick<UserDefi, 'progression' | 'statut'> | null | undefined,
) {
  return {
    id: defi.id,
    titre: defi.titre,
    description: defi.description,
    type: defi.type,
    objectif_valeur: defi.objectif_valeur,
    points_bonus: defi.points_bonus,
    date_debut: defi.date_debut.toISOString(),
    date_fin: defi.date_fin.toISOString(),
    badge: mapBadgeSummary(defi.badge),
    ma_participation: participation
      ? { progression: participation.progression, statut: participation.statut }
      : null,
  };
}

export function mapChallengeDetail(
  defi: DefiWithBadge,
  participation: UserDefi | null | undefined,
) {
  return {
    id: defi.id,
    titre: defi.titre,
    description: defi.description,
    type: defi.type,
    objectif_valeur: defi.objectif_valeur,
    points_bonus: defi.points_bonus,
    date_debut: defi.date_debut.toISOString(),
    date_fin: defi.date_fin.toISOString(),
    badge: mapBadgeSummary(defi.badge),
    categorie:
      defi.type === TypeDefi.CATEGORIE && defi.categorie
        ? { id: defi.categorie.id, nom: defi.categorie.nom }
        : null,
    auteur:
      defi.type === TypeDefi.AUTEUR && defi.auteur
        ? { id: defi.auteur.id, nom: defi.auteur.nom, prenom: defi.auteur.prenom }
        : null,
    livre:
      defi.type === TypeDefi.LIVRE_SPECIFIQUE && defi.livre
        ? { id: defi.livre.id, titre: defi.livre.titre }
        : null,
    ma_participation: mapMaParticipation(participation),
  };
}
