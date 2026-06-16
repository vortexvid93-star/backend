import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePushTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expo_push_token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fcm_push_token?: string;

  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: 'android' | 'ios';
}
