import { IsString, MaxLength, MinLength } from 'class-validator';

export class PaymentStatusQueryDto {
  /** Identifiant de transaction renvoyé par `POST /payments/init`. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  transaction_id: string;
}
