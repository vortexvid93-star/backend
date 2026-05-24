import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  RaisonRecommandation,
  TypeLivre,
} from '../../../generated/prisma/enums';

export class RecommendationsQueryDto {
  /** Filtrer par raison métier (historique, popularité, similaire…). */
  @IsOptional()
  @IsEnum(RaisonRecommandation)
  raison?: RaisonRecommandation;

  /** Filtrer les recommandations déjà vues. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  vu?: boolean;

  /** Filtrer selon si l’utilisateur a cliqué. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  clique?: boolean;

  /** Score minimum entre 0 et 1. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  score_min?: number;

  /** Filtrer par type de livre. */
  @IsOptional()
  @IsEnum(TypeLivre)
  type_livre?: TypeLivre;

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
