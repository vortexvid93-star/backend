import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProgressDto {
  /** Page ou position courante (0 pour le début). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page_actuelle: number;

  /** Durée de la session de lecture en minutes (optionnel, pour les stats). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duree_lecture_min?: number;

  /** Nombre total de pages connu côté client — utilisé quand le livre n'a pas nombre_pages en base. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nombre_pages_hint?: number;
}
