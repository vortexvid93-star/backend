import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DiscoveryModule } from '../discovery/discovery.module';
import { PrismaModule } from '../prisma/prisma.module';
import { YoutubeModule } from '../youtube/youtube.module';
import { CronSchedulerService } from './cron-scheduler.service';
import { CleanupOtpJob } from './jobs/cleanup-otp.job';
import { CleanupTokenLectureJob } from './jobs/cleanup-token-lecture.job';
import { CloseExpiredChallengesJob } from './jobs/close-expired-challenges.job';
import { ExpireSubscriptionsJob } from './jobs/expire-subscriptions.job';
import { GenerateRecommendationsJob } from './jobs/generate-recommendations.job';
import { Reset7jStatsJob } from './jobs/reset-7j-stats.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DiscoveryModule,
    PrismaModule,
    YoutubeModule,
  ],
  providers: [
    CronSchedulerService,
    ExpireSubscriptionsJob,
    CleanupTokenLectureJob,
    Reset7jStatsJob,
    GenerateRecommendationsJob,
    CleanupOtpJob,
    CloseExpiredChallengesJob,
  ],
})
export class CronModule {}
