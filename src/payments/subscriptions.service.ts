import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PlanType,
  StatutPaiement,
} from '../../generated/prisma/enums';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import type { SubscriptionHistoryQueryDto } from './dto/history-query.dto';
import {
  mapCurrentSubscription,
  mapHistoryItem,
} from './mappers/subscription.mapper';
import { comparePlans, PLAN_RANK } from './plan-rank.util';
import { PlansService } from './plans.service';
import { PAYMENTS_CONSTANTS } from './payments.constants';
import {
  activeSubscriptionWhere,
  computeJoursRestants,
  upcomingSubscriptionWhere,
} from './subscription-query.util';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
  ) {}

  async getCurrent(authId: string) {
    const now = new Date();

    const [abonnement, upcoming, pending, plans] = await Promise.all([
      this.prisma.abonnement.findFirst({
        where: activeSubscriptionWhere(authId, now),
        orderBy: { date_debut: 'desc' },
        include: { plan: true },
      }),
      this.prisma.abonnement.findFirst({
        where: upcomingSubscriptionWhere(authId, now),
        orderBy: { date_debut: 'asc' },
        include: { plan: true },
      }),
      this.prisma.paiement.findFirst({
        where: {
          auth_id: authId,
          statut: StatutPaiement.EN_ATTENTE,
        },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
      this.plansService.listActivePlans(),
    ]);

    if (!abonnement) {
      return {
        abonnement: null,
        abonnement_programme: upcoming
          ? {
              plan: upcoming.plan.plan,
              date_debut: upcoming.date_debut.toISOString(),
              date_fin: upcoming.date_fin.toISOString(),
            }
          : null,
        paiement_en_attente: pending
          ? {
              ref_transaction: pending.ref_transaction,
              plan: pending.plan.plan,
              montant: Number(pending.montant),
            }
          : null,
        expire_bientot: false,
        plan_superieur_disponible: this.findHigherPlan(plans.data, null),
      };
    }

    const mapped = mapCurrentSubscription(abonnement);
    const jours = mapped.jours_restants;

    return {
      abonnement: mapped,
      abonnement_programme: upcoming
        ? {
            plan: upcoming.plan.plan,
            date_debut: upcoming.date_debut.toISOString(),
            date_fin: upcoming.date_fin.toISOString(),
            jours_avant_debut: Math.max(
              0,
              Math.ceil(
                (upcoming.date_debut.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            ),
          }
        : null,
      paiement_en_attente: pending
        ? {
            ref_transaction: pending.ref_transaction,
            plan: pending.plan.plan,
            montant: Number(pending.montant),
          }
        : null,
      expire_bientot: jours > 0 && jours <= PAYMENTS_CONSTANTS.EXPIRE_BIENTOT_JOURS,
      plan_superieur_disponible: this.findHigherPlan(
        plans.data,
        abonnement.plan.plan,
      ),
    };
  }

  async getUpcoming(authId: string) {
    const upcoming = await this.prisma.abonnement.findMany({
      where: upcomingSubscriptionWhere(authId),
      include: { plan: true },
      orderBy: { date_debut: 'asc' },
    });

    return {
      data: upcoming.map((row) => ({
        id: row.id,
        plan: row.plan.plan,
        date_debut: row.date_debut.toISOString(),
        date_fin: row.date_fin.toISOString(),
        type_renouvellement: row.type_renouvellement,
      })),
    };
  }

  async getSummary(authId: string) {
    const current = await this.getCurrent(authId);

    const [totalSucces, dernierSucces] = await Promise.all([
      this.prisma.paiement.aggregate({
        where: { auth_id: authId, statut: StatutPaiement.SUCCES },
        _sum: { montant: true },
        _count: true,
      }),
      this.prisma.paiement.findFirst({
        where: { auth_id: authId, statut: StatutPaiement.SUCCES },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
    ]);

    return {
      abonnement_actuel: current.abonnement,
      abonnement_programme: current.abonnement_programme,
      paiement_en_attente: current.paiement_en_attente,
      total_paiements_reussis: totalSucces._count,
      montant_total_paye: Number(totalSucces._sum.montant ?? 0),
      dernier_paiement: dernierSucces
        ? {
            ref_transaction: dernierSucces.ref_transaction,
            montant: Number(dernierSucces.montant),
            plan: dernierSucces.plan.plan,
            date: dernierSucces.createdAt.toISOString(),
          }
        : null,
    };
  }

  async comparePlansForUser(authId: string) {
    const { data: plans } = await this.plansService.listActivePlans();
    const current = await this.prisma.abonnement.findFirst({
      where: activeSubscriptionWhere(authId),
      include: { plan: true },
    });

    const currentType = current?.plan.plan ?? null;

    return {
      plan_actuel: currentType,
      data: plans.map((item) => {
        let action: 'ACTUEL' | 'UPGRADE' | 'DOWNGRADE' | 'SOUSCRIRE' = 'SOUSCRIRE';
        if (currentType) {
          if (item.plan === currentType) action = 'ACTUEL';
          else if (PLAN_RANK[item.plan as PlanType] > PLAN_RANK[currentType]) {
            action = 'UPGRADE';
          } else {
            action = 'DOWNGRADE';
          }
        }

        return {
          ...item,
          action,
          recommande:
            action === 'UPGRADE' && item.plan === PlanType.ANNUEL,
        };
      }),
    };
  }

  async buildCheckoutPreview(authId: string, planId: string) {
    const plan = await this.plansService.findActivePlanById(planId);
    if (!plan) {
      throw new BadRequestException('Plan invalide ou inactif.');
    }

    const now = new Date();
    const current = await this.prisma.abonnement.findFirst({
      where: activeSubscriptionWhere(authId, now),
      include: { plan: true },
    });

    let scenario: 'NOUVEAU' | 'PROLONGATION' | 'FILE_ATTENTE' = 'NOUVEAU';
    let date_debut_prevue = now;
    let date_fin_prevue = new Date(now);
    date_fin_prevue.setDate(date_fin_prevue.getDate() + plan.duree_jours);
    let type_renouvellement: 'NOUVEAU' | 'RENOUVELLEMENT' | 'UPGRADE' =
      'NOUVEAU';
    let message_notification = `Activation immédiate du plan ${plan.plan}.`;

    if (current) {
      if (current.plan_id === plan.id) {
        scenario = 'PROLONGATION';
        date_debut_prevue = current.date_debut;
        date_fin_prevue = new Date(current.date_fin);
        date_fin_prevue.setDate(
          date_fin_prevue.getDate() + plan.duree_jours,
        );
        type_renouvellement = 'RENOUVELLEMENT';
        message_notification = `Votre abonnement ${plan.plan} sera prolongé jusqu'au ${date_fin_prevue.toISOString().slice(0, 10)}.`;
      } else {
        scenario = 'FILE_ATTENTE';
        date_debut_prevue = new Date(current.date_fin);
        date_fin_prevue = new Date(date_debut_prevue);
        date_fin_prevue.setDate(
          date_fin_prevue.getDate() + plan.duree_jours,
        );
        type_renouvellement =
          comparePlans(plan.plan, current.plan.plan) === 'UPGRADE'
            ? 'UPGRADE'
            : 'RENOUVELLEMENT';
        message_notification = `Votre plan ${plan.plan} débutera le ${date_debut_prevue.toISOString().slice(0, 10)}, à la fin de votre abonnement ${current.plan.plan} actuel (jusqu'au ${current.date_fin.toISOString().slice(0, 10)}).`;
      }
    }

    const peut_souscrire = true;
    const raison_blocage: string | null = null;

    return {
      plan: {
        id: plan.id,
        plan: plan.plan,
        prix: Number(plan.prix),
        devise: plan.devise,
        duree_jours: plan.duree_jours,
      },
      abonnement_actuel: current
        ? {
            plan: current.plan.plan,
            date_fin: current.date_fin.toISOString(),
            jours_restants: computeJoursRestants(current.date_fin, now),
          }
        : null,
      scenario,
      type_renouvellement_prevu: type_renouvellement,
      date_debut_prevue: date_debut_prevue.toISOString(),
      date_fin_prevue: date_fin_prevue.toISOString(),
      message_notification,
      peut_souscrire,
      raison_blocage,
    };
  }

  async getHistory(authId: string, query: SubscriptionHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PaiementWhereInput = {
      auth_id: authId,
      ...(query.statut ? { statut: query.statut } : {}),
    };

    const [paiements, total] = await Promise.all([
      this.prisma.paiement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          plan: true,
          abonnement: { include: { plan: true } },
        },
      }),
      this.prisma.paiement.count({ where }),
    ]);

    return {
      data: paiements.map(mapHistoryItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private findHigherPlan(
    plans: { plan: PlanType; id: string; prix: number }[],
    current: PlanType | null,
  ): { id: string; plan: PlanType; prix: number } | null {
    if (!current) {
      return plans.find((p) => p.plan === PlanType.MENSUEL) ?? plans[0] ?? null;
    }

    const currentRank = PLAN_RANK[current];
    return (
      plans.find((p) => PLAN_RANK[p.plan as PlanType] > currentRank) ?? null
    );
  }
}
