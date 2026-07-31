import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatutEtablissement } from '../../../../generated/prisma/enums';

export class AdminEtablissementsQueryDto {
  @IsOptional()
  @IsEnum(StatutEtablissement)
  statut?: StatutEtablissement;

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
