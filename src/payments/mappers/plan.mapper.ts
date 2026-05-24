import type { PlanAbonnement } from '../../../generated/prisma/client';

export function mapPlanItem(plan: PlanAbonnement) {
  return {
    id: plan.id,
    plan: plan.plan,
    prix: Number(plan.prix),
    devise: plan.devise,
    duree_jours: plan.duree_jours,
  };
}

export function mapPlanSummary(plan: PlanAbonnement) {
  return {
    plan: plan.plan,
    prix: Number(plan.prix),
    devise: plan.devise,
    duree_jours: plan.duree_jours,
  };
}
