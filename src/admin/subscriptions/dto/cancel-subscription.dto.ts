import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelSubscriptionDto {
  /** Archivée dans la notification ABONNEMENT (pas de colonne dédiée en base). */
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  raison!: string;
}
