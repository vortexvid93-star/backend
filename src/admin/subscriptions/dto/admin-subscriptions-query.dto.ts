import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PlanType, StatutAbonnement } from '../../../../generated/prisma/enums';

export class AdminSubscriptionsQueryDto {
  @IsOptional()
  @IsEnum(StatutAbonnement)
  statut?: StatutAbonnement;

  @IsOptional()
  @IsEnum(PlanType)
  plan?: PlanType;

  @IsOptional()
  @IsUUID()
  auth_id?: string;

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
