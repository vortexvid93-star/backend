import { Injectable, Logger } from '@nestjs/common';
import { AuthStatut, StatutAbonnement } from '../../../generated/prisma/enums';
import { RecommendationsEngineService } from '../../discovery/recommendations-engine.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GenerateRecommendationsJob {
  private readonly logger = new Logger(GenerateRecommendationsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationsEngine: RecommendationsEngineService,
  ) {}

  /**
   * UPSERT recommandations pour chaque USER ACTIF avec abonnement en cours.
   * Exclut les livres déjà lus (toute progression) via le moteur existant.
   */
  async run(): Promise<{
    utilisateurs_traites: number;
    recommandations_upserted: number;
    erreurs: number;
  }> {
    const now = new Date();

    const abonnements = await this.prisma.abonnement.findMany({
      where: {
        statut: StatutAbonnement.ACTIF,
        date_debut: { lte: now },
        date_fin: { gt: now },
        auth: { statut: AuthStatut.ACTIF },
      },
      select: { auth_id: true },
      distinct: ['auth_id'],
    });

    let recommandationsUpserted = 0;
    let erreurs = 0;

    for (const { auth_id } of abonnements) {
      try {
        const { upserted } =
          await this.recommendationsEngine.refreshForUser(auth_id);
        recommandationsUpserted += upserted;
      } catch (err) {
        erreurs += 1;
        this.logger.warn(
          `refreshForUser échoué pour ${auth_id}: ${String(err)}`,
        );
      }
    }

    return {
      utilisateurs_traites: abonnements.length,
      recommandations_upserted: recommandationsUpserted,
      erreurs,
    };
  }
}
