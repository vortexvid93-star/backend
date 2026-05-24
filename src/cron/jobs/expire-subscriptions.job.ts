import { Injectable } from '@nestjs/common';
import { StatutAbonnement } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpireSubscriptionsJob {
  constructor(private readonly prisma: PrismaService) {}

  /** RG50 — idempotent : ne touche que les ACTIF dont date_fin est passée. */
  async run(): Promise<{ expired: number }> {
    const now = new Date();
    const result = await this.prisma.abonnement.updateMany({
      where: {
        statut: StatutAbonnement.ACTIF,
        date_fin: { lt: now },
      },
      data: { statut: StatutAbonnement.EXPIRE },
    });
    return { expired: result.count };
  }
}
