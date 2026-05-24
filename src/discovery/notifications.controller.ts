import {
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
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import {
  NotificationsControllerDocs,
  NotificationsListDocs,
  NotificationsReadAllDocs,
  NotificationsReadOneDocs,
} from './notifications.controller.docs';
import { NotificationsService } from './notifications.service';

@ApiTags(SWAGGER_TAGS.NOTIFICATIONS)
@NotificationsControllerDocs()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @NotificationsListDocs()
  @HttpCode(HttpStatus.OK)
  listNotifications(
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notificationsService.listNotifications(user.sub, query);
  }

  @Patch('read-all')
  @NotificationsReadAllDocs()
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Patch(':id/read')
  @NotificationsReadOneDocs()
  @HttpCode(HttpStatus.OK)
  markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(user.sub, id);
  }
}
