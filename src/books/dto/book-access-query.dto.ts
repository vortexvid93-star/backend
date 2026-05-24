import { IsEnum } from 'class-validator';
import { TypeAccesToken } from '../../../generated/prisma/enums';

export class BookAccessQueryDto {
  /** Type d’accès à générer : `STREAM` (lecture en ligne) ou `DOWNLOAD` (téléchargement). */
  @IsEnum(TypeAccesToken)
  type: TypeAccesToken;
}
