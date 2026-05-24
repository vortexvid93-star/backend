import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminAuteurDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prenom?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
