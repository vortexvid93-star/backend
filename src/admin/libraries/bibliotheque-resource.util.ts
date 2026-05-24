import { BadRequestException } from '@nestjs/common';
import { TypeBibliotheque } from '../../../generated/prisma/enums';

/** RG28 — contrainte `chk_bibliotheque_url` (schéma Prisma / migration). */
export function assertBibliothequeUrlRules(params: {
  type: TypeBibliotheque;
  url_externe: string | null | undefined;
}): void {
  const url = params.url_externe?.trim() || null;

  if (params.type === TypeBibliotheque.EXTERNE) {
    if (!url) {
      throw new BadRequestException(
        'url_externe est obligatoire pour une bibliothèque EXTERNE.',
      );
    }
    return;
  }

  if (url) {
    throw new BadRequestException(
      'url_externe ne doit pas être envoyé pour une bibliothèque INTERNE.',
    );
  }
}
