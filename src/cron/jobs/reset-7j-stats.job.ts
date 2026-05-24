import { Injectable } from '@nestjs/common';
import { TypeAccesToken } from '../../../generated/prisma/enums';
import { getTokenLectureRetentionCutoff } from '../../common/token-lecture-retention.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Reset7jStatsJob {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recalcule nb_lectures_7j (fenêtre glissante 7 jours) à partir des accès lecture.
   * Aligné avec la rétention des `token_lecture` (7 jours, voir cleanup-token-lecture).
   */
  async run(): Promise<{ livres_mis_a_jour: number; total_lectures_7j: number }> {
    const since = getTokenLectureRetentionCutoff();

    const grouped = await this.prisma.tokenLecture.groupBy({
      by: ['livre_id'],
      where: {
        type_acces: TypeAccesToken.LECTURE,
        createdAt: { gte: since },
      },
      _count: { livre_id: true },
    });

    const countByLivre = new Map(
      grouped.map((row) => [row.livre_id, row._count.livre_id]),
    );

    const stats = await this.prisma.statistiqueLivre.findMany({
      select: { livre_id: true },
    });

    let totalLectures7j = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const stat of stats) {
        const nb = countByLivre.get(stat.livre_id) ?? 0;
        totalLectures7j += nb;
        await tx.statistiqueLivre.update({
          where: { livre_id: stat.livre_id },
          data: { nb_lectures_7j: nb },
        });
      }

      for (const row of grouped) {
        if (stats.some((s) => s.livre_id === row.livre_id)) continue;
        totalLectures7j += row._count.livre_id;
        await tx.statistiqueLivre.upsert({
          where: { livre_id: row.livre_id },
          create: {
            livre_id: row.livre_id,
            nb_lectures_7j: row._count.livre_id,
          },
          update: { nb_lectures_7j: row._count.livre_id },
        });
      }
    });

    return {
      livres_mis_a_jour: stats.length + grouped.filter(
        (g) => !stats.some((s) => s.livre_id === g.livre_id),
      ).length,
      total_lectures_7j: totalLectures7j,
    };
  }
}
