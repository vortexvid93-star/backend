import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AddLibraryBooksDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  livre_ids: string[];
}
