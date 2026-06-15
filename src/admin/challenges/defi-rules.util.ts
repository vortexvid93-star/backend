import { BadRequestException } from '@nestjs/common';
import { TypeDefi } from '../../../generated/prisma/enums';

export type DefiTargetIds = {
  categorie_id: string | null;
  auteur_id: string | null;
  livre_id: string | null;
};

export function resolveDefiTargetIds(
  type: TypeDefi,
  ids: {
    categorie_id?: string;
    auteur_id?: string;
    livre_id?: string;
  },
): DefiTargetIds {
  switch (type) {
    case TypeDefi.NB_LIVRES:
    case TypeDefi.DUREE_LECTURE:
      return { categorie_id: null, auteur_id: null, livre_id: null };
    case TypeDefi.CATEGORIE:
      if (!ids.categorie_id) {
        throw new BadRequestException(
          'categorie_id est obligatoire pour un défi de type CATEGORIE.',
        );
      }
      return {
        categorie_id: ids.categorie_id,
        auteur_id: null,
        livre_id: null,
      };
    case TypeDefi.AUTEUR:
      if (!ids.auteur_id) {
        throw new BadRequestException(
          'auteur_id est obligatoire pour un défi de type AUTEUR.',
        );
      }
      return {
        categorie_id: null,
        auteur_id: ids.auteur_id,
        livre_id: null,
      };
    case TypeDefi.LIVRE_SPECIFIQUE:
      if (!ids.livre_id) {
        throw new BadRequestException(
          'livre_id est obligatoire pour un défi de type LIVRE_SPECIFIQUE.',
        );
      }
      return {
        categorie_id: null,
        auteur_id: null,
        livre_id: ids.livre_id,
      };
    default:
      throw new BadRequestException('Type de défi invalide.');
  }
}

export function assertDefiDates(dateDebut: Date, dateFin: Date): void {
  if (dateFin <= dateDebut) {
    throw new BadRequestException(
      'date_fin doit être postérieure à date_debut.',
    );
  }
}

export function assertObjectifPositif(objectif: number): void {
  if (objectif <= 0) {
    throw new BadRequestException(
      'objectif_valeur doit être strictement positif.',
    );
  }
}
