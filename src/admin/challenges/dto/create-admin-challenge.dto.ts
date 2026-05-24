import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TypeDefi } from '../../../../generated/prisma/enums';

export class CreateAdminChallengeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titre: string;

  @IsEnum(TypeDefi)
  type: TypeDefi;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  objectif_valeur: number;

  @IsUUID('4')
  badge_id: string;

  @IsDateString()
  date_debut: string;

  @IsDateString()
  date_fin: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points_bonus?: number;

  @IsOptional()
  @IsUUID('4')
  categorie_id?: string;

  @IsOptional()
  @IsUUID('4')
  auteur_id?: string;

  @IsOptional()
  @IsUUID('4')
  livre_id?: string;
}
