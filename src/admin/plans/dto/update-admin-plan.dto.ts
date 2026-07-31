import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { StatutPlan } from '../../../../generated/prisma/enums';
import { MIN_PLAN_PRIX_XAF } from '../admin-plans.constants';

export class UpdateAdminPlanDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_PLAN_PRIX_XAF)
  prix?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duree_jours?: number;

  @IsOptional()
  @IsEnum(StatutPlan)
  statut?: StatutPlan;
}
