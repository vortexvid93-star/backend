import { IsArray, IsUUID } from 'class-validator';

export class AssignBookCategoriesDto {
  /** Liste complète des catégories (vide = tout retirer). */
  @IsArray()
  @IsUUID('4', { each: true })
  categorie_ids: string[];
}
