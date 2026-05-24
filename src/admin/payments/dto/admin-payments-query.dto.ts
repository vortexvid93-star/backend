import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { StatutPaiement } from '../../../../generated/prisma/enums';

export class AdminPaymentsQueryDto {
  @IsOptional()
  @IsEnum(StatutPaiement)
  statut?: StatutPaiement;

  @IsOptional()
  @IsUUID()
  auth_id?: string;

  @IsOptional()
  @IsUUID()
  plan_id?: string;

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
