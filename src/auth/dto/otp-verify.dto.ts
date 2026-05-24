import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class OtpVerifyDto {
  /** Email du compte à activer ou connecter. */
  @IsEmail()
  email: string;

  /** Code OTP à 6 chiffres reçu par email. */
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
