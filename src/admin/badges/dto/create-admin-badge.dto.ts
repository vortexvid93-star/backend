import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdminBadgeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nom: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'couleur doit être un code hexadécimal (#RRGGBB).',
  })
  couleur: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  points: number;

  @IsOptional()
  @IsString()
  description?: string;
}
