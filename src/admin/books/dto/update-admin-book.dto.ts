import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAdminBookDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cloudinary_public_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url_externe_livre?: string;

  @IsOptional()
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
}
