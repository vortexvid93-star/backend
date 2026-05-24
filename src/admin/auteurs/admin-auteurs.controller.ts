import {
  Body,
  Controller,
  Delete,
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
  AdminAuteursControllerDocs,
  AdminAuteursCreateDocs,
  AdminAuteursDeleteDocs,
  AdminAuteursListDocs,
  AdminAuteursUpdateDocs,
} from './admin-auteurs.controller.docs';
import { AdminAuteursService } from './admin-auteurs.service';
import { AdminAuteursQueryDto } from './dto/admin-auteurs-query.dto';
import { CreateAdminAuteurDto } from './dto/create-admin-auteur.dto';
import { UpdateAdminAuteurDto } from './dto/update-admin-auteur.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_AUTEURS)
@AdminAuteursControllerDocs()
@Controller('admin/auteurs')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminAuteursController {
  constructor(private readonly adminAuteursService: AdminAuteursService) {}

  @Get()
  @AdminAuteursListDocs()
  @HttpCode(HttpStatus.OK)
  listAuteurs(@Query() query: AdminAuteursQueryDto) {
    return this.adminAuteursService.listAuteurs(query);
  }

  @Post()
  @AdminAuteursCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createAuteur(@Body() dto: CreateAdminAuteurDto) {
    return this.adminAuteursService.createAuteur(dto);
  }

  @Patch(':id')
  @AdminAuteursUpdateDocs()
  @HttpCode(HttpStatus.OK)
  updateAuteur(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminAuteurDto,
  ) {
    return this.adminAuteursService.updateAuteur(id, dto);
  }

  @Delete(':id')
  @AdminAuteursDeleteDocs()
  @HttpCode(HttpStatus.OK)
  softDeleteAuteur(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminAuteursService.softDeleteAuteur(id);
  }
}
