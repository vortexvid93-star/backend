import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsEngineService } from './recommendations-engine.service';
import { RecommendationsService } from './recommendations.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [AuthModule],
  controllers: [
    RecommendationsController,
    SearchController,
    NotificationsController,
  ],
  providers: [
    RecommendationsEngineService,
    RecommendationsService,
    SearchService,
    NotificationsService,
    JwtAuthGuard,
  ],
  exports: [RecommendationsEngineService, RecommendationsService],
})
export class DiscoveryModule {}
