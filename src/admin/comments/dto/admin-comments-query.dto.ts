import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { StatutCommentaire } from '../../../../generated/prisma/enums';

export class AdminCommentsQueryDto {
  @IsOptional()
  @IsEnum(StatutCommentaire)
  statut?: StatutCommentaire;

  @IsOptional()
  @IsUUID()
  livre_id?: string;

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
