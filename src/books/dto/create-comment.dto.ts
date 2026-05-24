import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  /** Texte du commentaire (max. 5000 caractères). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  contenu: string;
}
