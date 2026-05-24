import {
  StatutAbonnement,
  StatutPaiement,
  TypeNotification,
  TypeRenouvellement,
} from '../../generated/prisma/enums';
import type { PlanAbonnement } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { comparePlans } from './plan-rank.util';
import { activeSubscriptionWhere } from './subscription-query.util';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

interface ActivateContext {
  paiement: {
    id: string;
    auth_id: string;
    plan_id: string;
    plan: PlanAbonnement;
    statut: StatutPaiement;
  };
  operateur: string | null;
  numero_telephone: string | null;
}

export async function applySuccessfulPayment(
  tx: Tx,
  ctx: ActivateContext,
): Promise<'extended' | 'created' | 'queued'> {
  const { paiement } = ctx;
  if (paiement.statut !== StatutPaiement.EN_ATTENTE) {
    return 'extended';
  }

  const now = new Date();

  await tx.paiement.update({
    where: { id: paiement.id },
    data: {
      statut: StatutPaiement.SUCCES,
      operateur: ctx.operateur,
      numero_telephone: ctx.numero_telephone,
    },
  });

  const current = await tx.abonnement.findFirst({
    where: activeSubscriptionWhere(paiement.auth_id, now),
    include: { plan: true },
    orderBy: { date_debut: 'desc' },
  });

  if (current && current.plan_id === paiement.plan_id) {
    const newFin = new Date(current.date_fin);
    newFin.setDate(newFin.getDate() + paiement.plan.duree_jours);

    await tx.abonnement.update({
      where: { id: current.id },
      data: {
        date_fin: newFin,
        type_renouvellement: TypeRenouvellement.RENOUVELLEMENT,
      },
    });

    await tx.notification.create({
      data: {
        auth_id: paiement.auth_id,
        type: TypeNotification.ABONNEMENT,
        titre: 'Abonnement prolongé',
        contenu: `Votre abonnement ${paiement.plan.plan} a été prolongé jusqu'au ${newFin.toISOString().slice(0, 10)}.`,
      },
    });

    return 'extended';
  }

  let date_debut = now;
  let type_renouvellement: TypeRenouvellement = TypeRenouvellement.NOUVEAU;

  if (current) {
    date_debut = new Date(current.date_fin);
    type_renouvellement =
      comparePlans(paiement.plan.plan, current.plan.plan) === 'UPGRADE'
        ? TypeRenouvellement.UPGRADE
        : TypeRenouvellement.RENOUVELLEMENT;
  }

  const date_fin = new Date(date_debut);
  date_fin.setDate(date_fin.getDate() + paiement.plan.duree_jours);

  await tx.abonnement.create({
    data: {
      paiement_id: paiement.id,
      auth_id: paiement.auth_id,
      plan_id: paiement.plan_id,
      date_debut,
      date_fin,
      statut: StatutAbonnement.ACTIF,
      type_renouvellement,
    },
  });

  if (current) {
    await tx.notification.create({
      data: {
        auth_id: paiement.auth_id,
        type: TypeNotification.ABONNEMENT,
        titre: 'Nouvel abonnement programmé',
        contenu: `Votre plan ${paiement.plan.plan} sera actif à partir du ${date_debut.toISOString().slice(0, 10)} (fin de votre abonnement ${current.plan.plan} actuel). Il restera actif jusqu'au ${date_fin.toISOString().slice(0, 10)}.`,
      },
    });
    return 'queued';
  }

  await tx.notification.create({
    data: {
      auth_id: paiement.auth_id,
      type: TypeNotification.ABONNEMENT,
      titre: 'Abonnement activé',
      contenu: `Votre abonnement ${paiement.plan.plan} est actif jusqu'au ${date_fin.toISOString().slice(0, 10)}.`,
    },
  });

  return 'created';
}
