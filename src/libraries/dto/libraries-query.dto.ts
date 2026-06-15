import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TypeBibliotheque } from '../../../generated/prisma/enums';

export enum LibrariesSort {
  NOM = 'nom',
  NB_LIVRES = 'nb_livres',
}

export class LibrariesQueryDto {
  /** Recherche sur le nom ou la description de la bibliothèque. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  /** Type de bibliothèque (enum Prisma `TypeBibliotheque`). */
  @IsOptional()
  @IsEnum(TypeBibliotheque)
  type?: TypeBibliotheque;

  /** Tri : par nom ou par nombre de livres. */
  @IsOptional()
  @IsEnum(LibrariesSort)
  sort?: LibrariesSort = LibrariesSort.NOM;

  /** Page (défaut : 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Limite par page (défaut : 20, max : 100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
