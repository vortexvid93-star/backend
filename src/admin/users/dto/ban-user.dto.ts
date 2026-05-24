import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BanUserDto {
  /** Raison du bannissement (non persistée — pas de champ en base v2.3). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  raison?: string;
}
