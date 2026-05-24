import { IsEnum, IsOptional } from 'class-validator';
import { TypeAccesToken } from '../../../generated/prisma/enums';

export class BookAccessCheckQueryDto {
  /** Type d’accès à vérifier ; si omis, vérifie les deux types selon la logique métier. */
  @IsOptional()
  @IsEnum(TypeAccesToken)
  type?: TypeAccesToken;
}
