import { IsInt, Max, Min } from 'class-validator';

export class ProlongerEtablissementDto {
  @IsInt()
  @Min(1)
  @Max(3650)
  jours_supplementaires: number;
}
