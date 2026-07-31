import type {
  Abonnement,
  Auth,
  Etablissement,
  Personne,
  PlanAbonnement,
} from '../../generated/prisma/client';

type EtablissementMembreActif = { etablissement: Etablissement } | null;

export function formatDateOnly(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function mapPersonne(personne: Personne) {
  return {
    nom: personne.nom,
    prenom: personne.prenom,
    date_naissance: formatDateOnly(personne.date_naissance),
    photo_profil_url: personne.photo_profil_url,
    bio: personne.bio,
    genre: personne.genre,
    ecole: personne.ecole,
    niveau: personne.niveau,
    points: personne.points,
  };
}

export function mapAbonnementActif(
  abonnement: Abonnement & { plan: PlanAbonnement },
) {
  const now = Date.now();
  const fin = abonnement.date_fin.getTime();
  const jours_restants = Math.max(
    0,
    Math.ceil((fin - now) / (1000 * 60 * 60 * 24)),
  );

  return {
    id: abonnement.id,
    plan: abonnement.plan.plan,
    date_debut: abonnement.date_debut.toISOString(),
    date_fin: abonnement.date_fin.toISOString(),
    jours_restants,
  };
}

/**
 * Objet `abonnement_actif` synthétique pour un membre établissement, utilisé
 * quand l'utilisateur n'a aucun abonnement individuel payant. `plan` porte le
 * nom de l'école pour affichage direct côté mobile (`plan.startsWith('Établissement')`).
 */
function mapEtablissementAbonnementActif(etablissement: Etablissement) {
  const now = Date.now();
  const fin = etablissement.date_fin.getTime();
  const jours_restants = Math.max(
    0,
    Math.ceil((fin - now) / (1000 * 60 * 60 * 24)),
  );

  return {
    id: etablissement.id,
    plan: `Établissement · ${etablissement.nom}`,
    date_debut: etablissement.date_debut.toISOString(),
    date_fin: etablissement.date_fin.toISOString(),
    jours_restants,
  };
}

/**
 * Résout `abonnement_actif` : abonnement individuel payant en priorité, sinon
 * repli sur un membership établissement actif — logique partagée entre
 * `mapFullProfile` (`GET /me`) et `mapDashboardProfile` (`GET /me/dashboard`)
 * pour que le statut premium soit cohérent entre les deux écrans mobiles.
 */
function resolveAbonnementActif(
  abonnement: (Abonnement & { plan: PlanAbonnement }) | null,
  etablissementMembre: EtablissementMembreActif,
) {
  if (abonnement) return mapAbonnementActif(abonnement);
  if (
    etablissementMembre &&
    etablissementMembre.etablissement.statut === 'ACTIF' &&
    etablissementMembre.etablissement.date_fin > new Date()
  ) {
    return mapEtablissementAbonnementActif(etablissementMembre.etablissement);
  }
  return null;
}

export function mapFullProfile(
  auth: Auth & { personne: Personne },
  abonnement: (Abonnement & { plan: PlanAbonnement }) | null,
  etablissementMembre: EtablissementMembreActif = null,
) {
  const abonnement_actif = resolveAbonnementActif(
    abonnement,
    etablissementMembre,
  );

  return {
    id: auth.id,
    email: auth.email,
    role: auth.role,
    statut: auth.statut,
    auth_provider: auth.auth_provider,
    email_verified: auth.email_verified,
    numero_telephone: auth.numero_telephone,
    date_inscription: auth.date_inscription.toISOString(),
    derniere_connexion: auth.derniere_connexion?.toISOString() ?? null,
    personne: mapPersonne(auth.personne),
    abonnement_actif,
  };
}

export function mapDashboardProfile(
  auth: Auth & { personne: Personne },
  abonnement: (Abonnement & { plan: PlanAbonnement }) | null,
  etablissementMembre: EtablissementMembreActif = null,
) {
  return {
    id: auth.id,
    email: auth.email,
    prenom: auth.personne.prenom,
    nom: auth.personne.nom,
    photo_profil_url: auth.personne.photo_profil_url,
    points: auth.personne.points,
    email_verified: auth.email_verified,
    abonnement_actif: resolveAbonnementActif(abonnement, etablissementMembre),
  };
}

export function mapReadingItem(row: {
  id: string;
  page_actuelle: number;
  pourcentage: number;
  duree_lecture_min: number;
  statut: string;
  derniere_maj: Date;
  date_debut: Date;
  date_fin: Date | null;
  livre: {
    id: string;
    titre: string;
    couverture_url: string | null;
    type_livre: string;
    nombre_pages: number | null;
    livre_auteurs: { auteur: { nom: string; prenom: string | null } }[];
  };
}) {
  const firstAuteur = row.livre.livre_auteurs[0]?.auteur;
  const auteur = firstAuteur
    ? `${firstAuteur.prenom ?? ''} ${firstAuteur.nom}`.trim()
    : null;
  return {
    progression_id: row.id,
    livre: {
      id: row.livre.id,
      titre: row.livre.titre,
      couverture_url: row.livre.couverture_url,
      type_livre: row.livre.type_livre,
      nombre_pages: row.livre.nombre_pages,
      auteur,
    },
    page_actuelle: row.page_actuelle,
    pourcentage: row.pourcentage,
    duree_lecture_min: row.duree_lecture_min,
    statut: row.statut,
    derniere_maj: row.derniere_maj.toISOString(),
    date_debut: row.date_debut.toISOString(),
    date_fin: row.date_fin?.toISOString() ?? null,
  };
}
