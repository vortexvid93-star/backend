import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SearchQueryDto {
  /** Terme de recherche (min. 2 caractères). */
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  q: string;

  /** Filtrer par catégorie. */
  @IsOptional()
  @IsUUID()
  categorie_id?: string;

  /** Filtrer par langue. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  langue?: string;

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
