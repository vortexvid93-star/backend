import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminLibraryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  couverture_url?: string;

  /** Uniquement pour une bibliothèque déjà EXTERNE (contrainte chk_bibliotheque_url). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url_externe?: string;
}
