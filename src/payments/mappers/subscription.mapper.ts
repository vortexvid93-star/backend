import type {
  Abonnement,
  Paiement,
  PlanAbonnement,
} from '../../../generated/prisma/client';
import { mapPlanSummary } from './plan.mapper';

export function computeJoursRestants(dateFin: Date): number {
  const now = Date.now();
  const fin = dateFin.getTime();
  return Math.max(0, Math.ceil((fin - now) / (1000 * 60 * 60 * 24)));
}

export function mapCurrentSubscription(
  abonnement: Abonnement & { plan: PlanAbonnement },
) {
  return {
    id: abonnement.id,
    plan: mapPlanSummary(abonnement.plan),
    date_debut: abonnement.date_debut.toISOString(),
    date_fin: abonnement.date_fin.toISOString(),
    statut: abonnement.statut,
    type_renouvellement: abonnement.type_renouvellement,
    jours_restants: computeJoursRestants(abonnement.date_fin),
  };
}

export function mapHistoryItem(
  paiement: Paiement & {
    plan: PlanAbonnement;
    abonnement: (Abonnement & { plan: PlanAbonnement }) | null;
  },
) {
  return {
    paiement: {
      id: paiement.id,
      ref_transaction: paiement.ref_transaction,
      montant: Number(paiement.montant),
      devise: paiement.devise,
      statut: paiement.statut,
      operateur: paiement.operateur,
      createdAt: paiement.createdAt.toISOString(),
    },
    abonnement: paiement.abonnement
      ? {
          plan: paiement.abonnement.plan.plan,
          date_debut: paiement.abonnement.date_debut.toISOString(),
          date_fin: paiement.abonnement.date_fin.toISOString(),
          statut: paiement.abonnement.statut,
        }
      : null,
  };
}
