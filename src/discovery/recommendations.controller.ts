import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import { InteractRecommendationDto } from './dto/interact-recommendation.dto';
import { RecommendationsPicksQueryDto } from './dto/recommendations-picks-query.dto';
import { RecommendationsQueryDto } from './dto/recommendations-query.dto';
import { RecommendationsRefreshDto } from './dto/recommendations-refresh.dto';
import { SimilarBooksQueryDto } from './dto/similar-books-query.dto';
import {
  RecommendationsByReasonDocs,
  RecommendationsControllerDocs,
  RecommendationsDetailDocs,
  RecommendationsDismissDocs,
  RecommendationsForBookDocs,
  RecommendationsInteractDocs,
  RecommendationsListDocs,
  RecommendationsMarkAllSeenDocs,
  RecommendationsPicksDocs,
  RecommendationsRefreshDocs,
  RecommendationsSummaryDocs,
} from './recommendations.controller.docs';
import { RecommendationsService } from './recommendations.service';

@ApiTags(SWAGGER_TAGS.RECOMMENDATIONS)
@RecommendationsControllerDocs()
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  @RecommendationsListDocs()
  @HttpCode(HttpStatus.OK)
  listRecommendations(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecommendationsQueryDto,
  ) {
    return this.recommendationsService.listRecommendations(user.sub, query);
  }

  @Get('summary')
  @RecommendationsSummaryDocs()
  @HttpCode(HttpStatus.OK)
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.recommendationsService.getSummary(user.sub);
  }

  @Get('picks')
  @RecommendationsPicksDocs()
  @HttpCode(HttpStatus.OK)
  getPicks(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecommendationsPicksQueryDto,
  ) {
    return this.recommendationsService.getPicks(user.sub, query);
  }

  @Get('by-reason')
  @RecommendationsByReasonDocs()
  @HttpCode(HttpStatus.OK)
  getByReason(@CurrentUser() user: JwtPayload) {
    return this.recommendationsService.getByReason(user.sub);
  }

  @Get('for-book/:livreId')
  @RecommendationsForBookDocs()
  @HttpCode(HttpStatus.OK)
  getForBook(
    @CurrentUser() user: JwtPayload,
    @Param('livreId', ParseUUIDPipe) livreId: string,
    @Query() query: SimilarBooksQueryDto,
  ) {
    return this.recommendationsService.getForBook(user.sub, livreId, query);
  }

  @Post('refresh')
  @RecommendationsRefreshDocs()
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecommendationsRefreshDto,
  ) {
    return this.recommendationsService.refresh(user.sub, dto);
  }

  @Patch('mark-all-seen')
  @RecommendationsMarkAllSeenDocs()
  @HttpCode(HttpStatus.OK)
  markAllSeen(@CurrentUser() user: JwtPayload) {
    return this.recommendationsService.markAllSeen(user.sub);
  }

  @Get(':id')
  @RecommendationsDetailDocs()
  @HttpCode(HttpStatus.OK)
  getById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recommendationsService.getById(user.sub, id);
  }

  @Patch(':id/interact')
  @RecommendationsInteractDocs()
  @HttpCode(HttpStatus.OK)
  interact(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InteractRecommendationDto,
  ) {
    return this.recommendationsService.interact(user.sub, id, dto);
  }

  @Patch(':id/dismiss')
  @RecommendationsDismissDocs()
  @HttpCode(HttpStatus.OK)
  dismiss(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recommendationsService.dismiss(user.sub, id);
  }
}
