import { StatutAbonnement } from '../../generated/prisma/enums';

/** Abonnement en cours d'utilisation (période déjà commencée). */
export function activeSubscriptionWhere(authId: string, at: Date = new Date()) {
  return {
    auth_id: authId,
    statut: StatutAbonnement.ACTIF,
    date_debut: { lte: at },
    date_fin: { gt: at },
  };
}

/** Abonnement programmé (démarre après la fin de l'actuel). */
export function upcomingSubscriptionWhere(authId: string, at: Date = new Date()) {
  return {
    auth_id: authId,
    statut: StatutAbonnement.ACTIF,
    date_debut: { gt: at },
  };
}

export function computeJoursRestants(dateFin: Date, at: Date = new Date()): number {
  return Math.max(
    0,
    Math.ceil((dateFin.getTime() - at.getTime()) / (1000 * 60 * 60 * 24)),
  );
}
