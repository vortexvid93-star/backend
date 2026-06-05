import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { StatutPlan } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { MIN_PLAN_PRIX_XOF } from './admin-plans.constants';
import { mapAdminPlanListItem } from './admin-plans.mapper';
import type { CreateAdminPlanDto } from './dto/create-admin-plan.dto';
import type { UpdateAdminPlanDto } from './dto/update-admin-plan.dto';

@Injectable()
export class AdminPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans() {
    const plans = await this.prisma.planAbonnement.findMany({
      orderBy: { prix: 'asc' },
    });

    return { data: plans.map(mapAdminPlanListItem) };
  }

  async createPlan(dto: CreateAdminPlanDto) {
    this.assertMinPrix(dto.prix);

    try {
      const plan = await this.prisma.planAbonnement.create({
        data: {
          plan: dto.plan,
          prix: dto.prix,
          devise: dto.devise?.trim() || 'XOF',
          duree_jours: dto.duree_jours,
          statut: StatutPlan.ACTIF,
        },
      });

      return mapAdminPlanListItem(plan);
    } catch (error) {
      this.rethrowUniquePlan(error);
      throw error;
    }
  }

  async updatePlan(planId: string, dto: UpdateAdminPlanDto) {
    const existing = await this.findPlanOrThrow(planId);

    if (dto.prix !== undefined) {
      this.assertMinPrix(dto.prix);
    }

    const data: Prisma.PlanAbonnementUpdateInput = {};
    if (dto.prix !== undefined) data.prix = dto.prix;
    if (dto.duree_jours !== undefined) data.duree_jours = dto.duree_jours;
    if (dto.statut !== undefined) data.statut = dto.statut;

    if (Object.keys(data).length === 0) {
      return {
        id: existing.id,
        prix: Number(existing.prix),
        statut: existing.statut,
      };
    }

    const updated = await this.prisma.planAbonnement.update({
      where: { id: planId },
      data,
    });

    return {
      id: updated.id,
      prix: Number(updated.prix),
      statut: updated.statut,
    };
  }

  private async findPlanOrThrow(planId: string) {
    const plan = await this.prisma.planAbonnement.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException('Plan introuvable.');
    }
    return plan;
  }

  private assertMinPrix(prix: number) {
    if (prix < MIN_PLAN_PRIX_XOF) {
      throw new BadRequestException(
        `Le prix minimum est de ${MIN_PLAN_PRIX_XOF} XOF.`,
      );
    }
  }

  private rethrowUniquePlan(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Type de plan déjà existant.');
    }
  }
}
