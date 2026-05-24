import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PasswordLoginDto {
  /** Email du compte actif avec mot de passe défini. */
  @IsEmail()
  email: string;

  /** Mot de passe en clair (transmis en HTTPS uniquement). */
  @IsString()
  @MinLength(1)
  password: string;
}

export class AddPasswordDto {
  /** Nouveau mot de passe (8–128 caractères) pour un compte OTP/Google existant. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class ChangePasswordDto {
  /** Mot de passe actuel du compte connecté. */
  @IsString()
  @MinLength(1)
  currentPassword: string;

  /** Nouveau mot de passe (8–128 caractères). */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class PasswordResetConfirmDto {
  /** Email du compte à réinitialiser. */
  @IsEmail()
  email: string;

  /** Code OTP reçu pour la réinitialisation. */
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;

  /** Nouveau mot de passe après validation de l’OTP. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
