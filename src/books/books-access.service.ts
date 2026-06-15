import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  StatutProgression,
  TypeAccesToken,
  TypeLivre,
} from '../../generated/prisma/enums';
import { buildPaginationMeta } from '../common/pagination.util';
import { getTokenLectureRetentionCutoff } from '../common/token-lecture-retention.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BookFileStorageService } from '../storage/book-file-storage.service';
import { isR2BookObjectKey } from '../storage/book-file-storage.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  evaluateBookAccess,
  isRessourceDisponible,
} from './books-access.eligibility';
import { BOOKS_CONSTANTS } from './books.constants';
import { BooksCatalogService } from './books-catalog.service';
import { mapMaProgressionBrief } from './books.mapper';
import type { BookAccessCheckQueryDto } from './dto/book-access-check-query.dto';
import type { BookAccessQueryDto } from './dto/book-access-query.dto';
import type { RecentAccessQueryDto } from './dto/recent-access-query.dto';

@Injectable()
export class BooksAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BooksCatalogService,
    private readonly cloudinary: CloudinaryService,
    private readonly bookStorage: BookFileStorageService,
  ) {}

  async checkAccess(
    authId: string,
    livreId: string,
    query: BookAccessCheckQueryDto,
  ) {
    const livre = await this.catalog.findPublishedBook(livreId);
    const evaluation = await evaluateBookAccess(
      this.prisma,
      authId,
      livre,
      query.type,
    );

    return {
      livre_id: livre.id,
      type_acces_demande: query.type ?? null,
      ...evaluation,
    };
  }

  async getResourceInfo(authId: string, livreId: string) {
    const livre = await this.catalog.findPublishedBook(livreId);
    const evaluation = await evaluateBookAccess(this.prisma, authId, livre);

    const [progression, statistique] = await Promise.all([
      this.prisma.progressionLecture.findUnique({
        where: { auth_id_livre_id: { auth_id: authId, livre_id: livreId } },
      }),
      this.prisma.statistiqueLivre.findUnique({ where: { livre_id: livreId } }),
    ]);

    return {
      livre_id: livre.id,
      titre: livre.titre,
      couverture_url: livre.couverture_url,
      type_livre: livre.type_livre,
      is_downloadable: livre.is_downloadable,
      nombre_pages: livre.nombre_pages,
      langue: livre.langue,
      ressource_disponible: evaluation.ressource_disponible,
      acces_type: evaluation.acces_type,
      peut_lire: evaluation.peut_lire,
      peut_telecharger: evaluation.peut_telecharger,
      raison_blocage: evaluation.raison_blocage,
      codes: evaluation.codes,
      ma_progression: mapMaProgressionBrief(progression),
      nb_ouvertures: statistique?.nb_lectures ?? 0,
    };
  }

  async getActiveAccessToken(
    authId: string,
    livreId: string,
    type?: TypeAccesToken,
  ) {
    await this.catalog.findPublishedBook(livreId);

    const row = await this.prisma.tokenLecture.findFirst({
      where: {
        auth_id: authId,
        livre_id: livreId,
        used: false,
        expires_at: { gt: new Date() },
        ...(type ? { type_acces: type } : {}),
      },
      orderBy: { expires_at: 'desc' },
    });

    if (!row) {
      return {
        token: null,
        expires_at: null,
        type_acces: null,
        stream_url: null,
      };
    }

    const expiresInSec = Math.max(
      0,
      Math.floor((row.expires_at.getTime() - Date.now()) / 1000),
    );

    return {
      token: row.token,
      expires_at: row.expires_at.toISOString(),
      type_acces: row.type_acces,
      expires_in_sec: expiresInSec,
      stream_url: this.buildStreamPath(livreId, row.token),
    };
  }

  async generateAccessToken(
    authId: string,
    livreId: string,
    query: BookAccessQueryDto,
  ) {
    const livre = await this.catalog.findPublishedBook(livreId);
    const evaluation = await evaluateBookAccess(
      this.prisma,
      authId,
      livre,
      query.type,
    );

    if (!evaluation.eligible) {
      throw new ForbiddenException(
        evaluation.raison_blocage ?? 'Accès refusé à ce livre.',
      );
    }

    const typeAcces = query.type;
    const ttlMinutes = this.tokenTtlMinutes(typeAcces);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const token = randomUUID();
    let progressionCreee = false;

    await this.prisma.$transaction(async (tx) => {
      await this.cleanupTokens(tx, authId, livreId);

      const existingProgression = await tx.progressionLecture.findUnique({
        where: { auth_id_livre_id: { auth_id: authId, livre_id: livreId } },
      });

      if (typeAcces === TypeAccesToken.LECTURE && !existingProgression) {
        // createMany + skipDuplicates génère INSERT … ON CONFLICT DO NOTHING (atomique)
        // Résiste aux appels simultanés sans lever d'exception de contrainte unique
        const created = await tx.progressionLecture.createMany({
          data: [
            {
              auth_id: authId,
              livre_id: livreId,
              page_actuelle: 0,
              statut: StatutProgression.EN_COURS,
            },
          ],
          skipDuplicates: true,
        });
        progressionCreee = created.count > 0;

        await tx.statistiqueLivre.upsert({
          where: { livre_id: livreId },
          create: { livre_id: livreId, nb_lectures: 1, nb_lectures_7j: 1 },
          update: {
            nb_lectures: { increment: 1 },
            nb_lectures_7j: { increment: 1 },
          },
        });
      } else if (typeAcces === TypeAccesToken.LECTURE) {
        await tx.statistiqueLivre.upsert({
          where: { livre_id: livreId },
          create: { livre_id: livreId, nb_lectures_7j: 1 },
          update: { nb_lectures_7j: { increment: 1 } },
        });
      }

      await tx.tokenLecture.create({
        data: {
          auth_id: authId,
          livre_id: livreId,
          token,
          type_acces: typeAcces,
          expires_at: expiresAt,
        },
      });
    });

    const statistique = await this.prisma.statistiqueLivre.findUnique({
      where: { livre_id: livreId },
    });

    return this.mapAccessResponse({
      livreId,
      livre,
      token,
      expiresAt,
      typeAcces,
      progressionCreee,
      nbOuvertures: statistique?.nb_lectures ?? null,
    });
  }

  async listRecentAccess(authId: string, query: RecentAccessQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = { auth_id: authId };

    const [rows, total] = await Promise.all([
      this.prisma.tokenLecture.findMany({
        where,
        include: {
          livre: {
            select: {
              id: true,
              titre: true,
              couverture_url: true,
              type_livre: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tokenLecture.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        token_id: row.id,
        livre: row.livre,
        type_acces: row.type_acces,
        used: row.used,
        expires_at: row.expires_at.toISOString(),
        cree_le: row.createdAt.toISOString(),
        stream_url: row.used
          ? null
          : this.buildStreamPath(row.livre_id, row.token),
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async resolveStreamRedirect(
    authId: string,
    livreId: string,
    tokenValue: string,
    validateOnly = false,
  ): Promise<string> {
    const livre = await this.catalog.findPublishedBook(livreId);

    if (!isRessourceDisponible(livre)) {
      throw new NotFoundException('Ressource livre indisponible.');
    }

    const redirectUrl = await this.prisma.$transaction(async (tx) => {
      const tokenRow = await tx.tokenLecture.findFirst({
        where: { token: tokenValue, livre_id: livreId },
      });

      if (!tokenRow) {
        throw new NotFoundException('Token introuvable.');
      }

      if (tokenRow.auth_id !== authId) {
        throw new ForbiddenException('Ce token ne vous appartient pas.');
      }

      if (tokenRow.used) {
        throw new GoneException('Token déjà utilisé.');
      }

      if (tokenRow.expires_at <= new Date()) {
        throw new GoneException('Token expiré.');
      }

      if (validateOnly) {
        return this.resolveResourceUrl(
          livre,
          tokenRow.type_acces,
          tx,
          authId,
          livreId,
          false,
        );
      }

      const marked = await tx.tokenLecture.updateMany({
        where: {
          id: tokenRow.id,
          used: false,
          expires_at: { gt: new Date() },
        },
        data: { used: true },
      });

      if (marked.count === 0) {
        throw new GoneException('Token expiré ou déjà utilisé.');
      }

      return this.resolveResourceUrl(
        livre,
        tokenRow.type_acces,
        tx,
        authId,
        livreId,
        true,
      );
    });

    return redirectUrl;
  }

  buildStreamPath(livreId: string, token: string): string {
    return `/books/${livreId}/stream?token=${encodeURIComponent(token)}`;
  }

  private mapAccessResponse(params: {
    livreId: string;
    livre: { type_livre: TypeLivre; is_downloadable: boolean };
    token: string;
    expiresAt: Date;
    typeAcces: TypeAccesToken;
    progressionCreee: boolean;
    nbOuvertures: number | null;
  }) {
    const expiresInSec = Math.max(
      0,
      Math.floor((params.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      token: params.token,
      expires_at: params.expiresAt.toISOString(),
      expires_in_sec: expiresInSec,
      type_acces: params.typeAcces,
      livre_id: params.livreId,
      type_livre: params.livre.type_livre,
      is_downloadable: params.livre.is_downloadable,
      stream_url: this.buildStreamPath(params.livreId, params.token),
      progression_creee: params.progressionCreee,
      nb_ouvertures: params.nbOuvertures,
    };
  }

  private tokenTtlMinutes(type: TypeAccesToken): number {
    return type === TypeAccesToken.TELECHARGEMENT
      ? BOOKS_CONSTANTS.TOKEN_TTL_TELECHARGEMENT_MINUTES
      : BOOKS_CONSTANTS.TOKEN_TTL_LECTURE_MINUTES;
  }

  private async cleanupTokens(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    authId: string,
    livreId: string,
  ) {
    const now = new Date();
    const retentionCutoff = getTokenLectureRetentionCutoff(now);
    const oneHourAgo = new Date(now);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    await tx.tokenLecture.deleteMany({
      where: {
        auth_id: authId,
        livre_id: livreId,
        createdAt: { lt: retentionCutoff },
      },
    });

    await tx.tokenLecture.deleteMany({
      where: {
        auth_id: authId,
        livre_id: livreId,
        type_acces: TypeAccesToken.TELECHARGEMENT,
        used: false,
        expires_at: { lt: oneHourAgo },
        createdAt: { gte: retentionCutoff },
      },
    });

    const actifs = await tx.tokenLecture.findMany({
      where: {
        auth_id: authId,
        livre_id: livreId,
        used: false,
        expires_at: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
    });

    const excess =
      actifs.length - BOOKS_CONSTANTS.MAX_ACTIVE_TOKENS_PER_BOOK + 1;

    if (excess > 0) {
      const removable = actifs.filter((t) => t.createdAt < retentionCutoff);
      const toRemove = removable.slice(0, excess).map((t) => t.id);
      if (toRemove.length > 0) {
        await tx.tokenLecture.deleteMany({
          where: { id: { in: toRemove } },
        });
      }
    }
  }

  private async resolveResourceUrl(
    livre: Awaited<ReturnType<BooksCatalogService['findPublishedBook']>>,
    typeAcces: TypeAccesToken,
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    authId: string,
    livreId: string,
    persistDownload: boolean,
  ): Promise<string> {
    if (livre.type_livre === TypeLivre.EXTERNE) {
      if (!livre.url_externe_livre) {
        throw new NotFoundException('Ressource livre indisponible.');
      }
      return livre.url_externe_livre;
    }

    if (!livre.cloudinary_public_id) {
      throw new NotFoundException('Ressource livre indisponible.');
    }

    const forceDownload = typeAcces === TypeAccesToken.TELECHARGEMENT;

    if (forceDownload && persistDownload) {
      await tx.progressionLecture.updateMany({
        where: {
          auth_id: authId,
          livre_id: livreId,
          date_telechargement: null,
        },
        data: { date_telechargement: new Date() },
      });
    }

    return this.resolveBookFileUrl(livre.cloudinary_public_id, forceDownload);
  }

  private async resolveBookFileUrl(
    resourceKey: string,
    forceDownload: boolean,
  ): Promise<string> {
    if (isR2BookObjectKey(resourceKey)) {
      return this.bookStorage.getSignedDownloadUrl(resourceKey, forceDownload);
    }
    return this.cloudinary.getSignedBookUrl(resourceKey, forceDownload);
  }
}
