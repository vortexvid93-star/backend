import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdminEtablissementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nom: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone_contact?: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  nb_users_max: number;

  @IsPositive()
  prix: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  devise?: string;

  @IsInt()
  @Min(1)
  duree_jours: number;
}
