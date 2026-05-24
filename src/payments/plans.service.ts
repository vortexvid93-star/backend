import { Injectable, NotFoundException } from '@nestjs/common';
import { StatutPlan } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { mapPlanItem } from './mappers/plan.mapper';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listActivePlans() {
    const plans = await this.prisma.planAbonnement.findMany({
      where: { statut: StatutPlan.ACTIF },
      orderBy: { prix: 'asc' },
    });

    return { data: plans.map(mapPlanItem) };
  }

  async getPlanById(planId: string) {
    const plan = await this.prisma.planAbonnement.findFirst({
      where: { id: planId, statut: StatutPlan.ACTIF },
    });

    if (!plan) {
      throw new NotFoundException('Plan introuvable ou inactif.');
    }

    return mapPlanItem(plan);
  }

  async findActivePlanById(planId: string) {
    return this.prisma.planAbonnement.findFirst({
      where: { id: planId, statut: StatutPlan.ACTIF },
    });
  }
}
