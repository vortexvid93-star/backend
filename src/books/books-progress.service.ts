import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatutProgression } from '../../generated/prisma/enums';
import { ChallengesEngineService } from '../challenges/challenges-engine.service';
import { StreakService } from '../challenges/streak.service';
import { RecommendationsEngineService } from '../discovery/recommendations-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { BOOKS_CONSTANTS } from './books.constants';
import { mapProgression, mapProgressionUpdate } from './books.mapper';
import { assertActiveSubscription } from './books-subscription.util';
import type { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class BooksProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challengesEngine: ChallengesEngineService,
    private readonly streakService: StreakService,
    private readonly recommendationsEngine: RecommendationsEngineService,
  ) {}

  async getProgress(authId: string, livreId: string) {
    const progression = await this.prisma.progressionLecture.findUnique({
      where: { auth_id_livre_id: { auth_id: authId, livre_id: livreId } },
    });

    if (!progression) {
      throw new NotFoundException(
        'Aucune progression — ouvrez le livre via /books/:id/access.',
      );
    }

    return mapProgression(progression);
  }

  async updateProgress(
    authId: string,
    livreId: string,
    dto: UpdateProgressDto,
  ) {
    await assertActiveSubscription(this.prisma, authId);

    const progression = await this.prisma.progressionLecture.findUnique({
      where: { auth_id_livre_id: { auth_id: authId, livre_id: livreId } },
      include: { livre: true },
    });

    if (!progression) {
      throw new NotFoundException(
        'Progression absente — ouvrez le livre via /books/:id/access.',
      );
    }

    if (dto.page_actuelle < progression.page_actuelle) {
      throw new BadRequestException(
        'page_actuelle ne peut pas être inférieure à la page courante.',
      );
    }

    // Utilise le nombre de pages du livre ; si absent, accepte l'indication du client (lecteur PDF)
    const nombrePages =
      progression.livre.nombre_pages ?? dto.nombre_pages_hint ?? null;
    const pageDemandee = dto.page_actuelle;
    const { pageCible, ajustee } = this.validatePageActuelle(
      pageDemandee,
      nombrePages,
    );

    this.assertReadingPace(
      pageCible - progression.page_actuelle,
      dto.duree_lecture_min,
    );

    const pourcentage = this.computePourcentage(pageCible, nombrePages);
    const isComplete =
      nombrePages != null && nombrePages > 0 && pageCible >= nombrePages;
    const wasNotTermine = progression.statut !== StatutProgression.TERMINE;

    const pendingPushes: Awaited<
      ReturnType<ChallengesEngineService['onBookCompleted']>
    > = [];

    const updated = await this.prisma.$transaction(
      async (tx) => {
        const row = await tx.progressionLecture.update({
          where: { id: progression.id },
          data: {
            page_actuelle: pageCible,
            pourcentage,
            ...(dto.duree_lecture_min !== undefined
              ? { duree_lecture_min: { increment: dto.duree_lecture_min } }
              : {}),
            derniere_maj: new Date(),
            ...(isComplete
              ? {
                  statut: StatutProgression.TERMINE,
                  date_fin: new Date(),
                }
              : {}),
          },
        });

        if (isComplete && wasNotTermine) {
          await tx.statistiqueLivre.upsert({
            where: { livre_id: livreId },
            create: { livre_id: livreId, nb_terminees: 1 },
            update: { nb_terminees: { increment: 1 } },
          });

          pendingPushes.push(
            ...(await this.challengesEngine.onBookCompleted(tx, authId, livreId)),
          );
          void this.recommendationsEngine.refreshAfterBookCompleted(
            authId,
            livreId,
          );
        }

        if (dto.duree_lecture_min !== undefined && dto.duree_lecture_min > 0) {
          pendingPushes.push(
            ...(await this.challengesEngine.onReadingDurationAdded(
              tx,
              authId,
              dto.duree_lecture_min,
            )),
          );
        }

        return row;
      },
      { timeout: 15_000 },
    );

    this.challengesEngine.dispatchPushes(pendingPushes);

    // Mise à jour streak + objectif quotidien (fire-and-forget, hors transaction)
    if (dto.duree_lecture_min && dto.duree_lecture_min > 0) {
      void this.streakService.updateAfterReading(authId, dto.duree_lecture_min);
    }

    const base = mapProgressionUpdate(updated);
    if (!ajustee) return base;

    const marge = BOOKS_CONSTANTS.PROGRESS_PAGE_MARGIN;
    return {
      ...base,
      page_demandee: pageDemandee,
      nombre_pages_livre: nombrePages,
      message: `page_actuelle incohérente avec le livre (${nombrePages} page(s)) : enregistrée à ${pageCible} (marge autorisée : +${marge} page(s) au-delà de la fin).`,
    };
  }

  /**
   * Rejette les sauts manifestement incohérents ; tolère jusqu'à nombre_pages + marge.
   */
  private validatePageActuelle(
    pageDemandee: number,
    nombrePages: number | null,
  ): { pageCible: number; ajustee: boolean } {
    if (nombrePages == null || nombrePages <= 0) {
      return { pageCible: pageDemandee, ajustee: false };
    }

    const marge = BOOKS_CONSTANTS.PROGRESS_PAGE_MARGIN;
    const maxAccepte = nombrePages + marge;

    if (pageDemandee > maxAccepte) {
      throw new BadRequestException(
        `page_actuelle incohérente : ce livre compte ${nombrePages} page(s). ` +
          `Vous avez indiqué la page ${pageDemandee} ; le maximum accepté est ${maxAccepte} ` +
          `(dernière page + marge de ${marge} page(s)).`,
      );
    }

    if (pageDemandee > nombrePages) {
      return { pageCible: nombrePages, ajustee: true };
    }

    return { pageCible: pageDemandee, ajustee: false };
  }

  private computePourcentage(
    pageActuelle: number,
    nombrePages: number | null,
  ): number {
    if (!nombrePages || nombrePages <= 0) return 0;
    const raw = Math.round((pageActuelle / nombrePages) * 10000) / 100;
    return Math.min(100, raw);
  }

  private assertReadingPace(deltaPages: number, dureeMin?: number): void {
    if (dureeMin !== undefined && dureeMin > 0) {
      const pagesPerMinute = deltaPages / dureeMin;
      if (pagesPerMinute > BOOKS_CONSTANTS.ANTI_CHEAT_MAX_PAGES_PER_MINUTE) {
        throw new HttpException(
          'Vitesse de lecture anormale.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return;
    }

    if (deltaPages > BOOKS_CONSTANTS.ANTI_CHEAT_MAX_PAGES_WITHOUT_DURATION) {
      throw new HttpException(
        'Vitesse de lecture anormale.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
