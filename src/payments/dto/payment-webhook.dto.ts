import { IsString, MaxLength, MinLength } from 'class-validator';

export class PaymentWebhookDto {
  /** Identifiant de transaction envoyé par le prestataire de paiement. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  transaction_id!: string;
}
