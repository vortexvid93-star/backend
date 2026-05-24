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
  AdminLibrariesAddBooksDocs,
  AdminLibrariesArchiveDocs,
  AdminLibrariesControllerDocs,
  AdminLibrariesCreateDocs,
  AdminLibrariesListDocs,
  AdminLibrariesRemoveBookDocs,
  AdminLibrariesUpdateDocs,
} from './admin-libraries.controller.docs';
import { AdminLibrariesService } from './admin-libraries.service';
import { AddLibraryBooksDto } from './dto/add-library-books.dto';
import { AdminLibrariesQueryDto } from './dto/admin-libraries-query.dto';
import { CreateAdminLibraryDto } from './dto/create-admin-library.dto';
import { UpdateAdminLibraryDto } from './dto/update-admin-library.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_LIBRARIES)
@AdminLibrariesControllerDocs()
@Controller('admin/libraries')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminLibrariesController {
  constructor(private readonly adminLibrariesService: AdminLibrariesService) {}

  @Get()
  @AdminLibrariesListDocs()
  @HttpCode(HttpStatus.OK)
  listLibraries(@Query() query: AdminLibrariesQueryDto) {
    return this.adminLibrariesService.listLibraries(query);
  }

  @Post()
  @AdminLibrariesCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createLibrary(@Body() dto: CreateAdminLibraryDto) {
    return this.adminLibrariesService.createLibrary(dto);
  }

  @Patch(':id/archive')
  @AdminLibrariesArchiveDocs()
  @HttpCode(HttpStatus.OK)
  archiveLibrary(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminLibrariesService.archiveLibrary(id);
  }

  @Post(':id/books')
  @AdminLibrariesAddBooksDocs()
  @HttpCode(HttpStatus.OK)
  addBooks(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLibraryBooksDto,
  ) {
    return this.adminLibrariesService.addBooks(id, dto);
  }

  @Delete(':bibId/books/:bookId')
  @AdminLibrariesRemoveBookDocs()
  @HttpCode(HttpStatus.OK)
  removeBook(
    @Param('bibId', ParseUUIDPipe) bibId: string,
    @Param('bookId', ParseUUIDPipe) bookId: string,
  ) {
    return this.adminLibrariesService.removeBook(bibId, bookId);
  }

  @Patch(':id')
  @AdminLibrariesUpdateDocs()
  @HttpCode(HttpStatus.OK)
  updateLibrary(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminLibraryDto,
  ) {
    return this.adminLibrariesService.updateLibrary(id, dto);
  }
}
