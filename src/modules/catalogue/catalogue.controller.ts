import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { CatalogueService } from './catalogue.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@ApiTags('Catalogue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get('books')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Lister les livres' })
  @ApiResponse({ status: 200, description: 'Liste des livres' })
  findAllBooks() {
    return this.catalogueService.findAllBooks();
  }

  @Get('books/:id')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Obtenir un livre' })
  @ApiResponse({ status: 200, description: 'Livre trouvé' })
  findBook(@Param('id') id: string) {
    return this.catalogueService.findBook(id);
  }

  @Post('books')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Créer un livre' })
  @ApiResponse({ status: 201, description: 'Livre créé' })
  createBook(@Body() dto: CreateBookDto) {
    return this.catalogueService.createBook(dto);
  }

  @Patch('books/:id')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Mettre à jour un livre' })
  @ApiResponse({ status: 200, description: 'Livre mis à jour' })
  updateBook(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.catalogueService.updateBook(id, dto);
  }

  @Delete('books/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer un livre' })
  @ApiResponse({ status: 200, description: 'Livre supprimé' })
  removeBook(@Param('id') id: string) {
    return this.catalogueService.removeBook(id);
  }
}
