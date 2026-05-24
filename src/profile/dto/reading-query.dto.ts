import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatutProgression } from '../../../generated/prisma/enums';

export enum ReadingSort {
  DERNIERE_MAJ_DESC = 'derniere_maj_desc',
  DATE_FIN_DESC = 'date_fin_desc',
  POURCENTAGE_DESC = 'pourcentage_desc',
  DATE_DEBUT_DESC = 'date_debut_desc',
}

export class ReadingQueryDto {
  /** Filtrer par statut : en cours, terminé, etc. */
  @IsOptional()
  @IsEnum(StatutProgression)
  statut?: StatutProgression;

  /** Ordre de tri des lectures. */
  @IsOptional()
  @IsEnum(ReadingSort)
  sort?: ReadingSort = ReadingSort.DERNIERE_MAJ_DESC;

  /** Page (défaut : 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Limite (défaut : 20, max : 100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
