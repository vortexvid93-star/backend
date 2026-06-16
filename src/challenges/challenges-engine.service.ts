import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  StatutDefi,
  StatutUserDefi,
  TypeDefi,
  TypeNotification,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { isDefiCurrentlyActive } from './challenges-progress.util';

type DefiRow = {
  id: string;
  titre: string;
  type: TypeDefi;
  objectif_valeur: number;
  points_bonus: number;
  date_debut: Date;
  date_fin: Date;
  statut: StatutDefi;
  badge_id: string;
  categorie_id: string | null;
  livre_id: string | null;
  auteur_id: string | null;
  badge: { id: string; nom: string; points?: number };
};

type BookContext = {
  livreId: string;
  categorieIds: string[];
  auteurIds: string[];
};

@Injectable()
export class ChallengesEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async syncExpiredParticipations(authId: string): Promise<number> {
    const result = await this.prisma.userDefi.updateMany({
      where: {
        auth_id: authId,
        statut: StatutUserDefi.EN_COURS,
        defi: { date_fin: { lt: new Date() } },
      },
      data: { statut: StatutUserDefi.ECHOUE },
    });
    return result.count;
  }

  async loadBookContext(
    tx: Prisma.TransactionClient,
    livreId: string,
  ): Promise<BookContext | null> {
    const livre = await tx.livre.findUnique({
      where: { id: livreId },
      select: {
        id: true,
        appartenir: { select: { categorie_id: true } },
        livre_auteurs: { select: { auteur_id: true } },
      },
    });
    if (!livre) return null;
    return {
      livreId: livre.id,
      categorieIds: livre.appartenir.map((a) => a.categorie_id),
      auteurIds: livre.livre_auteurs.map((a) => a.auteur_id),
    };
  }

  async onBookCompleted(
    tx: Prisma.TransactionClient,
    authId: string,
    livreId: string,
  ): Promise<void> {
    const book = await this.loadBookContext(tx, livreId);
    if (!book) return;

    const participations = await this.findActiveParticipations(tx, authId);
    const now = new Date();

    for (const row of participations) {
      const delta = this.computeBookCompletionDelta(row.defi, book);
      if (delta <= 0) continue;
      await this.applyProgressDelta(tx, authId, row, delta, now);
    }
  }

  async onReadingDurationAdded(
    tx: Prisma.TransactionClient,
    authId: string,
    addedMinutes: number,
  ): Promise<void> {
    if (addedMinutes <= 0) return;

    const participations = await tx.userDefi.findMany({
      where: {
        auth_id: authId,
        statut: StatutUserDefi.EN_COURS,
        defi: {
          statut: StatutDefi.ACTIF,
          type: TypeDefi.DUREE_LECTURE,
          date_debut: { lte: new Date() },
          date_fin: { gt: new Date() },
        },
      },
      include: { defi: { include: { badge: true } } },
    });

    const now = new Date();
    for (const row of participations) {
      await this.applyProgressDelta(tx, authId, row, addedMinutes, now);
    }
  }

  private computeBookCompletionDelta(
    defi: Pick<DefiRow, 'type' | 'livre_id' | 'categorie_id' | 'auteur_id'>,
    book: BookContext,
  ): number {
    switch (defi.type) {
      case TypeDefi.NB_LIVRES:
        return 1;
      case TypeDefi.LIVRE_SPECIFIQUE:
        return defi.livre_id === book.livreId ? 1 : 0;
      case TypeDefi.CATEGORIE:
        return defi.categorie_id &&
          book.categorieIds.includes(defi.categorie_id)
          ? 1
          : 0;
      case TypeDefi.AUTEUR:
        return defi.auteur_id && book.auteurIds.includes(defi.auteur_id)
          ? 1
          : 0;
      default:
        return 0;
    }
  }

  private async findActiveParticipations(
    tx: Prisma.TransactionClient,
    authId: string,
  ) {
    const now = new Date();
    return tx.userDefi.findMany({
      where: {
        auth_id: authId,
        statut: StatutUserDefi.EN_COURS,
        defi: {
          statut: StatutDefi.ACTIF,
          type: {
            in: [
              TypeDefi.NB_LIVRES,
              TypeDefi.LIVRE_SPECIFIQUE,
              TypeDefi.CATEGORIE,
              TypeDefi.AUTEUR,
            ],
          },
          date_debut: { lte: now },
          date_fin: { gt: now },
        },
      },
      include: { defi: { include: { badge: true } } },
    });
  }

  private async applyProgressDelta(
    tx: Prisma.TransactionClient,
    authId: string,
    row: { defi_id: string; progression: number; defi: DefiRow },
    delta: number,
    now: Date,
  ): Promise<void> {
    const defi = row.defi;
    if (!isDefiCurrentlyActive(defi.date_debut, defi.date_fin, now)) return;
    if (delta <= 0) return;
    if (row.progression >= defi.objectif_valeur) return;

    const nextProgression = Math.min(
      row.progression + delta,
      defi.objectif_valeur,
    );
    const isComplete = nextProgression >= defi.objectif_valeur;

    await tx.userDefi.update({
      where: {
        auth_id_defi_id: { auth_id: authId, defi_id: row.defi_id },
      },
      data: {
        progression: nextProgression,
        ...(isComplete
          ? {
              statut: StatutUserDefi.COMPLETE,
              date_completion: now,
            }
          : {}),
      },
    });

    if (isComplete) {
      await this.awardOnChallengeComplete(tx, authId, defi);
    }
  }

  /** Attribue récompenses après complétion (appelé aussi à l'inscription si déjà accompli). */
  async awardOnChallengeComplete(
    tx: Prisma.TransactionClient,
    authId: string,
    defi: DefiRow,
  ): Promise<void> {
    const auth = await tx.auth.findUnique({
      where: { id: authId },
      select: { personne_id: true },
    });
    if (!auth) return;

    const badge = await tx.badge.findUnique({
      where: { id: defi.badge_id },
      select: { points: true, nom: true },
    });

    const xpGain = defi.points_bonus + (badge?.points ?? 0);
    if (xpGain > 0) {
      await tx.personne.update({
        where: { id: auth.personne_id },
        data: { points: { increment: xpGain } },
      });
    }

    await tx.notification.create({
      data: {
        auth_id: authId,
        titre: 'Félicitations ! Défi relevé',
        contenu: `Bravo ! Vous avez terminé le défi « ${defi.titre} » et gagné ${xpGain} point(s). Continuez ainsi !`,
        type: TypeNotification.DEFI,
      },
    });

    void this.pushService.sendToUser(authId, {
      title: 'Félicitations ! Défi relevé',
      body: `Bravo ! Vous avez terminé le défi « ${defi.titre} ».`,
      data: { type: TypeNotification.DEFI },
    });

    const existingBadge = await tx.userBadge.findUnique({
      where: {
        auth_id_badge_id: { auth_id: authId, badge_id: defi.badge_id },
      },
    });

    if (!existingBadge) {
      await tx.userBadge.create({
        data: { auth_id: authId, badge_id: defi.badge_id },
      });
      await tx.notification.create({
        data: {
          auth_id: authId,
          titre: 'Nouveau badge !',
          contenu: `Badge « ${defi.badge.nom} » débloqué.`,
          type: TypeNotification.BADGE,
        },
      });

      void this.pushService.sendToUser(authId, {
        title: 'Nouveau badge !',
        body: `Badge « ${defi.badge.nom} » débloqué.`,
        data: { type: TypeNotification.BADGE },
      });
    }
  }
}
