import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class EmailDto {
  /** Adresse email du compte (identifiant de connexion). */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;
}
