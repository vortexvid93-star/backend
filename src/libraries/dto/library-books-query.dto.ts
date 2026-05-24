import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TypeLivre } from '../../../generated/prisma/enums';
import { BooksSort } from '../../books/books-query.builder';

export class LibraryBooksQueryDto {
  /** Recherche sur métadonnées (titre, ISBN, résumé, langue, auteurs). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;

  /** Filtrer par type audio ou ebook. */
  @IsOptional()
  @IsEnum(TypeLivre)
  type_livre?: TypeLivre;

  /** UUID catégorie dans cette bibliothèque. */
  @IsOptional()
  @IsUUID()
  categorie_id?: string;

  /** UUID auteur. */
  @IsOptional()
  @IsUUID()
  auteur_id?: string;

  /** Code langue. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  langue?: string;

  /** Uniquement les livres téléchargeables si `true`. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_downloadable?: boolean;

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

  /** Tri du catalogue. */
  @IsOptional()
  @IsEnum(BooksSort)
  sort?: BooksSort = BooksSort.RECENT;
}
