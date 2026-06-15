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
  AdminCategoriesControllerDocs,
  AdminCategoriesCreateDocs,
  AdminCategoriesDeleteDocs,
  AdminCategoriesListDocs,
  AdminCategoriesUpdateDocs,
} from './admin-categories.controller.docs';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminCategoriesQueryDto } from './dto/admin-categories-query.dto';
import { CreateAdminCategorieDto } from './dto/create-admin-categorie.dto';
import { UpdateAdminCategorieDto } from './dto/update-admin-categorie.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_CATEGORIES)
@AdminCategoriesControllerDocs()
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminCategoriesController {
  constructor(
    private readonly adminCategoriesService: AdminCategoriesService,
  ) {}

  @Get()
  @AdminCategoriesListDocs()
  @HttpCode(HttpStatus.OK)
  listCategories(@Query() query: AdminCategoriesQueryDto) {
    return this.adminCategoriesService.listCategories(query);
  }

  @Post()
  @AdminCategoriesCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createCategorie(@Body() dto: CreateAdminCategorieDto) {
    return this.adminCategoriesService.createCategorie(dto);
  }

  @Patch(':id')
  @AdminCategoriesUpdateDocs()
  @HttpCode(HttpStatus.OK)
  updateCategorie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminCategorieDto,
  ) {
    return this.adminCategoriesService.updateCategorie(id, dto);
  }

  @Delete(':id')
  @AdminCategoriesDeleteDocs()
  @HttpCode(HttpStatus.OK)
  softDeleteCategorie(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCategoriesService.softDeleteCategorie(id);
  }
}
