import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TypeLivre } from '../../../../generated/prisma/enums';
import { TransformMultipartBoolean } from '../../../common/transforms/parse-multipart-boolean';

export class CreateAdminBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  titre: string;

  @IsEnum(TypeLivre)
  type_livre: TypeLivre;

  /** URL tierce — obligatoire si `type_livre=EXTERNE` (pas de fichier Cloudinary). */
  @ValidateIf((o: CreateAdminBookDto) => o.type_livre === TypeLivre.EXTERNE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  url_externe_livre?: string;

  @IsOptional()
  @TransformMultipartBoolean()
  @IsBoolean()
  is_downloadable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  isbn?: string;

  @IsOptional()
  @IsString()
  resume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  langue?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  annee_publication?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nombre_pages?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  maison_edition?: string;
}
