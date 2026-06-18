import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  StatutCommentaire,
  TypeNotification,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { mapAdminComment } from './admin-comments.mapper';
import type { AdminCommentsQueryDto } from './dto/admin-comments-query.dto';
import type { ModerateCommentDto } from './dto/moderate-comment.dto';

@Injectable()
export class AdminCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async listComments(query: AdminCommentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CommentaireWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.livre_id ? { livre_id: query.livre_id } : {}),
      ...(query.auth_id ? { auth_id: query.auth_id } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.commentaire.findMany({
        where,
        include: {
          livre: { select: { id: true, titre: true } },
          auth: { include: { personne: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commentaire.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminComment),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async moderateComment(id: string, dto: ModerateCommentDto) {
    const comment = await this.prisma.commentaire.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable.');
    }

    const contenuNotif = dto.raison?.trim()
      ? `Votre commentaire a été modéré. Raison : ${dto.raison.trim()}`
      : 'Votre commentaire a été modéré par notre équipe.';

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.commentaire.update({
        where: { id },
        data: { statut: StatutCommentaire.MODERE },
      });

      await tx.notification.create({
        data: {
          auth_id: comment.auth_id,
          type: TypeNotification.SYSTEME,
          titre: 'Commentaire modéré',
          contenu: contenuNotif,
        },
      });

      return row;
    });

    void this.pushService.sendToUser(comment.auth_id, {
      title: 'Commentaire modéré',
      body: contenuNotif,
      data: { type: TypeNotification.SYSTEME },
    });

    return { id: updated.id, statut: updated.statut };
  }

  async republishComment(id: string) {
    const comment = await this.prisma.commentaire.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable.');
    }

    if (comment.statut !== StatutCommentaire.MODERE) {
      throw new BadRequestException(
        'Seuls les commentaires modérés peuvent être republiés.',
      );
    }

    const contenuNotif =
      'Votre commentaire a été republié et est à nouveau visible par les lecteurs.';

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.commentaire.update({
        where: { id },
        data: { statut: StatutCommentaire.PUBLIE },
      });

      await tx.notification.create({
        data: {
          auth_id: comment.auth_id,
          type: TypeNotification.SYSTEME,
          titre: 'Commentaire republié',
          contenu: contenuNotif,
        },
      });

      return row;
    });

    void this.pushService.sendToUser(comment.auth_id, {
      title: 'Commentaire republié',
      body: contenuNotif,
      data: { type: TypeNotification.SYSTEME },
    });

    return { id: updated.id, statut: updated.statut };
  }

  async deleteComment(id: string) {
    const comment = await this.prisma.commentaire.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable.');
    }

    await this.prisma.commentaire.delete({ where: { id } });

    return { message: 'Commentaire supprimé définitivement.' };
  }
}
