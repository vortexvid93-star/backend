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
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../../auth/services/token.service';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import { BanUserDto } from './dto/ban-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import {
  AdminUsersBanDocs,
  AdminUsersControllerDocs,
  AdminUsersCreateDocs,
  AdminUsersDetailDocs,
  AdminUsersListDocs,
  AdminUsersUnbanDocs,
} from './users.controller.docs';
import { AdminUsersService } from './users.service';

@ApiTags(SWAGGER_TAGS.ADMIN_USERS)
@AdminUsersControllerDocs()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @AdminUsersListDocs()
  @HttpCode(HttpStatus.OK)
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Post()
  @AdminUsersCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminUsersService.createAdmin(dto);
  }

  @Get(':id')
  @AdminUsersDetailDocs()
  @HttpCode(HttpStatus.OK)
  getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.getUserDetail(id);
  }

  @Patch(':id/ban')
  @AdminUsersBanDocs()
  @HttpCode(HttpStatus.OK)
  banUser(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminUsersService.banUser(id, admin.sub, dto);
  }

  @Patch(':id/unban')
  @AdminUsersUnbanDocs()
  @HttpCode(HttpStatus.OK)
  unbanUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.unbanUser(id);
  }
}
