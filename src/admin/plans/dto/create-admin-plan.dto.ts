import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PlanType } from '../../../../generated/prisma/enums';
import { MIN_PLAN_PRIX_XAF } from '../admin-plans.constants';

export class CreateAdminPlanDto {
  @IsEnum(PlanType)
  plan: PlanType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_PLAN_PRIX_XAF)
  prix: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  devise?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duree_jours: number;
}
