import { IsString, MinLength } from 'class-validator';

export class GoogleTokenDto {
  /** `id_token` JWT renvoyé par Google Sign-In (pas l’access token OAuth classique). */
  @IsString()
  @MinLength(10)
  id_token: string;
}
