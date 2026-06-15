import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import {
  GamificationControllerDocs,
  GamificationOverviewDocs,
} from './gamification.controller.docs';
import { GamificationService } from './gamification.service';

@ApiTags(SWAGGER_TAGS.GAMIFICATION)
@GamificationControllerDocs()
@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('overview')
  @GamificationOverviewDocs()
  @HttpCode(HttpStatus.OK)
  getOverview(@CurrentUser() user: JwtPayload) {
    return this.gamificationService.getOverview(user.sub);
  }

  @Get('leaderboard')
  @HttpCode(HttpStatus.OK)
  getLeaderboard(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
    return this.gamificationService.getLeaderboard(user.sub, parsed);
  }

  @Patch('daily-goal')
  @HttpCode(HttpStatus.NO_CONTENT)
  setDailyGoal(
    @CurrentUser() user: JwtPayload,
    @Body('minutes') minutes: number,
  ) {
    const clamped = Math.max(5, Math.min(480, Number(minutes) || 20));
    return this.gamificationService.setDailyGoal(user.sub, clamped);
  }
}
