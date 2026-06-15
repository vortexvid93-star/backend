import type {
  Abonnement,
  Auth,
  Paiement,
  Personne,
  PlanAbonnement,
} from '../../../generated/prisma/client';
import { mapAbonnementActif } from '../../profile/profile.mapper';

type AuthWithPersonne = Auth & { personne: Personne };

export function mapAdminUserListItem(
  auth: AuthWithPersonne,
  abonnement: (Abonnement & { plan: PlanAbonnement }) | null,
) {
  return {
    id: auth.id,
    email: auth.email,
    role: auth.role,
    statut: auth.statut,
    auth_provider: auth.auth_provider,
    email_verified: auth.email_verified,
    date_inscription: auth.date_inscription.toISOString(),
    derniere_connexion: auth.derniere_connexion?.toISOString() ?? null,
    personne: {
      nom: auth.personne.nom,
      prenom: auth.personne.prenom,
      points: auth.personne.points,
    },
    abonnement_actif: abonnement ? mapAbonnementActif(abonnement) : null,
  };
}

export function mapAdminUserDetailAuth(auth: Auth) {
  return {
    id: auth.id,
    email: auth.email,
    role: auth.role,
    statut: auth.statut,
    auth_provider: auth.auth_provider,
    email_verified: auth.email_verified,
    date_inscription: auth.date_inscription.toISOString(),
    numero_telephone: auth.numero_telephone,
  };
}

export function mapAdminUserDetailPersonne(personne: Personne) {
  return {
    nom: personne.nom,
    prenom: personne.prenom,
    bio: personne.bio,
    ecole: personne.ecole,
    niveau: personne.niveau,
    points: personne.points,
    deleted_at: personne.deleted_at?.toISOString() ?? null,
  };
}

export function mapAdminAbonnement(row: Abonnement & { plan: PlanAbonnement }) {
  return {
    id: row.id,
    paiement_id: row.paiement_id,
    plan: row.plan.plan,
    plan_id: row.plan_id,
    date_debut: row.date_debut.toISOString(),
    date_fin: row.date_fin.toISOString(),
    statut: row.statut,
    type_renouvellement: row.type_renouvellement,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapAdminPaiement(row: Paiement & { plan: PlanAbonnement }) {
  return {
    id: row.id,
    plan: row.plan.plan,
    plan_id: row.plan_id,
    montant: Number(row.montant),
    devise: row.devise,
    operateur: row.operateur,
    numero_telephone: row.numero_telephone,
    ref_transaction: row.ref_transaction,
    statut: row.statut,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
