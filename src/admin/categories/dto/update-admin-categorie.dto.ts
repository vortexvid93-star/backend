import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminCategorieDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
