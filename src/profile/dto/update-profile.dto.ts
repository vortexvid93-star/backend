import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { GenrePersonne } from '../../../generated/prisma/enums';

const E164_REGEX = /^\+[0-9]{8,15}$/;

export class UpdateProfileDto {
  /** Nom de famille. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  /** Prénom. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom?: string;

  /** Date de naissance au format ISO `YYYY-MM-DD`. */
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'date_naissance doit être au format YYYY-MM-DD.' },
  )
  date_naissance?: string;

  /** URL photo (si upload manuel ; préférer `POST /me/photo`). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo_profil_url?: string;

  /** Biographie courte. */
  @IsOptional()
  @IsString()
  bio?: string;

  /** Genre : `M`, `F` ou `AUTRE`. */
  @IsOptional()
  @IsEnum(GenrePersonne, { message: 'genre doit être M, F ou AUTRE.' })
  genre?: GenrePersonne;

  /** Établissement scolaire. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ecole?: string;

  /** Niveau scolaire (ex. Terminale). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  niveau?: string;

  /** Téléphone au format E.164 (ex. `+33612345678`). */
  @IsOptional()
  @Matches(E164_REGEX, {
    message: 'numero_telephone doit être au format E.164 (+XXXXXXXX).',
  })
  numero_telephone?: string;
}
