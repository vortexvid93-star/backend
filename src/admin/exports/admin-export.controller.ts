import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import { AdminPaymentsQueryDto } from '../payments/dto/admin-payments-query.dto';
import { AdminPerformanceQueryDto } from '../performance/dto/admin-performance-query.dto';
import {
  AdminExportControllerDocs,
  AdminExportStatsPdfDocs,
  AdminExportStatsXlsxDocs,
  AdminExportUserPdfDocs,
  AdminExportUserXlsxDocs,
  AdminExportPaymentsPdfDocs,
  AdminExportPaymentsXlsxDocs,
  AdminExportPerformancePdfDocs,
  AdminExportPerformanceXlsxDocs,
} from './admin-export.controller.docs';
import { AdminExportService } from './admin-export.service';

@ApiTags(SWAGGER_TAGS.ADMIN_STATS)
@AdminExportControllerDocs()
@Controller('admin/export')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminExportController {
  constructor(private readonly adminExportService: AdminExportService) {}

  @Get('stats/pdf')
  @AdminExportStatsPdfDocs()
  async getStatsPdf(@Res() res: Response) {
    const buffer = await this.adminExportService.getStatsPdf();
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="blinks-statistiques.pdf"',
      })
      .send(buffer);
  }

  @Get('stats/xlsx')
  @AdminExportStatsXlsxDocs()
  async getStatsXlsx(@Res() res: Response) {
    const buffer = await this.adminExportService.getStatsXlsx();
    res
      .status(200)
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="blinks-statistiques.xlsx"',
      })
      .send(buffer);
  }

  @Get('users/:id/pdf')
  @AdminExportUserPdfDocs()
  async getUserPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.adminExportService.getUserPdf(id);
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="blinks-utilisateur-${id}.pdf"`,
      })
      .send(buffer);
  }

  @Get('users/:id/xlsx')
  @AdminExportUserXlsxDocs()
  async getUserXlsx(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.adminExportService.getUserXlsx(id);
    res
      .status(200)
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="blinks-utilisateur-${id}.xlsx"`,
      })
      .send(buffer);
  }

  @Get('payments/pdf')
  @AdminExportPaymentsPdfDocs()
  async getPaymentsPdf(
    @Query() query: AdminPaymentsQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.adminExportService.getPaymentsPdf(query);
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="blinks-paiements.pdf"',
      })
      .send(buffer);
  }

  @Get('payments/xlsx')
  @AdminExportPaymentsXlsxDocs()
  async getPaymentsXlsx(
    @Query() query: AdminPaymentsQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.adminExportService.getPaymentsXlsx(query);
    res
      .status(200)
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="blinks-paiements.xlsx"',
      })
      .send(buffer);
  }

  @Get('performance/pdf')
  @AdminExportPerformancePdfDocs()
  async getPerformancePdf(
    @Query() query: AdminPerformanceQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.adminExportService.getPerformancePdf(query);
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="blinks-performance.pdf"',
      })
      .send(buffer);
  }

  @Get('performance/xlsx')
  @AdminExportPerformanceXlsxDocs()
  async getPerformanceXlsx(
    @Query() query: AdminPerformanceQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.adminExportService.getPerformanceXlsx(query);
    res
      .status(200)
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="blinks-performance.xlsx"',
      })
      .send(buffer);
  }
}
