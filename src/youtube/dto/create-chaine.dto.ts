import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateChaineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^UC[\w-]{22}$/, {
    message: 'channel_id doit commencer par UC et faire 24 caractères (ex : UCxxxxxxxxxxxxxxxxxxxxxx).',
  })
  channel_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail_url?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
