import type { Livre } from '../../generated/prisma/client';
import {
  StatutLivre,
  TypeAccesToken,
  TypeLivre,
} from '../../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { activeSubscriptionWhere } from '../payments/subscription-query.util';

export type AccesRessourceType = 'CLOUDINARY' | 'EXTERNE' | 'INDISPONIBLE';

export type AccessBlockCode =
  | 'ABONNEMENT_REQUIS'
  | 'LIVRE_INDISPONIBLE'
  | 'RESSOURCE_MANQUANTE'
  | 'NON_TELECHARGEABLE'
  | 'PROGRESSION_REQUISE';

export interface AccessEvaluation {
  peut_lire: boolean;
  peut_telecharger: boolean;
  eligible: boolean;
  codes: AccessBlockCode[];
  raison_blocage: string | null;
  ressource_disponible: boolean;
  acces_type: AccesRessourceType;
  type_livre: TypeLivre;
  is_downloadable: boolean;
}

export const BLOCK_MESSAGES: Record<AccessBlockCode, string> = {
  ABONNEMENT_REQUIS: 'Un abonnement actif est requis pour accéder à ce livre.',
  LIVRE_INDISPONIBLE: 'Ce livre n’est pas disponible.',
  RESSOURCE_MANQUANTE: 'La ressource numérique de ce livre est indisponible.',
  NON_TELECHARGEABLE: 'Ce livre n’est pas téléchargeable.',
  PROGRESSION_REQUISE: 'Ouvrez le livre en lecture avant de le télécharger.',
};

export function resolveAccesType(livre: Livre): AccesRessourceType {
  if (livre.type_livre === TypeLivre.EXTERNE) {
    return livre.url_externe_livre ? 'EXTERNE' : 'INDISPONIBLE';
  }
  return livre.cloudinary_public_id ? 'CLOUDINARY' : 'INDISPONIBLE';
}

export function isRessourceDisponible(livre: Livre): boolean {
  return resolveAccesType(livre) !== 'INDISPONIBLE';
}

export async function evaluateBookAccess(
  prisma: PrismaService,
  authId: string,
  livre: Livre,
  typeAcces?: TypeAccesToken,
): Promise<AccessEvaluation> {
  const codes: AccessBlockCode[] = [];
  const acces_type = resolveAccesType(livre);
  const ressource_disponible = acces_type !== 'INDISPONIBLE';

  if (livre.statut !== StatutLivre.PUBLIE) {
    codes.push('LIVRE_INDISPONIBLE');
  }

  if (!ressource_disponible) {
    codes.push('RESSOURCE_MANQUANTE');
  }

  const abonnement = await prisma.abonnement.findFirst({
    where: activeSubscriptionWhere(authId),
  });

  if (!abonnement) {
    codes.push('ABONNEMENT_REQUIS');
  }

  const progression = await prisma.progressionLecture.findUnique({
    where: { auth_id_livre_id: { auth_id: authId, livre_id: livre.id } },
  });

  const peut_lire =
    livre.statut === StatutLivre.PUBLIE &&
    ressource_disponible &&
    Boolean(abonnement);

  if (!livre.is_downloadable) {
    codes.push('NON_TELECHARGEABLE');
  }
  if (livre.is_downloadable && !progression) {
    codes.push('PROGRESSION_REQUISE');
  }

  const peut_telecharger =
    peut_lire && livre.is_downloadable && Boolean(progression);

  const readBlockers: AccessBlockCode[] = [
    'LIVRE_INDISPONIBLE',
    'RESSOURCE_MANQUANTE',
    'ABONNEMENT_REQUIS',
  ];

  const downloadBlockers: AccessBlockCode[] = [
    ...readBlockers,
    'NON_TELECHARGEABLE',
    'PROGRESSION_REQUISE',
  ];

  const relevantBlockers = typeAcces
    ? typeAcces === TypeAccesToken.TELECHARGEMENT
      ? downloadBlockers
      : readBlockers
    : readBlockers;

  const blockingCodes = codes.filter((c) => relevantBlockers.includes(c));

  const eligible =
    typeAcces === TypeAccesToken.TELECHARGEMENT
      ? peut_telecharger
      : typeAcces === TypeAccesToken.LECTURE
        ? peut_lire
        : peut_lire;

  const raison_blocage =
    blockingCodes.length > 0 ? BLOCK_MESSAGES[blockingCodes[0]] : null;

  return {
    peut_lire,
    peut_telecharger,
    eligible,
    codes: [...new Set(codes)],
    raison_blocage,
    ressource_disponible,
    acces_type,
    type_livre: livre.type_livre,
    is_downloadable: livre.is_downloadable,
  };
}
