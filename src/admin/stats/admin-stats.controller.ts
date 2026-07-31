import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminStatsBooksDocs,
  AdminStatsControllerDocs,
  AdminStatsDashboardDocs,
  AdminStatsActivityDocs,
  AdminStatsReadingHabitsDocs,
  AdminStatsSearchTermsDocs,
  AdminStatsUsersDocs,
} from './admin-stats.controller.docs';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsActivityQueryDto } from './dto/admin-stats-activity-query.dto';
import { AdminStatsBooksQueryDto } from './dto/admin-stats-books-query.dto';
import { AdminStatsReadingHabitsQueryDto } from './dto/admin-stats-reading-habits-query.dto';
import { AdminStatsSearchTermsQueryDto } from './dto/admin-stats-search-terms-query.dto';
import { AdminStatsUsersQueryDto } from './dto/admin-stats-users-query.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_STATS)
@AdminStatsControllerDocs()
@Controller('admin/stats')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get('dashboard')
  @AdminStatsDashboardDocs()
  @HttpCode(HttpStatus.OK)
  getDashboard() {
    return this.adminStatsService.getDashboard();
  }

  @Get('books')
  @AdminStatsBooksDocs()
  @HttpCode(HttpStatus.OK)
  getBookStats(@Query() query: AdminStatsBooksQueryDto) {
    return this.adminStatsService.getBookStats(query);
  }

  @Get('users')
  @AdminStatsUsersDocs()
  @HttpCode(HttpStatus.OK)
  getUserStats(@Query() query: AdminStatsUsersQueryDto) {
    return this.adminStatsService.getUserStats(query);
  }

  @Get('search-terms')
  @AdminStatsSearchTermsDocs()
  @HttpCode(HttpStatus.OK)
  getSearchTermsStats(@Query() query: AdminStatsSearchTermsQueryDto) {
    return this.adminStatsService.getSearchTermsStats(query);
  }

  @Get('activity')
  @AdminStatsActivityDocs()
  @HttpCode(HttpStatus.OK)
  getActivity(@Query() query: AdminStatsActivityQueryDto) {
    return this.adminStatsService.getActivity(query);
  }

  @Get('reading-habits')
  @AdminStatsReadingHabitsDocs()
  @HttpCode(HttpStatus.OK)
  getReadingHabits(@Query() query: AdminStatsReadingHabitsQueryDto) {
    return this.adminStatsService.getReadingHabits(query);
  }
}
