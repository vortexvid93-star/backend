import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateChaineDto {
  /** Nombre de vidéos les plus récentes à conserver pour cette chaîne —
   * borné pour protéger le quota gratuit YouTube (10 000 unités/jour). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(60)
  max_videos?: number;
}
