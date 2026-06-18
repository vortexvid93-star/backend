import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  StatutDefi,
  StatutUserDefi,
  TypeDefi,
  TypeNotification,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PushService, type PushPayload } from '../push/push.service';
import { isDefiCurrentlyActive } from './challenges-progress.util';

export type ChallengePendingPush = {
  authId: string;
  payload: PushPayload;
};

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

  /** Envoie les push après commit transaction (évite notif sans persistance DB). */
  dispatchPushes(pushes: ChallengePendingPush[]): void {
    for (const { authId, payload } of pushes) {
      void this.pushService.sendToUser(authId, payload);
    }
  }

  async onBookCompleted(
    tx: Prisma.TransactionClient,
    authId: string,
    livreId: string,
  ): Promise<ChallengePendingPush[]> {
    const book = await this.loadBookContext(tx, livreId);
    if (!book) return [];

    const participations = await this.findActiveParticipations(tx, authId);
    const now = new Date();
    const pushes: ChallengePendingPush[] = [];

    for (const row of participations) {
      const delta = this.computeBookCompletionDelta(row.defi, book);
      if (delta <= 0) continue;
      pushes.push(
        ...(await this.applyProgressDelta(tx, authId, row, delta, now)),
      );
    }

    return pushes;
  }

  async onReadingDurationAdded(
    tx: Prisma.TransactionClient,
    authId: string,
    addedMinutes: number,
  ): Promise<ChallengePendingPush[]> {
    if (addedMinutes <= 0) return [];

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
    const pushes: ChallengePendingPush[] = [];
    for (const row of participations) {
      pushes.push(
        ...(await this.applyProgressDelta(tx, authId, row, addedMinutes, now)),
      );
    }

    return pushes;
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
  ): Promise<ChallengePendingPush[]> {
    const defi = row.defi;
    if (!isDefiCurrentlyActive(defi.date_debut, defi.date_fin, now)) return [];
    if (delta <= 0) return [];
    if (row.progression >= defi.objectif_valeur) return [];

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
      return this.awardOnChallengeComplete(tx, authId, defi);
    }

    return [];
  }

  /** Attribue récompenses après complétion (appelé aussi à l'inscription si déjà accompli). */
  async awardOnChallengeComplete(
    tx: Prisma.TransactionClient,
    authId: string,
    defi: DefiRow,
  ): Promise<ChallengePendingPush[]> {
    const auth = await tx.auth.findUnique({
      where: { id: authId },
      select: { personne_id: true },
    });
    if (!auth) return [];

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

    const pushes: ChallengePendingPush[] = [
      {
        authId,
        payload: {
          title: 'Félicitations ! Défi relevé',
          body: `Bravo ! Vous avez terminé le défi « ${defi.titre} ».`,
          data: { type: TypeNotification.DEFI },
        },
      },
    ];

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

      pushes.push({
        authId,
        payload: {
          title: 'Nouveau badge !',
          body: `Badge « ${defi.badge.nom} » débloqué.`,
          data: { type: TypeNotification.BADGE },
        },
      });
    }

    return pushes;
  }
}
