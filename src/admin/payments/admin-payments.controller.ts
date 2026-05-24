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
  AdminPaymentsControllerDocs,
  AdminPaymentsListDocs,
} from './admin-payments.controller.docs';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminPaymentsQueryDto } from './dto/admin-payments-query.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_MODERATION)
@AdminPaymentsControllerDocs()
@Controller('admin/payments')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Get()
  @AdminPaymentsListDocs()
  @HttpCode(HttpStatus.OK)
  listPayments(@Query() query: AdminPaymentsQueryDto) {
    return this.adminPaymentsService.listPayments(query);
  }
}
