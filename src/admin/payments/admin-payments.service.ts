import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminEtablissementPayment, mapAdminPayment } from './admin-payments.mapper';
import type { AdminPaymentsQueryDto } from './dto/admin-payments-query.dto';

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fusionne les paiements individuels (`Paiement`) et les paiements de pack
   * établissement (`PaiementEtablissement`) dans une seule liste triée par
   * date — ces derniers étaient invisibles de l'admin Paiements/exports
   * jusqu'ici. `auth_id`/`plan_id` n'ont pas de sens pour un paiement
   * établissement (pas d'utilisateur individuel, offre différente d'un
   * `PlanAbonnement`) : dans ce cas on ne récupère que les paiements
   * individuels.
   *
   * Pagination : chaque source est déjà triée par `createdAt desc`, donc les
   * `skip + limit` premières lignes de la liste fusionnée ne peuvent venir
   * que des `skip + limit` premières lignes de chacune des deux sources
   * (fusion des K meilleurs éléments de listes triées) — on borne donc la
   * requête de chaque source à cette fenêtre plutôt que de tout charger.
   */
  async listPayments(query: AdminPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const window = skip + limit;

    const dateFilter: Prisma.DateTimeFilter | undefined =
      query.dateDebut || query.dateFin
        ? {
            ...(query.dateDebut ? { gte: new Date(query.dateDebut) } : {}),
            ...(query.dateFin
              ? { lte: new Date(`${query.dateFin}T23:59:59.999Z`) }
              : {}),
          }
        : undefined;

    const where: Prisma.PaiementWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.auth_id ? { auth_id: query.auth_id } : {}),
      ...(query.plan_id ? { plan_id: query.plan_id } : {}),
      ...(query.operateur
        ? { operateur: { contains: query.operateur, mode: 'insensitive' } }
        : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    const includeEtablissement = !query.auth_id && !query.plan_id;
    const whereEtab: Prisma.PaiementEtablissementWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.operateur
        ? { operateur: { contains: query.operateur, mode: 'insensitive' } }
        : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    const [individuelRows, individuelTotal, etabRows, etabTotal] =
      await Promise.all([
        this.prisma.paiement.findMany({
          where,
          include: {
            auth: { select: { email: true } },
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
          take: window,
        }),
        this.prisma.paiement.count({ where }),
        includeEtablissement
          ? this.prisma.paiementEtablissement.findMany({
              where: whereEtab,
              include: { offre: true },
              orderBy: { createdAt: 'desc' },
              take: window,
            })
          : Promise.resolve([]),
        includeEtablissement
          ? this.prisma.paiementEtablissement.count({ where: whereEtab })
          : Promise.resolve(0),
      ]);

    const merged = [
      ...individuelRows.map(mapAdminPayment),
      ...etabRows.map(mapAdminEtablissementPayment),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return {
      data: merged.slice(skip, skip + limit),
      meta: buildPaginationMeta(page, limit, individuelTotal + etabTotal),
    };
  }
}
