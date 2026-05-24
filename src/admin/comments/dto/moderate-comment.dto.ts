import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateCommentDto {
  /** Non persisté en base (schéma sans champ raison) — utilisé pour la notification SYSTEME. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  raison?: string;
}
