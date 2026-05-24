import { BadRequestException } from '@nestjs/common';
import { TypeLivre } from '../../../generated/prisma/enums';

export interface LivreResourceFields {
  type_livre: TypeLivre;
  cloudinary_public_id: string | null;
  url_externe_livre: string | null;
  is_downloadable: boolean;
}

/** Vérifie la contrainte SQL `chk_livre_type` avant écriture. */
export function assertLivreResourceRules(fields: LivreResourceFields): void {
  const cloudinary = fields.cloudinary_public_id?.trim() || null;
  const urlExterne = fields.url_externe_livre?.trim() || null;

  if (fields.type_livre === TypeLivre.INTERNE) {
    if (!cloudinary) {
      throw new BadRequestException(
        'cloudinary_public_id est requis pour un livre INTERNE.',
      );
    }
    if (urlExterne) {
      throw new BadRequestException(
        'url_externe_livre doit être absent pour un livre INTERNE.',
      );
    }
    return;
  }

  if (!urlExterne) {
    throw new BadRequestException(
      'url_externe_livre est requis pour un livre EXTERNE.',
    );
  }
  if (cloudinary) {
    throw new BadRequestException(
      'cloudinary_public_id doit être absent pour un livre EXTERNE.',
    );
  }
  if (fields.is_downloadable) {
    throw new BadRequestException(
      'is_downloadable doit être false pour un livre EXTERNE.',
    );
  }
}
