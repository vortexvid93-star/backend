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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminEtablissementsAttachMembreDocs,
  AdminEtablissementsControllerDocs,
  AdminEtablissementsCreateDocs,
  AdminEtablissementsDetachMembreDocs,
  AdminEtablissementsListDocs,
  AdminEtablissementsPerformanceDocs,
  AdminEtablissementsProlongerDocs,
} from './admin-etablissements.controller.docs';
import { AdminEtablissementsService } from './admin-etablissements.service';
import { AdminEtablissementsQueryDto } from './dto/admin-etablissements-query.dto';
import { AttachMembreDto } from './dto/attach-membre.dto';
import { CreateAdminEtablissementDto } from './dto/create-admin-etablissement.dto';
import { ProlongerEtablissementDto } from './dto/prolonger-etablissement.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_ETABLISSEMENTS)
@AdminEtablissementsControllerDocs()
@Controller('admin/etablissements')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminEtablissementsController {
  constructor(
    private readonly adminEtablissementsService: AdminEtablissementsService,
  ) {}

  @Get()
  @AdminEtablissementsListDocs()
  @HttpCode(HttpStatus.OK)
  listEtablissements(@Query() query: AdminEtablissementsQueryDto) {
    return this.adminEtablissementsService.listEtablissements(query);
  }

  @Post()
  @AdminEtablissementsCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createEtablissement(@Body() dto: CreateAdminEtablissementDto) {
    return this.adminEtablissementsService.createEtablissement(dto);
  }

  @Get(':id')
  @AdminEtablissementsListDocs()
  @HttpCode(HttpStatus.OK)
  getEtablissementDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminEtablissementsService.getEtablissementDetail(id);
  }

  @Post(':id/membres')
  @AdminEtablissementsAttachMembreDocs()
  @HttpCode(HttpStatus.OK)
  attachMembre(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachMembreDto,
  ) {
    return this.adminEtablissementsService.attachMembre(id, dto);
  }

  @Patch(':id/membres/:membreId/retirer')
  @AdminEtablissementsDetachMembreDocs()
  @HttpCode(HttpStatus.OK)
  detachMembre(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membreId', ParseUUIDPipe) membreId: string,
  ) {
    return this.adminEtablissementsService.detachMembre(id, membreId);
  }

  @Get(':id/performance')
  @AdminEtablissementsPerformanceDocs()
  @HttpCode(HttpStatus.OK)
  getEtablissementPerformance(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminEtablissementsService.getEtablissementPerformance(id);
  }

  @Patch(':id/prolonger')
  @AdminEtablissementsProlongerDocs()
  @HttpCode(HttpStatus.OK)
  prolongerEtablissement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProlongerEtablissementDto,
  ) {
    return this.adminEtablissementsService.prolongerEtablissement(id, dto);
  }
}
