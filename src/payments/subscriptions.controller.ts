import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthenticatedGuard } from '../auth/guards/jwt-authenticated.guard';
import type { JwtPayload } from '../auth/services/token.service';
import { SubscriptionHistoryQueryDto } from './dto/history-query.dto';
import {
  SubscriptionsCompareDocs,
  SubscriptionsControllerDocs,
  SubscriptionsCurrentDocs,
  SubscriptionsHistoryDocs,
  SubscriptionsSummaryDocs,
  SubscriptionsUpcomingDocs,
} from './subscriptions.controller.docs';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags(SWAGGER_TAGS.SUBSCRIPTIONS)
@SubscriptionsControllerDocs()
@Controller('subscriptions')
@UseGuards(JwtAuthenticatedGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @SubscriptionsCurrentDocs()
  getCurrent(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getCurrent(user.sub);
  }

  @Get('upcoming')
  @SubscriptionsUpcomingDocs()
  getUpcoming(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getUpcoming(user.sub);
  }

  @Get('summary')
  @SubscriptionsSummaryDocs()
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getSummary(user.sub);
  }

  @Get('compare')
  @SubscriptionsCompareDocs()
  comparePlans(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.comparePlansForUser(user.sub);
  }

  @Get('history')
  @SubscriptionsHistoryDocs()
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: SubscriptionHistoryQueryDto,
  ) {
    return this.subscriptionsService.getHistory(user.sub, query);
  }
}
