import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecommendationsRefreshDto {
  /** Nombre de nouvelles recommandations à générer (5–100 ; défaut côté service si omis). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  limit?: number;
}
