import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthStatut } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(dto: CreateAdminNotificationDto) {
    const titre = dto.titre.trim();
    const contenu = dto.contenu?.trim() || null;
    const authId = dto.auth_id?.trim();

    if (authId) {
      const auth = await this.prisma.auth.findUnique({
        where: { id: authId },
        select: { id: true },
      });
      if (!auth) {
        throw new NotFoundException('Utilisateur introuvable.');
      }

      const notification = await this.prisma.notification.create({
        data: {
          auth_id: authId,
          titre,
          contenu,
          type: dto.type,
        },
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
      data: recipients.map((recipient) => ({
        auth_id: recipient.id,
        titre,
        contenu,
        type: dto.type,
      })),
    });

    return {
      cible: 'TOUS' as const,
      created: result.count,
    };
  }
}
