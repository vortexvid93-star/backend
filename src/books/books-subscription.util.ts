import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { activeSubscriptionWhere } from '../payments/subscription-query.util';
import { hasActiveEtablissementMembership } from '../etablissements/etablissement-access.util';

export async function assertActiveSubscription(
  prisma: PrismaService,
  authId: string,
): Promise<void> {
  const abonnement = await prisma.abonnement.findFirst({
    where: activeSubscriptionWhere(authId),
  });

  if (abonnement) return;

  if (await hasActiveEtablissementMembership(prisma, authId)) return;

  throw new ForbiddenException('Abonnement actif requis.');
}
