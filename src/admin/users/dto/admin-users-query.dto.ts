import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AuthRole, AuthStatut } from '../../../../generated/prisma/enums';

export class AdminUsersQueryDto {
  /** Filtre sur le statut du compte (`AuthStatut`). */
  @IsOptional()
  @IsEnum(AuthStatut)
  statut?: AuthStatut;

  /** Filtre sur le rôle (`AuthRole`). */
  @IsOptional()
  @IsEnum(AuthRole)
  role?: AuthRole;

  /** Abonnement individuel actif OU membre établissement actif. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value as boolean | undefined;
  })
  @IsBoolean()
  abonnement_actif?: boolean;

  /** Recherche insensible à la casse sur email, nom ou prénom. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

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
