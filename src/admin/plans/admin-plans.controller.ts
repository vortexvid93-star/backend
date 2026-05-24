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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminPlansControllerDocs,
  AdminPlansCreateDocs,
  AdminPlansListDocs,
  AdminPlansUpdateDocs,
} from './admin-plans.controller.docs';
import { AdminPlansService } from './admin-plans.service';
import { CreateAdminPlanDto } from './dto/create-admin-plan.dto';
import { UpdateAdminPlanDto } from './dto/update-admin-plan.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_PLANS)
@AdminPlansControllerDocs()
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminPlansController {
  constructor(private readonly adminPlansService: AdminPlansService) {}

  @Get()
  @AdminPlansListDocs()
  @HttpCode(HttpStatus.OK)
  listPlans() {
    return this.adminPlansService.listPlans();
  }

  @Post()
  @AdminPlansCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createPlan(@Body() dto: CreateAdminPlanDto) {
    return this.adminPlansService.createPlan(dto);
  }

  @Patch(':id')
  @AdminPlansUpdateDocs()
  @HttpCode(HttpStatus.OK)
  updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminPlanDto,
  ) {
    return this.adminPlansService.updatePlan(id, dto);
  }
}
