import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import {
  ChallengesControllerDocs,
  ChallengesDetailDocs,
  ChallengesExpiringDocs,
  ChallengesJoinDocs,
  ChallengesLeaveDocs,
  ChallengesListDocs,
  ChallengesProgressDocs,
  ChallengesRecommendedDocs,
  ChallengesStatsDocs,
} from './challenges.controller.docs';
import { ChallengesService } from './challenges.service';
import { ChallengesQueryDto } from './dto/challenges-query.dto';
import { ExpiringQueryDto } from './dto/expiring-query.dto';
import { RecommendedQueryDto } from './dto/recommended-query.dto';

@ApiTags(SWAGGER_TAGS.CHALLENGES)
@ChallengesControllerDocs()
@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @ChallengesListDocs()
  @HttpCode(HttpStatus.OK)
  listActiveChallenges(
    @CurrentUser() user: JwtPayload,
    @Query() query: ChallengesQueryDto,
  ) {
    return this.challengesService.listActiveChallenges(user.sub, query);
  }

  @Get('recommended')
  @ChallengesRecommendedDocs()
  @HttpCode(HttpStatus.OK)
  getRecommended(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecommendedQueryDto,
  ) {
    return this.challengesService.getRecommended(user.sub, query);
  }

  @Get('expiring')
  @ChallengesExpiringDocs()
  @HttpCode(HttpStatus.OK)
  listExpiring(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExpiringQueryDto,
  ) {
    return this.challengesService.listExpiring(user.sub, query);
  }

  @Get(':id/stats')
  @ChallengesStatsDocs()
  @HttpCode(HttpStatus.OK)
  getChallengeStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.challengesService.getChallengeStats(id);
  }

  @Get(':id/progress')
  @ChallengesProgressDocs()
  @HttpCode(HttpStatus.OK)
  getChallengeProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.challengesService.getChallengeProgress(user.sub, id);
  }

  @Get(':id')
  @ChallengesDetailDocs()
  @HttpCode(HttpStatus.OK)
  getChallengeById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.challengesService.getChallengeById(user.sub, id);
  }

  @Post(':id/join')
  @ChallengesJoinDocs()
  @HttpCode(HttpStatus.CREATED)
  joinChallenge(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.challengesService.joinChallenge(user.sub, id);
  }

  @Delete(':id/join')
  @ChallengesLeaveDocs()
  @HttpCode(HttpStatus.OK)
  leaveChallenge(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.challengesService.leaveChallenge(user.sub, id);
  }
}
