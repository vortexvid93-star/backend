import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ExpiringQueryDto {
  /** Fenêtre en jours pour considérer un défi comme « expire bientôt » (défaut : 7, max : 90). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;
}
