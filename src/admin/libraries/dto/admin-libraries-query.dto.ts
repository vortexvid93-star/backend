import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  StatutBibliotheque,
  TypeBibliotheque,
} from '../../../../generated/prisma/enums';

export class AdminLibrariesQueryDto {
  @IsOptional()
  @IsEnum(StatutBibliotheque)
  statut?: StatutBibliotheque;

  @IsOptional()
  @IsEnum(TypeBibliotheque)
  type?: TypeBibliotheque;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
