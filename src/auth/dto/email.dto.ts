import { IsEmail } from 'class-validator';

export class EmailDto {
  /** Adresse email du compte (identifiant de connexion). */
  @IsEmail()
  email: string;
}
