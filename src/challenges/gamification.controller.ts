import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
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
}
