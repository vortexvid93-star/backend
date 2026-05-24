import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CleanupOtpJob {
  constructor(private readonly prisma: PrismaService) {}

  /** Supprime les OTP expirés depuis >1h (idx_otp_expires). */
  async run(): Promise<{ deleted: number }> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - 1);

    const result = await this.prisma.otp.deleteMany({
      where: { expires_at: { lt: threshold } },
    });

    return { deleted: result.count };
  }
}
