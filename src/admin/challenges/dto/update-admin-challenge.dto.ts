import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAdminChallengeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  objectif_valeur?: number;
}
