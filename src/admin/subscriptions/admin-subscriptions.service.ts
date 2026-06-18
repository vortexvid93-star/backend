import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatutAbonnement,
  TypeNotification,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminSubscription } from './admin-subscriptions.mapper';
import type { AdminSubscriptionsQueryDto } from './dto/admin-subscriptions-query.dto';
import type { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubscriptions(query: AdminSubscriptionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AbonnementWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.auth_id ? { auth_id: query.auth_id } : {}),
      ...(query.plan ? { plan: { plan: query.plan } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.abonnement.findMany({
        where,
        include: {
          plan: true,
          auth: { include: { personne: true } },
        },
        orderBy: { date_debut: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.abonnement.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminSubscription),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async cancelSubscription(id: string, dto: CancelSubscriptionDto) {
    const abonnement = await this.prisma.abonnement.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!abonnement) {
      throw new NotFoundException('Abonnement introuvable.');
    }

    if (
      abonnement.statut === StatutAbonnement.ANNULE ||
      abonnement.statut === StatutAbonnement.EXPIRE
    ) {
      throw new BadRequestException(
        'Cet abonnement est déjà annulé ou expiré.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.abonnement.update({
        where: { id },
        data: { statut: StatutAbonnement.ANNULE },
      });

      await tx.notification.create({
        data: {
          auth_id: abonnement.auth_id,
          type: TypeNotification.ABONNEMENT,
          titre: 'Abonnement annulé',
          contenu: `Votre abonnement ${abonnement.plan.plan} a été annulé par un administrateur. Raison : ${dto.raison.trim()}. L'accès aux contenus internes est révoqué immédiatement.`,
        },
      });

      return row;
    });

    return { id: updated.id, statut: updated.statut };
  }

  async suspendSubscription(id: string) {
    const abonnement = await this.prisma.abonnement.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!abonnement) {
      throw new NotFoundException('Abonnement introuvable.');
    }

    if (abonnement.statut !== StatutAbonnement.ACTIF) {
      throw new BadRequestException(
        'Seul un abonnement actif peut être suspendu.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.abonnement.update({
        where: { id },
        data: { statut: StatutAbonnement.SUSPENDU },
      });

      await tx.notification.create({
        data: {
          auth_id: abonnement.auth_id,
          type: TypeNotification.ABONNEMENT,
          titre: 'Abonnement suspendu',
          contenu: `Votre abonnement ${abonnement.plan.plan} a été suspendu par un administrateur. L'accès aux contenus internes est temporairement révoqué.`,
        },
      });

      return row;
    });

    return { id: updated.id, statut: updated.statut };
  }

  async activateSubscription(id: string) {
    const abonnement = await this.prisma.abonnement.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!abonnement) {
      throw new NotFoundException('Abonnement introuvable.');
    }

    if (abonnement.statut === StatutAbonnement.ANNULE) {
      throw new BadRequestException(
        'Un abonnement annulé ne peut pas être réactivé.',
      );
    }

    if (abonnement.statut === StatutAbonnement.ACTIF) {
      throw new BadRequestException('Cet abonnement est déjà actif.');
    }

    const now = new Date();
    let date_fin = abonnement.date_fin;
    if (
      abonnement.statut === StatutAbonnement.EXPIRE ||
      abonnement.date_fin < now
    ) {
      date_fin = new Date(now);
      date_fin.setDate(date_fin.getDate() + abonnement.plan.duree_jours);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.abonnement.update({
        where: { id },
        data: {
          statut: StatutAbonnement.ACTIF,
          date_fin,
        },
      });

      await tx.notification.create({
        data: {
          auth_id: abonnement.auth_id,
          type: TypeNotification.ABONNEMENT,
          titre: 'Abonnement réactivé',
          contenu: `Votre abonnement ${abonnement.plan.plan} est à nouveau actif jusqu'au ${date_fin.toISOString().slice(0, 10)}.`,
        },
      });

      return row;
    });

    return { id: updated.id, statut: updated.statut };
  }
}
