import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthRole,
  StatutCommentaire,
  TypeNotification,
} from '../../generated/prisma/enums';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { BooksCatalogService } from './books-catalog.service';
import { mapComment } from './books.mapper';
import { assertActiveSubscription } from './books-subscription.util';
import type { CommentsQueryDto } from './dto/comments-query.dto';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { RateBookDto } from './dto/rate-book.dto';
import type { ReportCommentDto } from './dto/report-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class BooksSocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BooksCatalogService,
  ) {}

  async listComments(livreId: string, query: CommentsQueryDto) {
    await this.catalog.findPublishedBook(livreId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      livre_id: livreId,
      statut: StatutCommentaire.PUBLIE,
    };

    const [rows, total] = await Promise.all([
      this.prisma.commentaire.findMany({
        where,
        include: { auth: { include: { personne: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commentaire.count({ where }),
    ]);

    return {
      data: rows.map(mapComment),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createComment(authId: string, livreId: string, dto: CreateCommentDto) {
    await assertActiveSubscription(this.prisma, authId);
    await this.catalog.findPublishedBook(livreId);

    const comment = await this.prisma.commentaire.create({
      data: {
        auth_id: authId,
        livre_id: livreId,
        contenu: dto.contenu.trim(),
        statut: StatutCommentaire.PUBLIE,
      },
    });

    return {
      id: comment.id,
      contenu: comment.contenu,
      statut: comment.statut,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async updateComment(
    authId: string,
    livreId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ) {
    await assertActiveSubscription(this.prisma, authId);
    await this.catalog.findPublishedBook(livreId);

    const comment = await this.findOwnPublishedComment(
      authId,
      livreId,
      commentId,
    );

    const updated = await this.prisma.commentaire.update({
      where: { id: comment.id },
      data: { contenu: dto.contenu.trim() },
    });

    return {
      id: updated.id,
      contenu: updated.contenu,
      statut: updated.statut,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteComment(authId: string, livreId: string, commentId: string) {
    await assertActiveSubscription(this.prisma, authId);
    await this.catalog.findPublishedBook(livreId);

    const comment = await this.findOwnPublishedComment(
      authId,
      livreId,
      commentId,
    );

    await this.prisma.commentaire.update({
      where: { id: comment.id },
      data: { statut: StatutCommentaire.SUPPRIME },
    });

    return { message: 'Commentaire supprimé.' };
  }

  /**
   * Signalement d'un commentaire par un utilisateur.
   *
   * Requis par les règles de contenu généré par les utilisateurs (App Store 1.2
   * / Google Play UGC) : chaque signalement crée une alerte pour tous les
   * administrateurs, qui peuvent ensuite modérer via l'espace d'administration.
   */
  async reportComment(
    authId: string,
    livreId: string,
    commentId: string,
    dto: ReportCommentDto,
  ) {
    await this.catalog.findPublishedBook(livreId);

    const comment = await this.prisma.commentaire.findFirst({
      where: {
        id: commentId,
        livre_id: livreId,
        statut: StatutCommentaire.PUBLIE,
      },
      include: { livre: { select: { titre: true } } },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire introuvable.');
    }

    if (comment.auth_id === authId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas signaler votre propre commentaire.',
      );
    }

    const admins = await this.prisma.auth.findMany({
      where: { role: AuthRole.ADMIN },
      select: { id: true },
    });

    if (admins.length > 0) {
      const extrait =
        comment.contenu.length > 160
          ? `${comment.contenu.slice(0, 160)}…`
          : comment.contenu;

      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          auth_id: admin.id,
          type: TypeNotification.ALERTE,
          titre: `Avis signalé — ${dto.motif}`,
          contenu: [
            `Livre : ${comment.livre.titre}`,
            `Commentaire : ${comment.id}`,
            `Auteur du commentaire : ${comment.auth_id}`,
            `Signalé par : ${authId}`,
            dto.details ? `Précisions : ${dto.details}` : null,
            `Extrait : ${extrait}`,
          ]
            .filter(Boolean)
            .join('\n'),
        })),
      });
    }

    return {
      message:
        'Merci, votre signalement a été transmis à notre équipe de modération.',
    };
  }

  async rateBook(authId: string, livreId: string, dto: RateBookDto) {
    await assertActiveSubscription(this.prisma, authId);
    await this.catalog.findPublishedBook(livreId);

    await this.prisma.$transaction(async (tx) => {
      await tx.noter.upsert({
        where: { auth_id_livre_id: { auth_id: authId, livre_id: livreId } },
        create: {
          auth_id: authId,
          livre_id: livreId,
          valeur: dto.valeur,
        },
        update: { valeur: dto.valeur },
      });

      const agg = await tx.noter.aggregate({
        where: { livre_id: livreId },
        _avg: { valeur: true },
        _count: true,
      });

      await tx.statistiqueLivre.upsert({
        where: { livre_id: livreId },
        create: {
          livre_id: livreId,
          note_moyenne: agg._avg.valeur,
          nb_notes: agg._count,
        },
        update: {
          note_moyenne: agg._avg.valeur,
          nb_notes: agg._count,
        },
      });
    });

    const stats = await this.prisma.statistiqueLivre.findUnique({
      where: { livre_id: livreId },
    });

    return {
      valeur: dto.valeur,
      note_moyenne: stats?.note_moyenne ?? null,
      nb_notes: stats?.nb_notes ?? 0,
    };
  }

  private async findOwnPublishedComment(
    authId: string,
    livreId: string,
    commentId: string,
  ) {
    const comment = await this.prisma.commentaire.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.livre_id !== livreId) {
      throw new NotFoundException('Commentaire introuvable.');
    }

    if (comment.auth_id !== authId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres commentaires.',
      );
    }

    if (comment.statut !== StatutCommentaire.PUBLIE) {
      throw new NotFoundException('Commentaire introuvable.');
    }

    return comment;
  }
}
