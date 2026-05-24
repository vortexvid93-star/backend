import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import {
  LibrariesBooksDocs,
  LibrariesCategoriesDocs,
  LibrariesControllerDocs,
  LibrariesDetailDocs,
  LibrariesInProgressDocs,
  LibrariesListDocs,
  LibrariesStatsDocs,
  LibrariesSummaryDocs,
} from './libraries.controller.docs';
import { LibrariesQueryDto } from './dto/libraries-query.dto';
import { LibraryBooksQueryDto } from './dto/library-books-query.dto';
import { LibraryInProgressQueryDto } from './dto/library-in-progress-query.dto';
import { LibrariesService } from './libraries.service';

@ApiTags(SWAGGER_TAGS.LIBRARIES)
@LibrariesControllerDocs()
@Controller('libraries')
@UseGuards(JwtAuthGuard)
export class LibrariesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get('summary')
  @LibrariesSummaryDocs()
  @HttpCode(HttpStatus.OK)
  getSummary() {
    return this.librariesService.getLibrariesSummary();
  }

  @Get()
  @LibrariesListDocs()
  @HttpCode(HttpStatus.OK)
  listLibraries(@Query() query: LibrariesQueryDto) {
    return this.librariesService.listLibraries(query);
  }

  @Get(':id/stats')
  @LibrariesStatsDocs()
  @HttpCode(HttpStatus.OK)
  getLibraryStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.librariesService.getLibraryStats(id);
  }

  @Get(':id/categories')
  @LibrariesCategoriesDocs()
  @HttpCode(HttpStatus.OK)
  getLibraryCategories(@Param('id', ParseUUIDPipe) id: string) {
    return this.librariesService.getLibraryCategories(id);
  }

  @Get(':id/books/in-progress')
  @LibrariesInProgressDocs()
  @HttpCode(HttpStatus.OK)
  listLibraryBooksInProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LibraryInProgressQueryDto,
  ) {
    return this.librariesService.listLibraryBooksInProgress(
      user.sub,
      id,
      query,
    );
  }

  @Get(':id/books')
  @LibrariesBooksDocs()
  @HttpCode(HttpStatus.OK)
  listLibraryBooks(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LibraryBooksQueryDto,
  ) {
    return this.librariesService.listLibraryBooks(user.sub, id, query);
  }

  @Get(':id')
  @LibrariesDetailDocs()
  @HttpCode(HttpStatus.OK)
  getLibraryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.librariesService.getLibraryById(id);
  }
}
