import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import {
  BadgesControllerDocs,
  BadgesDetailDocs,
  BadgesListDocs,
  BadgesNextDocs,
  BadgesPathDocs,
} from './badges.controller.docs';
import { BadgesService } from './badges.service';
import { BadgesQueryDto } from './dto/badges-query.dto';

@ApiTags(SWAGGER_TAGS.BADGES)
@BadgesControllerDocs()
@Controller('badges')
@UseGuards(JwtAuthGuard)
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @BadgesListDocs()
  @HttpCode(HttpStatus.OK)
  listBadges(
    @CurrentUser() user: JwtPayload,
    @Query() query: BadgesQueryDto,
  ) {
    return this.badgesService.listBadges(user.sub, query);
  }

  @Get('next')
  @BadgesNextDocs()
  @HttpCode(HttpStatus.OK)
  getNextBadge(@CurrentUser() user: JwtPayload) {
    return this.badgesService.getNextBadge(user.sub);
  }

  @Get(':id/path')
  @BadgesPathDocs()
  @HttpCode(HttpStatus.OK)
  getBadgePath(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.badgesService.getBadgePath(user.sub, id);
  }

  @Get(':id')
  @BadgesDetailDocs()
  @HttpCode(HttpStatus.OK)
  getBadgeById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.badgesService.getBadgeById(user.sub, id);
  }
}
