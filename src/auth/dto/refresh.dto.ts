import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  /** Refresh token obtenu au login — à renvoyer sur refresh et logout. */
  @IsString()
  @MinLength(10)
  refresh_token: string;
}
