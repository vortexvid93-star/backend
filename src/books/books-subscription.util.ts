import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { activeSubscriptionWhere } from '../payments/subscription-query.util';

export async function assertActiveSubscription(
  prisma: PrismaService,
  authId: string,
): Promise<void> {
  const abonnement = await prisma.abonnement.findFirst({
    where: activeSubscriptionWhere(authId),
  });

  if (!abonnement) {
    throw new ForbiddenException('Abonnement actif requis.');
  }
}
