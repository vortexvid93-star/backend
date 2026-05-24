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
import { BooksSort } from '../books-query.builder';

export class BooksCatalogQueryDto {
  /** Recherche texte sur titre, auteur, ISBN, résumé. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;

  /** Filtrer par type : livre audio ou ebook. */
  @IsOptional()
  @IsEnum(TypeLivre)
  type_livre?: TypeLivre;

  /** UUID de la catégorie. */
  @IsOptional()
  @IsUUID()
  categorie_id?: string;

  /** UUID de l’auteur. */
  @IsOptional()
  @IsUUID()
  auteur_id?: string;

  /** Code langue (ex. `fr`, `en`). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  langue?: string;

  /** `true` pour ne lister que les livres téléchargeables. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_downloadable?: boolean;

  /** Restreindre le catalogue à une bibliothèque éditoriale. */
  @IsOptional()
  @IsUUID()
  bibliotheque_id?: string;

  /** Numéro de page (défaut : 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Taille de page (défaut : 20, max : 100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /** Tri : `RECENT`, `TITRE`, `NOTE`, etc. */
  @IsOptional()
  @IsEnum(BooksSort)
  sort?: BooksSort = BooksSort.RECENT;
}
