import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { mapNotification } from './discovery.mapper';
import type { NotificationsQueryDto } from './dto/notifications-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(authId: string, query: NotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      auth_id: authId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.lu !== undefined ? { lu: query.lu } : {}),
    };

    const [rows, total, nbNonLues] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { auth_id: authId, lu: false },
      }),
    ]);

    return {
      data: rows.map(mapNotification),
      meta: buildPaginationMeta(page, limit, total),
      nb_non_lues: nbNonLues,
    };
  }

  async markAsRead(authId: string, id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });

    if (!row) {
      throw new NotFoundException('Notification introuvable.');
    }

    if (row.auth_id !== authId) {
      throw new ForbiddenException("Notification d'un autre utilisateur.");
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { lu: true },
    });

    return { id: updated.id, lu: updated.lu };
  }

  async markAllAsRead(authId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { auth_id: authId, lu: false },
      data: { lu: true },
    });

    return { updated_count: result.count };
  }
}
