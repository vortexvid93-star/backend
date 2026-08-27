import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Motifs de signalement proposés à l'utilisateur. */
export enum MotifSignalement {
  SPAM = 'SPAM',
  HAINE = 'HAINE',
  SEXUEL = 'SEXUEL',
  VIOLENCE = 'VIOLENCE',
  HARCELEMENT = 'HARCELEMENT',
  AUTRE = 'AUTRE',
}

export class ReportCommentDto {
  @IsEnum(MotifSignalement)
  motif!: MotifSignalement;

  /** Précision facultative saisie par l'utilisateur. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
