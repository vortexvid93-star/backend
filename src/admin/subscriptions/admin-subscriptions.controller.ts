import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminSubscriptionsCancelDocs,
  AdminSubscriptionsControllerDocs,
  AdminSubscriptionsListDocs,
} from './admin-subscriptions.controller.docs';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { AdminSubscriptionsQueryDto } from './dto/admin-subscriptions-query.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_MODERATION)
@AdminSubscriptionsControllerDocs()
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminSubscriptionsController {
  constructor(
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
  ) {}

  @Get()
  @AdminSubscriptionsListDocs()
  @HttpCode(HttpStatus.OK)
  listSubscriptions(@Query() query: AdminSubscriptionsQueryDto) {
    return this.adminSubscriptionsService.listSubscriptions(query);
  }

  @Patch(':id/cancel')
  @AdminSubscriptionsCancelDocs()
  @HttpCode(HttpStatus.OK)
  cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.adminSubscriptionsService.cancelSubscription(id, dto);
  }
}
