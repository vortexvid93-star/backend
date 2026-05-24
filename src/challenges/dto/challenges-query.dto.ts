import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TypeDefi } from '../../../generated/prisma/enums';

export class ChallengesQueryDto {
  /** Type de défi (lecture, social, etc.). */
  @IsOptional()
  @IsEnum(TypeDefi)
  type?: TypeDefi;

  /** Filtrer les défis liés à une catégorie. */
  @IsOptional()
  @IsUUID()
  categorie_id?: string;

  /** Filtrer les défis liés à un auteur. */
  @IsOptional()
  @IsUUID()
  auteur_id?: string;

  /** Filtrer les défis liés à un livre précis. */
  @IsOptional()
  @IsUUID()
  livre_id?: string;

  /** `true` = seulement ceux où l’utilisateur est inscrit ; `false` = non inscrits. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  inscrit?: boolean;

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
