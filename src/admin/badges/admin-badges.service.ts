import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminBadgeListItem } from './admin-badges.mapper';
import type { AdminBadgesQueryDto } from './dto/admin-badges-query.dto';
import type { CreateAdminBadgeDto } from './dto/create-admin-badge.dto';
import type { UpdateAdminBadgeDto } from './dto/update-admin-badge.dto';

@Injectable()
export class AdminBadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async listBadges(query: AdminBadgesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.badge.findMany({
        include: { _count: { select: { userbadges: true } } },
        orderBy: { nom: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.badge.count(),
    ]);

    return {
      data: rows.map(mapAdminBadgeListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createBadge(dto: CreateAdminBadgeDto, iconeFile: Express.Multer.File) {
    this.cloudinary.assertValidBadgeIconFile(iconeFile);
    const upload = await this.cloudinary.uploadBadgeIcon(iconeFile);

    try {
      const badge = await this.prisma.badge.create({
        data: {
          nom: dto.nom.trim(),
          icone: upload.secure_url,
          couleur: dto.couleur,
          points: dto.points,
          description: dto.description ?? null,
        },
      });

      return { id: badge.id, icone: badge.icone };
    } catch (error) {
      await this.cloudinary.deleteByUrl(upload.secure_url);
      this.rethrowUniqueNom(error);
      throw error;
    }
  }

  async updateBadge(
    badgeId: string,
    dto: UpdateAdminBadgeDto,
    iconeFile?: Express.Multer.File,
  ) {
    const existing = await this.findBadgeOrThrow(badgeId);

    const data: Prisma.BadgeUpdateInput = {};
    if (dto.nom !== undefined) data.nom = dto.nom.trim();
    if (dto.couleur !== undefined) data.couleur = dto.couleur;
    if (dto.points !== undefined) data.points = dto.points;
    if (dto.description !== undefined) data.description = dto.description;

    if (iconeFile) {
      this.cloudinary.assertValidBadgeIconFile(iconeFile);
      const upload = await this.cloudinary.uploadBadgeIcon(iconeFile, badgeId);
      data.icone = upload.secure_url;
    }

    if (Object.keys(data).length === 0) {
      return {
        id: existing.id,
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    try {
      const updated = await this.prisma.badge.update({
        where: { id: badgeId },
        data,
      });

      if (iconeFile && existing.icone !== updated.icone) {
        await this.cloudinary.deleteByUrl(existing.icone);
      }

      return {
        id: updated.id,
        updatedAt: updated.updatedAt.toISOString(),
        ...(iconeFile ? { icone: updated.icone } : {}),
      };
    } catch (error) {
      this.rethrowUniqueNom(error);
      throw error;
    }
  }

  private async findBadgeOrThrow(badgeId: string) {
    const badge = await this.prisma.badge.findUnique({ where: { id: badgeId } });
    if (!badge) {
      throw new NotFoundException('Badge introuvable.');
    }
    return badge;
  }

  private rethrowUniqueNom(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Nom déjà utilisé.');
    }
  }
}
