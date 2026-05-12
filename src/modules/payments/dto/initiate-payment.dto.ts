import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  subscriptionId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  provider?: string;
}
