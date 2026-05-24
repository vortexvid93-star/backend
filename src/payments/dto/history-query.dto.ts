import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatutPaiement } from '../../../generated/prisma/enums';

export class SubscriptionHistoryQueryDto {
  /** Filtrer par statut de paiement : `EN_ATTENTE`, `VALIDE`, `ECHEC`, etc. */
  @IsOptional()
  @IsEnum(StatutPaiement)
  statut?: StatutPaiement;

  /** Page (défaut : 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Limite (défaut : 20, max : 100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
