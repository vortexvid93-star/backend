import type {
  Abonnement,
  Auth,
  Personne,
  PlanAbonnement,
} from '../../../generated/prisma/client';

type AdminSubscriptionRow = Abonnement & {
  plan: PlanAbonnement;
  auth: Auth & { personne: Personne };
};

export function mapAdminSubscription(row: AdminSubscriptionRow) {
  return {
    id: row.id,
    plan: {
      plan: row.plan.plan,
      prix: Number(row.plan.prix),
    },
    date_debut: row.date_debut.toISOString(),
    date_fin: row.date_fin.toISOString(),
    statut: row.statut,
    type_renouvellement: row.type_renouvellement,
    auth: {
      email: row.auth.email,
      personne: {
        nom: row.auth.personne.nom,
        prenom: row.auth.personne.prenom,
      },
    },
  };
}
