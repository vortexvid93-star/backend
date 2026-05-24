import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminCategorieDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;
}
