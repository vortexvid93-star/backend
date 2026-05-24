import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class RateBookDto {
  /** Note de 1 à 5 étoiles. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  valeur: number;
}
