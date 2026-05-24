import { IsArray, IsUUID } from 'class-validator';

export class AssignBookAuthorsDto {
  /** Liste complète des auteurs (vide = tout retirer). */
  @IsArray()
  @IsUUID('4', { each: true })
  auteur_ids: string[];
}
