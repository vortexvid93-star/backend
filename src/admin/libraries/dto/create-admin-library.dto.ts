import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TypeBibliotheque } from '../../../../generated/prisma/enums';

export class CreateAdminLibraryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nom: string;

  @IsEnum(TypeBibliotheque)
  type: TypeBibliotheque;

  @ValidateIf((o: CreateAdminLibraryDto) => o.type === TypeBibliotheque.EXTERNE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  url_externe?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  couverture_url?: string;
}
