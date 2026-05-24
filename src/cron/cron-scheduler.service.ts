import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CRON_JOB_NAMES } from './cron.constants';
import { runCronJob } from './run-cron-job.util';
import { CleanupOtpJob } from './jobs/cleanup-otp.job';
import { CleanupTokenLectureJob } from './jobs/cleanup-token-lecture.job';
import { CloseExpiredChallengesJob } from './jobs/close-expired-challenges.job';
import { ExpireSubscriptionsJob } from './jobs/expire-subscriptions.job';
import { GenerateRecommendationsJob } from './jobs/generate-recommendations.job';
import { Reset7jStatsJob } from './jobs/reset-7j-stats.job';

@Injectable()
export class CronSchedulerService {
  private readonly logger = new Logger(CronSchedulerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly expireSubscriptionsJob: ExpireSubscriptionsJob,
    private readonly cleanupTokenLectureJob: CleanupTokenLectureJob,
    private readonly reset7jStatsJob: Reset7jStatsJob,
    private readonly generateRecommendationsJob: GenerateRecommendationsJob,
    private readonly cleanupOtpJob: CleanupOtpJob,
    private readonly closeExpiredChallengesJob: CloseExpiredChallengesJob,
  ) {}

  private isEnabled(): boolean {
    return this.config.get<string>('CRON_ENABLED', 'true') !== 'false';
  }

  @Cron('0 0 * * *', { timeZone: 'UTC' })
  async handleExpireSubscriptions(): Promise<void> {
    if (!this.isEnabled()) return;
    await runCronJob(this.logger, CRON_JOB_NAMES.EXPIRE_SUBSCRIPTIONS, () =>
      this.expireSubscriptionsJob.run(),
    );
  }

  @Cron('0 * * * *', { timeZone: 'UTC' })
  async handleCleanupTokenLecture(): Promise<void> {
    if (!this.isEnabled()) return;
    await runCronJob(this.logger, CRON_JOB_NAMES.CLEANUP_TOKEN_LECTURE, () =>
      this.cleanupTokenLectureJob.run(),
    );
  }

  @Cron('0 1 * * *', { timeZone: 'UTC' })
  async handleReset7jStats(): Promise<void> {
    if (!this.isEnabled()) return;
    await runCronJob(this.logger, CRON_JOB_NAMES.RESET_7J_STATS, () =>
      this.reset7jStatsJob.run(),
    );
  }

  @Cron('0 3 * * *', { timeZone: 'UTC' })
  async handleGenerateRecommendations(): Promise<void> {
    if (!this.isEnabled()) return;
    await runCronJob(this.logger, CRON_JOB_NAMES.GENERATE_RECOMMENDATIONS, () =>
      this.generateRecommendationsJob.run(),
    );
  }

  @Cron('*/30 * * * *', { timeZone: 'UTC' })
  async handleCleanupOtp(): Promise<void> {
    if (!this.isEnabled()) return;
    await runCronJob(this.logger, CRON_JOB_NAMES.CLEANUP_OTP, () =>
      this.cleanupOtpJob.run(),
    );
  }

  @Cron('30 0 * * *', { timeZone: 'UTC' })
  async handleCloseExpiredChallenges(): Promise<void> {
    if (!this.isEnabled()) return;
    await runCronJob(this.logger, CRON_JOB_NAMES.CLOSE_EXPIRED_CHALLENGES, () =>
      this.closeExpiredChallengesJob.run(),
    );
  }
}
