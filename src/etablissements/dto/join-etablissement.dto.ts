import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class JoinEtablissementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;
}
