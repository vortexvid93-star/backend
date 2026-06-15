import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { CLOUDINARY_CONSTANTS } from './cloudinary.constants';

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  bytes: number;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL');
    if (!cloudinaryUrl) {
      throw new Error(
        'CLOUDINARY_URL est requis. Ajoutez la variable dans .env (format cloudinary://key:secret@cloud_name).',
      );
    }

    const parsed = this.parseCloudinaryUrl(cloudinaryUrl);
    if (!parsed) {
      throw new Error(
        'CLOUDINARY_URL invalide. Format attendu: cloudinary://key:secret@cloud_name',
      );
    }

    cloudinary.config({
      cloud_name: parsed.cloud_name,
      api_key: parsed.api_key,
      api_secret: parsed.api_secret,
      secure: true,
    });

    this.logger.log(`Cloudinary configuré (cloud: ${parsed.cloud_name})`);
  }

  async uploadBookFile(
    file: Express.Multer.File,
    publicId?: string,
  ): Promise<CloudinaryUploadResult> {
    const key = publicId ?? randomUUID();

    try {
      const result = await this.uploadRawBuffer(file, {
        folder: CLOUDINARY_CONSTANTS.BOOK_FOLDER,
        public_id: key,
        overwrite: true,
      });

      return this.toUploadResult(result);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'erreur Cloudinary inconnue';
      this.logger.error(`Upload livre échoué (${key}): ${detail}`, error);

      const isDev = this.config.get<string>('NODE_ENV') !== 'production';
      throw new InternalServerErrorException(
        isDev
          ? `Échec de l'upload du fichier livre : ${detail}`
          : "Échec de l'upload du fichier livre.",
      );
    }
  }

  async deleteBookByPublicId(
    publicId: string | null | undefined,
  ): Promise<void> {
    if (!publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
      });
    } catch {
      // Fichier déjà supprimé ou introuvable
    }
  }

  async uploadBadgeIcon(
    file: Express.Multer.File,
    badgeId?: string,
  ): Promise<CloudinaryUploadResult> {
    const key = badgeId ?? randomUUID();

    try {
      const result = await this.uploadBuffer(file, {
        folder: CLOUDINARY_CONSTANTS.BADGE_FOLDER,
        public_id: key,
        overwrite: true,
        transformation: [CLOUDINARY_CONSTANTS.BADGE_TRANSFORM],
      });

      return this.toUploadResult(result);
    } catch (error) {
      this.rethrowImageUploadError(error, "l'icône du badge");
    }
  }

  async uploadBookCover(
    file: Express.Multer.File,
    livreId?: string,
  ): Promise<CloudinaryUploadResult> {
    const key = livreId ?? randomUUID();

    try {
      const result = await this.uploadBuffer(file, {
        folder: CLOUDINARY_CONSTANTS.COVER_FOLDER,
        public_id: key,
        overwrite: true,
        transformation: [CLOUDINARY_CONSTANTS.COVER_TRANSFORM],
      });

      return this.toUploadResult(result);
    } catch (error) {
      this.rethrowImageUploadError(error, 'la couverture du livre');
    }
  }

  async uploadProfilePhoto(
    authId: string,
    file: Express.Multer.File,
  ): Promise<CloudinaryUploadResult> {
    const folder = `${CLOUDINARY_CONSTANTS.PROFILE_FOLDER}/${authId}`;

    try {
      const result = await this.uploadBuffer(file, {
        folder,
        public_id: CLOUDINARY_CONSTANTS.PROFILE_PUBLIC_ID,
        overwrite: true,
        transformation: [CLOUDINARY_CONSTANTS.PROFILE_TRANSFORM],
      });

      return this.toUploadResult(result);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'erreur Cloudinary inconnue';
      this.logger.error(`Upload profil échoué (${authId}): ${detail}`, error);

      const isDev = this.config.get<string>('NODE_ENV') !== 'production';
      throw new InternalServerErrorException(
        isDev
          ? `Échec de l'upload de la photo de profil : ${detail}`
          : "Échec de l'upload de la photo de profil.",
      );
    }
  }

  async deleteByUrl(url: string | null | undefined): Promise<void> {
    if (!url || !this.isCloudinaryUrl(url)) return;

    const publicId = this.extractPublicId(url);
    if (!publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    } catch {
      // Ancienne image déjà supprimée ou URL invalide — on ignore
    }
  }

  isCloudinaryUrl(url: string): boolean {
    const cloudName = cloudinary.config().cloud_name;
    if (!cloudName) return url.includes('res.cloudinary.com');
    return url.includes(`res.cloudinary.com/${cloudName}/`);
  }

  /** Signed URL temporaire pour un fichier livre hébergé (RG33 / RG39 / RG40). */
  getSignedBookUrl(publicId: string, forceDownload = false): string {
    const expiresAt =
      Math.floor(Date.now() / 1000) +
      CLOUDINARY_CONSTANTS.BOOK_SIGNED_URL_SECONDS;

    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'upload',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
      ...(forceDownload ? { flags: 'attachment' } : {}),
    });
  }

  extractPublicId(url: string): string | null {
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return null;

    const path = afterUpload
      .split('?')[0]
      .split('/')
      .filter((segment) => !/^v\d+$/.test(segment))
      .join('/')
      .replace(/\.[^/.]+$/, '');

    return path || null;
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
    const mimeAllowed = CLOUDINARY_CONSTANTS.ALLOWED_BOOK_MIME_TYPES.includes(
      file.mimetype as (typeof CLOUDINARY_CONSTANTS.ALLOWED_BOOK_MIME_TYPES)[number],
    );
    const extAllowed = CLOUDINARY_CONSTANTS.ALLOWED_BOOK_EXTENSIONS.includes(
      extension as (typeof CLOUDINARY_CONSTANTS.ALLOWED_BOOK_EXTENSIONS)[number],
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

    if (file.size > CLOUDINARY_CONSTANTS.MAX_BOOK_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        'Fichier livre trop volumineux (max 50 Mo).',
      );
    }
  }

  assertValidImageFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    this.assertValidImageFileWithLabel(file, 'file');
  }

  assertValidBadgeIconFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    this.assertValidImageFileWithLabel(file, 'icone');
  }

  assertValidCoverFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    this.assertValidImageFileWithLabel(file, 'couverture');
  }

  private assertValidImageFileWithLabel(
    file: Express.Multer.File | undefined,
    fieldName: string,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        `Fichier image requis (champ "${fieldName}").`,
      );
    }

    const extension = extname(file.originalname).toLowerCase();
    const mimeAllowed = CLOUDINARY_CONSTANTS.ALLOWED_MIME_TYPES.includes(
      file.mimetype as (typeof CLOUDINARY_CONSTANTS.ALLOWED_MIME_TYPES)[number],
    );
    const extAllowed = CLOUDINARY_CONSTANTS.ALLOWED_EXTENSIONS.includes(
      extension as (typeof CLOUDINARY_CONSTANTS.ALLOWED_EXTENSIONS)[number],
    );

    if (!mimeAllowed && !extAllowed) {
      throw new BadRequestException(
        'Format non supporté. Utilisez JPEG, PNG, WebP ou SVG.',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException(
        `Fichier vide ou non reçu. Dans Postman : form-data → clé « ${fieldName} » → type File.`,
      );
    }

    if (file.size > CLOUDINARY_CONSTANTS.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Image trop volumineuse (max 5 Mo).');
    }
  }

  private rethrowImageUploadError(error: unknown, label: string): never {
    const detail =
      error instanceof Error ? error.message : 'erreur Cloudinary inconnue';
    this.logger.error(`Upload ${label} échoué : ${detail}`, error);

    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    throw new InternalServerErrorException(
      isDev
        ? `Échec de l'upload de ${label} : ${detail}`
        : `Échec de l'upload de ${label}.`,
    );
  }

  private async uploadBuffer(
    file: Express.Multer.File,
    options: Record<string, unknown>,
  ): Promise<UploadApiResponse> {
    const mime =
      file.mimetype === 'application/octet-stream' ||
      file.mimetype === 'image/jpg'
        ? (this.mimeFromExtension(file.originalname) ?? 'image/jpeg')
        : file.mimetype;

    const dataUri = `data:${mime};base64,${file.buffer.toString('base64')}`;

    return cloudinary.uploader.upload(dataUri, {
      resource_type: 'image',
      ...options,
    });
  }

  private async uploadRawBuffer(
    file: Express.Multer.File,
    options: Record<string, unknown>,
  ): Promise<UploadApiResponse> {
    const mime =
      file.mimetype === 'application/octet-stream'
        ? (this.bookMimeFromExtension(file.originalname) ?? file.mimetype)
        : file.mimetype;

    const dataUri = `data:${mime};base64,${file.buffer.toString('base64')}`;

    return cloudinary.uploader.upload(dataUri, {
      resource_type: 'raw',
      ...options,
    });
  }

  private bookMimeFromExtension(filename: string): string | null {
    switch (extname(filename).toLowerCase()) {
      case '.pdf':
        return 'application/pdf';
      case '.epub':
        return 'application/epub+zip';
      case '.mobi':
        return 'application/x-mobipocket-ebook';
      default:
        return null;
    }
  }

  private mimeFromExtension(filename: string): string | null {
    switch (extname(filename).toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.svg':
        return 'image/svg+xml';
      default:
        return null;
    }
  }

  private parseCloudinaryUrl(url: string): {
    api_key: string;
    api_secret: string;
    cloud_name: string;
  } | null {
    const match = url.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!match) return null;
    return {
      api_key: match[1],
      api_secret: match[2],
      cloud_name: match[3],
    };
  }

  private toUploadResult(result: UploadApiResponse): CloudinaryUploadResult {
    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width ?? 0,
      height: result.height ?? 0,
      bytes: result.bytes,
    };
  }
}
