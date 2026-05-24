import { Injectable } from '@nestjs/common';
import { TypeAccesToken } from '../../../generated/prisma/enums';
import { getTokenLectureRetentionCutoff } from '../../common/token-lecture-retention.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CleanupTokenLectureJob {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * - Supprime tout jeton de plus de 7 jours (`createdAt`) — fenêtre stats + reset-7j-stats.
   * - Nettoie les jetons TELECHARGEMENT récents expirés/non utilisés (>1h) : hors stats 7j.
   * Les jetons LECTURE des 7 derniers jours sont conservés (même expirés/utilisés).
   */
  async run(): Promise<{
    deleted_beyond_retention: number;
    deleted_recent_download_unused: number;
  }> {
    const retentionCutoff = getTokenLectureRetentionCutoff();
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const [beyondRetention, recentDownload] = await Promise.all([
      this.prisma.tokenLecture.deleteMany({
        where: { createdAt: { lt: retentionCutoff } },
      }),
      this.prisma.tokenLecture.deleteMany({
        where: {
          type_acces: TypeAccesToken.TELECHARGEMENT,
          used: false,
          expires_at: { lt: oneHourAgo },
          createdAt: { gte: retentionCutoff },
        },
      }),
    ]);

    return {
      deleted_beyond_retention: beyondRetention.count,
      deleted_recent_download_unused: recentDownload.count,
    };
  }
}
