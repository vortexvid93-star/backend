import { PlanType } from '../../generated/prisma/enums';

export const PLAN_RANK: Record<PlanType, number> = {
  [PlanType.HEBDOMADAIRE]: 1,
  [PlanType.MENSUEL]: 2,
  [PlanType.ANNUEL]: 3,
};

export function comparePlans(
  current: PlanType,
  previous: PlanType,
): 'UPGRADE' | 'RENOUVELLEMENT' {
  return PLAN_RANK[current] > PLAN_RANK[previous]
    ? 'UPGRADE'
    : 'RENOUVELLEMENT';
}
