import { IsBoolean, IsOptional } from 'class-validator';

export class InteractRecommendationDto {
  /** Marquer la recommandation comme vue (feed « non lues »). */
  @IsOptional()
  @IsBoolean()
  vu?: boolean;

  /** Enregistrer un clic (navigation vers le livre). */
  @IsOptional()
  @IsBoolean()
  clique?: boolean;
}
