import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum ActivityType {
  LIVRE_TERMINE = 'LIVRE_TERMINE',
  BADGE_OBTENU = 'BADGE_OBTENU',
  DEFI_COMPLETE = 'DEFI_COMPLETE',
  COMMENTAIRE = 'COMMENTAIRE',
}

export class ActivityQueryDto {
  /** Filtrer par type d’événement. */
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

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
