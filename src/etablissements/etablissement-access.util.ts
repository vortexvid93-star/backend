import { StatutEtablissement } from '../../generated/prisma/enums';
import type { Etablissement } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Accès lecture équivalent à un abonnement individuel pour les membres actifs
 * d'un pack établissement (place non retirée, pack ACTIF et non expiré).
 */
export async function hasActiveEtablissementMembership(
  prisma: PrismaService,
  authId: string,
  at: Date = new Date(),
): Promise<boolean> {
  const membre = await prisma.etablissementMembre.findFirst({
    where: {
      auth_id: authId,
      retire_le: null,
      etablissement: {
        statut: StatutEtablissement.ACTIF,
        date_fin: { gt: at },
      },
    },
  });

  return membre != null;
}

/**
 * Récupère le membership établissement actif de l'utilisateur, établissement
 * inclus (pour affichage — nom de l'école, date de fin, etc.). Contrairement
 * à `hasActiveEtablissementMembership`, ne filtre pas côté requête sur le
 * statut/date_fin de l'établissement pour pouvoir distinguer un pack
 * expiré/suspendu d'une absence totale de membership.
 */
export async function findActiveEtablissementMembre(
  prisma: PrismaService,
  authId: string,
): Promise<{ etablissement: Etablissement } | null> {
  const membre = await prisma.etablissementMembre.findFirst({
    where: { auth_id: authId, retire_le: null },
    include: { etablissement: true },
    orderBy: { rejoint_le: 'desc' },
  });

  return membre;
}
