import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class PayEtablissementDto {
  @IsUUID()
  offre_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nom_etablissement: string;

  @IsEmail()
  @MaxLength(255)
  email_contact: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone_contact?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  phonenumber?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
