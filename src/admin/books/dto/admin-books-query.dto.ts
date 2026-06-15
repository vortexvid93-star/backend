import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StatutLivre, TypeLivre } from '../../../../generated/prisma/enums';

export class AdminBooksQueryDto {
  @IsOptional()
  @IsEnum(StatutLivre)
  statut?: StatutLivre;

  @IsOptional()
  @IsEnum(TypeLivre)
  type_livre?: TypeLivre;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value as boolean | undefined;
  })
  @IsBoolean()
  is_downloadable?: boolean;

  /** Recherche sur le titre du livre. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
