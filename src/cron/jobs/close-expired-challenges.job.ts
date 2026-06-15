import { Injectable } from '@nestjs/common';
import { StatutDefi, StatutUserDefi } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CloseExpiredChallengesJob {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clôture les défis expirés puis marque les participations EN_COURS en ECHOUE.
   * Les participations COMPLETE ne sont pas modifiées.
   */
  async run(): Promise<{
    defis_termines: number;
    participations_echouees: number;
  }> {
    const now = new Date();

    const [defisTermines, participationsEchouees] =
      await this.prisma.$transaction(async (tx) => {
        const defis = await tx.defi.updateMany({
          where: {
            statut: StatutDefi.ACTIF,
            date_fin: { lt: now },
          },
          data: { statut: StatutDefi.TERMINE },
        });

        const participations = await tx.userDefi.updateMany({
          where: {
            statut: StatutUserDefi.EN_COURS,
            defi: { date_fin: { lt: now } },
          },
          data: { statut: StatutUserDefi.ECHOUE },
        });

        return [defis, participations] as const;
      });

    return {
      defis_termines: defisTermines.count,
      participations_echouees: participationsEchouees.count,
    };
  }
}
