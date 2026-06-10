import {
  Body,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminNotificationsControllerDocs,
  AdminNotificationsCreateDocs,
  AdminNotificationsDeleteDocs,
  AdminNotificationsListDocs,
} from './admin-notifications.controller.docs';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotificationsListQueryDto } from './dto/admin-notifications-list.dto';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_NOTIFICATIONS)
@AdminNotificationsControllerDocs()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  @Get()
  @AdminNotificationsListDocs()
  @HttpCode(HttpStatus.OK)
  listNotifications(@Query() query: AdminNotificationsListQueryDto) {
    return this.adminNotificationsService.listNotifications(query);
  }

  @Post()
  @AdminNotificationsCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createNotification(@Body() dto: CreateAdminNotificationDto) {
    return this.adminNotificationsService.createNotification(dto);
  }

  @Delete(':id')
  @AdminNotificationsDeleteDocs()
  @HttpCode(HttpStatus.OK)
  deleteNotification(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminNotificationsService.deleteNotificationGroup(id);
  }
}
