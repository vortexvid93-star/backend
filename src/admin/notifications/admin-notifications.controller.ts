import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import { AdminNotificationsCreateDocs, AdminNotificationsControllerDocs } from './admin-notifications.controller.docs';
import { AdminNotificationsService } from './admin-notifications.service';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_NOTIFICATIONS)
@AdminNotificationsControllerDocs()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  @Post()
  @AdminNotificationsCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createNotification(@Body() dto: CreateAdminNotificationDto) {
    return this.adminNotificationsService.createNotification(dto);
  }
}
