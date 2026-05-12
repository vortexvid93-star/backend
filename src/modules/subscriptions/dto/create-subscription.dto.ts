import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SubscriptionPlan, SubscriptionPeriod } from '../../subscriptions/entities/subscription.entity';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @IsEnum(SubscriptionPeriod)
  period!: SubscriptionPeriod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
