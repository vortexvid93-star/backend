import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminPerformanceControllerDocs,
  AdminPerformanceOverviewDocs,
} from './admin-performance.controller.docs';
import { AdminPerformanceService } from './admin-performance.service';
import { AdminPerformanceQueryDto } from './dto/admin-performance-query.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_PERFORMANCE)
@AdminPerformanceControllerDocs()
@Controller('admin/performance')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminPerformanceController {
  constructor(private readonly adminPerformanceService: AdminPerformanceService) {}

  @Get('overview')
  @AdminPerformanceOverviewDocs()
  @HttpCode(HttpStatus.OK)
  getOverview(@Query() query: AdminPerformanceQueryDto) {
    return this.adminPerformanceService.getOverview(query);
  }
}
