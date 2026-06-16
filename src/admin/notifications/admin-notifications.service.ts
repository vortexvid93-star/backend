import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthStatut } from '../../../generated/prisma/enums';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import type { AdminNotificationsListQueryDto } from './dto/admin-notifications-list.dto';
import type { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';

type NotifGroupRow = {
  id: string;
  titre: string;
  contenu: string | null;
  type: string;
  envoyeLe: Date;
  total_destinataires: bigint;
  nb_lus: bigint;
};

@Injectable()
export class AdminNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async createNotification(dto: CreateAdminNotificationDto) {
    const titre = dto.titre.trim();
    const contenu = dto.contenu?.trim() || null;
    const authId = dto.auth_id?.trim();

    if (authId) {
      const auth = await this.prisma.auth.findUnique({
        where: { id: authId },
        select: { id: true },
      });
      if (!auth) throw new NotFoundException('Utilisateur introuvable.');

      const notification = await this.prisma.notification.create({
        data: {
          auth_id: authId,
          titre,
          contenu,
          type: dto.type,
        },
      });

      void this.pushService.sendToUser(authId, {
        title: titre,
        body: contenu ?? '',
        data: { type: dto.type, notificationId: notification.id },
      });

      return {
        cible: 'UTILISATEUR' as const,
        auth_id: authId,
        created: 1,
        notification_id: notification.id,
      };
    }

    const recipients = await this.prisma.auth.findMany({
      where: { statut: AuthStatut.ACTIF },
      select: { id: true },
    });

    if (recipients.length === 0) {
      throw new BadRequestException('Aucun utilisateur actif à notifier.');
    }

    const result = await this.prisma.notification.createMany({
      data: recipients.map((r) => ({
        auth_id: r.id,
        titre,
        contenu,
        type: dto.type,
      })),
    });

    void this.pushService.sendToMany(
      recipients.map((r) => r.id),
      {
        title: titre,
        body: contenu ?? '',
        data: { type: dto.type },
      },
    );

    return { cible: 'TOUS' as const, created: result.count };
  }

  async listNotifications(query: AdminNotificationsListQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Deux branches séparées pour éviter Prisma.sql/Prisma.empty (non exportés du client généré)
    if (query.type) {
      const t = query.type;
      const rows = await this.prisma.$queryRaw<NotifGroupRow[]>`
        SELECT
          MIN(id::text)                         AS id,
          titre,
          contenu,
          type::text                            AS type,
          date_trunc('minute', "createdAt")     AS "envoyeLe",
          COUNT(*)                              AS total_destinataires,
          COUNT(CASE WHEN lu = TRUE THEN 1 END) AS nb_lus
        FROM notification
        WHERE type::text = ${t}
        GROUP BY titre, contenu, type, date_trunc('minute', "createdAt")
        ORDER BY date_trunc('minute', "createdAt") DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM (
          SELECT 1 FROM notification WHERE type::text = ${t}
          GROUP BY titre, contenu, type, date_trunc('minute', "createdAt")
        ) sq
      `;
      return {
        data: this._mapRows(rows),
        meta: buildPaginationMeta(page, limit, Number(count)),
      };
    }

    const rows = await this.prisma.$queryRaw<NotifGroupRow[]>`
      SELECT
        MIN(id::text)                         AS id,
        titre,
        contenu,
        type::text                            AS type,
        date_trunc('minute', "createdAt")     AS "envoyeLe",
        COUNT(*)                              AS total_destinataires,
        COUNT(CASE WHEN lu = TRUE THEN 1 END) AS nb_lus
      FROM notification
      GROUP BY titre, contenu, type, date_trunc('minute', "createdAt")
      ORDER BY date_trunc('minute', "createdAt") DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ count }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM (
        SELECT 1 FROM notification
        GROUP BY titre, contenu, type, date_trunc('minute', "createdAt")
      ) sq
    `;

    return {
      data: this._mapRows(rows),
      meta: buildPaginationMeta(page, limit, Number(count)),
    };
  }

  async deleteNotificationGroup(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification introuvable.');

    // Supprimer toutes les notifications du même envoi (même contenu + même minute)
    const start = new Date(notif.createdAt);
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + 60_000);

    const result = await this.prisma.notification.deleteMany({
      where: {
        titre: notif.titre,
        contenu: notif.contenu,
        type: notif.type,
        createdAt: { gte: start, lt: end },
      },
    });

    return { deleted: result.count };
  }

  private _mapRows(rows: NotifGroupRow[]) {
    return rows.map((r) => ({
      id: r.id,
      titre: r.titre,
      contenu: r.contenu ?? null,
      type: r.type,
      cible:
        Number(r.total_destinataires) > 1
          ? ('TOUS' as const)
          : ('UTILISATEUR' as const),
      envoyeLe: r.envoyeLe.toISOString(),
      total_destinataires: Number(r.total_destinataires),
      nb_lus: Number(r.nb_lus),
    }));
  }
}
