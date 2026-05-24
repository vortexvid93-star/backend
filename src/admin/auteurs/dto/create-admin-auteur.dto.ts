import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminAuteurDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prenom?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
