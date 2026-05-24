import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class InitPaymentDto {
  /** UUID du plan d’abonnement à acheter (`GET /plans`). */
  @IsUUID()
  plan_id!: string;

  /** PawaPay : `MTN_MOMO_COG` ou `AIRTEL_COG` (Congo). Sinon déduit du préfixe MSISDN (06→MTN, 05/04→Airtel). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  operator?: string;

  /** MSISDN sans espaces (ex. `242061234567`). Prioritaire sur le profil. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phonenumber?: string;

  /** Code pays ISO (ex. `CG`). Utilisé par PawaPay si besoin. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;
}
