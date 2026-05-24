import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatutUserDefi } from '../../../generated/prisma/enums';

export class ChallengesQueryDto {
  /** Filtrer par statut de participation : `EN_COURS`, `TERMINE`, `EXPIRE`, etc. */
  @IsOptional()
  @IsEnum(StatutUserDefi)
  statut?: StatutUserDefi;

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
