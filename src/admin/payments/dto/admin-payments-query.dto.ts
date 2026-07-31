import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StatutPaiement } from '../../../../generated/prisma/enums';

export class AdminPaymentsQueryDto {
  @IsOptional()
  @IsEnum(StatutPaiement)
  statut?: StatutPaiement;

  /** Filtre sur `operateur` (recherche partielle — la valeur stockée inclut un suffixe `#depositId` pour PawaPay). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  operateur?: string;

  @IsOptional()
  @IsUUID()
  auth_id?: string;

  @IsOptional()
  @IsUUID()
  plan_id?: string;

  /** Borne basse (incluse) sur `createdAt`, format `YYYY-MM-DD`. Utilisé pour l'export Paiements. */
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  /** Borne haute (incluse, fin de journée) sur `createdAt`, format `YYYY-MM-DD`. Utilisé pour l'export Paiements. */
  @IsOptional()
  @IsDateString()
  dateFin?: string;

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
