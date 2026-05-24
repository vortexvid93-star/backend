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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CLOUDINARY_CONSTANTS } from '../../cloudinary/cloudinary.constants';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminBadgesControllerDocs,
  AdminBadgesCreateDocs,
  AdminBadgesListDocs,
  AdminBadgesUpdateDocs,
} from './admin-badges.controller.docs';
import { AdminBadgesService } from './admin-badges.service';
import { AdminBadgesQueryDto } from './dto/admin-badges-query.dto';
import { CreateAdminBadgeDto } from './dto/create-admin-badge.dto';
import { UpdateAdminBadgeDto } from './dto/update-admin-badge.dto';

const badgeIconInterceptor = FileInterceptor('icone', {
  storage: memoryStorage(),
  limits: { fileSize: CLOUDINARY_CONSTANTS.MAX_FILE_SIZE_BYTES },
});

const badgeMultipartSchema = {
  type: 'object' as const,
  properties: {
    icone: {
      type: 'string' as const,
      format: 'binary' as const,
      description: 'Icône du badge (PNG, JPEG, WebP, SVG) — upload Cloudinary.',
    },
    nom: { type: 'string' as const },
    couleur: { type: 'string' as const, description: 'Code hex #RRGGBB' },
    points: { type: 'integer' as const },
    description: { type: 'string' as const },
  },
};

@ApiTags(SWAGGER_TAGS.ADMIN_BADGES)
@AdminBadgesControllerDocs()
@Controller('admin/badges')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminBadgesController {
  constructor(private readonly adminBadgesService: AdminBadgesService) {}

  @Get()
  @AdminBadgesListDocs()
  @HttpCode(HttpStatus.OK)
  listBadges(@Query() query: AdminBadgesQueryDto) {
    return this.adminBadgesService.listBadges(query);
  }

  @Post()
  @AdminBadgesCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(badgeIconInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      ...badgeMultipartSchema,
      required: ['icone', 'nom', 'couleur', 'points'],
    },
  })
  createBadge(
    @UploadedFile() icone: Express.Multer.File,
    @Body() dto: CreateAdminBadgeDto,
  ) {
    return this.adminBadgesService.createBadge(dto, icone);
  }

  @Patch(':id')
  @AdminBadgesUpdateDocs()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(badgeIconInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: badgeMultipartSchema })
  updateBadge(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() icone: Express.Multer.File | undefined,
    @Body() dto: UpdateAdminBadgeDto,
  ) {
    return this.adminBadgesService.updateBadge(id, dto, icone);
  }
}
