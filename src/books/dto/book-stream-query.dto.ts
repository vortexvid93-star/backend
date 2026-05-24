import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class BookStreamQueryDto {
  /** Jeton d’accès obtenu via `POST /books/:id/access`. */
  @IsUUID()
  token: string;

  /** Si `true` : vérifie le token sans redirection 302 (réponse JSON de test). */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  validate?: boolean;
}
