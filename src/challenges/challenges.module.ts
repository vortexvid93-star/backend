import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { ChallengesController } from './challenges.controller';
import { ChallengesEngineService } from './challenges-engine.service';
import { ChallengesService } from './challenges.service';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { StreakService } from './streak.service';

@Module({
  imports: [AuthModule],
  controllers: [
    ChallengesController,
    BadgesController,
    GamificationController,
  ],
  providers: [
    ChallengesEngineService,
    ChallengesService,
    BadgesService,
    GamificationService,
    StreakService,
    JwtAuthGuard,
  ],
  exports: [ChallengesEngineService, ChallengesService, StreakService],
})
export class ChallengesModule {}
