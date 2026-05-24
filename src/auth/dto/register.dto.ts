import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  /** Email unique — servira d’identifiant après validation OTP. */
  @IsEmail()
  email: string;

  /** Nom de famille affiché sur le profil. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  /** Prénom affiché sur le profil. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  prenom: string;
}

export class RegisterPasswordDto extends RegisterDto {
  /** Mot de passe (8–128 caractères) enregistré en plus de l’OTP d’activation. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
