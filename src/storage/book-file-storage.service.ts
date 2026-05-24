import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import { BOOK_FILE_STORAGE_CONSTANTS } from './book-file-storage.constants';

export interface BookFileUploadResult {
  /** Clé objet R2 — stockée dans livre.cloudinary_public_id (sans migration schéma). */
  objectKey: string;
}

@Injectable()
export class BookFileStorageService implements OnModuleInit {
  private readonly logger = new Logger(BookFileStorageService.name);
  private s3!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const bucket = this.config.get<string>('R2_BUCKET_NAME');

    if (!accountId || !accessKeyId || !secretAccessKey || !endpoint || !bucket) {
      throw new Error(
        'Variables R2 requises : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME.',
      );
    }

    this.bucket = bucket;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.logger.log(`Stockage livres R2 configuré (bucket: ${bucket})`);
  }

  async uploadBookFile(file: Express.Multer.File): Promise<BookFileUploadResult> {
    const extension = extname(file.originalname).toLowerCase();
    const objectKey = `${BOOK_FILE_STORAGE_CONSTANTS.FOLDER}/${randomUUID()}${extension}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: file.buffer,
          ContentType: this.resolveContentType(file),
          ContentLength: file.size,
        }),
      );

      return { objectKey };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'erreur R2 inconnue';
      this.logger.error(`Upload livre R2 échoué (${objectKey}): ${detail}`, error);

      const isDev = this.config.get<string>('NODE_ENV') !== 'production';
      throw new InternalServerErrorException(
        isDev
          ? `Échec de l'upload du fichier livre : ${detail}`
          : "Échec de l'upload du fichier livre.",
      );
    }
  }

  async deleteByObjectKey(objectKey: string | null | undefined): Promise<void> {
    if (!objectKey) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );
    } catch {
      // Objet déjà supprimé ou introuvable
    }
  }

  /** URL présignée GET temporaire pour lecture ou téléchargement. */
  async getSignedDownloadUrl(
    objectKey: string,
    forceDownload = false,
  ): Promise<string> {
    const filename = basename(objectKey);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ...(forceDownload
        ? {
            ResponseContentDisposition: `attachment; filename="${filename}"`,
          }
        : {}),
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: BOOK_FILE_STORAGE_CONSTANTS.SIGNED_URL_SECONDS,
    });
  }

  assertValidBookFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        'Fichier livre requis (champ "file") pour un livre INTERNE.',
      );
    }

    const extension = extname(file.originalname).toLowerCase();
    const mimeAllowed =
      BOOK_FILE_STORAGE_CONSTANTS.ALLOWED_BOOK_MIME_TYPES.includes(
        file.mimetype as (typeof BOOK_FILE_STORAGE_CONSTANTS.ALLOWED_BOOK_MIME_TYPES)[number],
      );
    const extAllowed =
      BOOK_FILE_STORAGE_CONSTANTS.ALLOWED_BOOK_EXTENSIONS.includes(
        extension as (typeof BOOK_FILE_STORAGE_CONSTANTS.ALLOWED_BOOK_EXTENSIONS)[number],
      );

    if (!mimeAllowed && !extAllowed) {
      throw new BadRequestException(
        'Format non supporté. Utilisez PDF, EPUB ou MOBI.',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException(
        'Fichier vide ou non reçu. Dans Postman : Body → form-data → clé « file » → type File.',
      );
    }

    if (file.size > BOOK_FILE_STORAGE_CONSTANTS.MAX_BOOK_FILE_SIZE_BYTES) {
      throw new BadRequestException('Fichier livre trop volumineux (max 50 Mo).');
    }
  }

  private resolveContentType(file: Express.Multer.File): string {
    if (
      file.mimetype &&
      file.mimetype !== 'application/octet-stream'
    ) {
      return file.mimetype;
    }

    switch (extname(file.originalname).toLowerCase()) {
      case '.pdf':
        return 'application/pdf';
      case '.epub':
        return 'application/epub+zip';
      case '.mobi':
        return 'application/x-mobipocket-ebook';
      default:
        return 'application/octet-stream';
    }
  }
}
