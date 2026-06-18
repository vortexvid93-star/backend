import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum AdminActivityType {
  INSCRIPTION = 'INSCRIPTION',
  PAIEMENT = 'PAIEMENT',
}

export class AdminStatsActivityQueryDto {
  @IsOptional()
  @IsIn(['7j', '30j', '90j'])
  periode?: '7j' | '30j' | '90j';

  @IsOptional()
  @IsEnum(AdminActivityType)
  type?: AdminActivityType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
