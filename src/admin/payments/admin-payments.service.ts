import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminPayment } from './admin-payments.mapper';
import type { AdminPaymentsQueryDto } from './dto/admin-payments-query.dto';

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPayments(query: AdminPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaiementWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.auth_id ? { auth_id: query.auth_id } : {}),
      ...(query.plan_id ? { plan_id: query.plan_id } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.paiement.findMany({
        where,
        include: {
          auth: { select: { email: true } },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paiement.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminPayment),
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
