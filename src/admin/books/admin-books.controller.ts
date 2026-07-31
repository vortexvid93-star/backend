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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { BOOK_FILE_STORAGE_CONSTANTS } from '../../storage/book-file-storage.constants';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import { AdminBooksService } from './admin-books.service';
import {
  AdminBooksArchiveDocs,
  AdminBooksAssignAuthorsDocs,
  AdminBooksAssignCategoriesDocs,
  AdminBooksControllerDocs,
  AdminBooksCreateDocs,
  AdminBooksDetailDocs,
  AdminBooksListDocs,
  AdminBooksUpdateDocs,
} from './admin-books.controller.docs';
import { AdminBooksQueryDto } from './dto/admin-books-query.dto';
import { AssignBookAuthorsDto } from './dto/assign-authors.dto';
import { AssignBookCategoriesDto } from './dto/assign-categories.dto';
import { CreateAdminBookDto } from './dto/create-admin-book.dto';
import { UpdateAdminBookDto } from './dto/update-admin-book.dto';

const bookFilesInterceptor = FileFieldsInterceptor(
  [
    { name: 'file', maxCount: 1 },
    { name: 'couverture', maxCount: 1 },
  ],
  {
    storage: memoryStorage(),
    limits: {
      fileSize: BOOK_FILE_STORAGE_CONSTANTS.MAX_BOOK_FILE_SIZE_BYTES,
    },
  },
);

const bookMultipartSchema = {
  type: 'object' as const,
  properties: {
    file: {
      type: 'string' as const,
      format: 'binary' as const,
      description:
        'Fichier du livre (PDF, EPUB, MOBI) — obligatoire si type_livre=INTERNE. Max 50 Mo.',
    },
    couverture: {
      type: 'string' as const,
      format: 'binary' as const,
      description:
        'Image de couverture (PNG, JPEG, WebP, SVG) — upload Cloudinary → couverture_url.',
    },
    titre: { type: 'string' as const },
    type_livre: { type: 'string' as const, enum: ['INTERNE', 'EXTERNE'] },
    url_externe_livre: {
      type: 'string' as const,
      description: 'Obligatoire si type_livre=EXTERNE.',
    },
    is_downloadable: { type: 'boolean' as const },
    isbn: { type: 'string' as const },
    resume: { type: 'string' as const },
    langue: { type: 'string' as const },
    annee_publication: { type: 'integer' as const },
    nombre_pages: { type: 'integer' as const },
  },
};

type BookUploadedFiles = {
  file?: Express.Multer.File[];
  couverture?: Express.Multer.File[];
};

@ApiTags(SWAGGER_TAGS.ADMIN_BOOKS)
@AdminBooksControllerDocs()
@Controller('admin/books')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminBooksController {
  constructor(private readonly adminBooksService: AdminBooksService) {}

  @Get()
  @AdminBooksListDocs()
  @HttpCode(HttpStatus.OK)
  listBooks(@Query() query: AdminBooksQueryDto) {
    return this.adminBooksService.listBooks(query);
  }

  @Get(':id')
  @AdminBooksDetailDocs()
  @HttpCode(HttpStatus.OK)
  getBookDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminBooksService.getBookDetail(id);
  }

  @Post()
  @AdminBooksCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(bookFilesInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      ...bookMultipartSchema,
      required: ['titre', 'type_livre'],
    },
  })
  createBook(
    @UploadedFiles() files: BookUploadedFiles,
    @Body() dto: CreateAdminBookDto,
  ) {
    return this.adminBooksService.createBook(
      dto,
      files?.file?.[0],
      files?.couverture?.[0],
    );
  }

  @Patch(':id/archive')
  @AdminBooksArchiveDocs()
  @HttpCode(HttpStatus.OK)
  archiveBook(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminBooksService.archiveBook(id);
  }

  @Post(':id/categories')
  @AdminBooksAssignCategoriesDocs()
  @HttpCode(HttpStatus.OK)
  assignCategories(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignBookCategoriesDto,
  ) {
    return this.adminBooksService.assignCategories(id, dto);
  }

  @Post(':id/authors')
  @AdminBooksAssignAuthorsDocs()
  @HttpCode(HttpStatus.OK)
  assignAuthors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignBookAuthorsDto,
  ) {
    return this.adminBooksService.assignAuthors(id, dto);
  }

  @Patch(':id')
  @AdminBooksUpdateDocs()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(bookFilesInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: bookMultipartSchema })
  updateBook(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: BookUploadedFiles,
    @Body() dto: UpdateAdminBookDto,
  ) {
    return this.adminBooksService.updateBook(
      id,
      dto,
      files?.file?.[0],
      files?.couverture?.[0],
    );
  }
}
