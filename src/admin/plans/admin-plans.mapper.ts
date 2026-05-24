import type { PlanAbonnement } from '../../../generated/prisma/client';

export function mapAdminPlanListItem(plan: PlanAbonnement) {
  return {
    id: plan.id,
    plan: plan.plan,
    prix: Number(plan.prix),
    devise: plan.devise,
    duree_jours: plan.duree_jours,
    statut: plan.statut,
  };
}
