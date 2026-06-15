import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MockSimulateDto {
  /** ID de transaction mock à simuler. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  transaction_id!: string;

  /** Résultat simulé : `success`, `failure`, `cancelled` ou `waiting`. */
  @IsIn(['success', 'failure', 'cancelled', 'waiting'])
  outcome!: 'success' | 'failure' | 'cancelled' | 'waiting';

  /** Opérateur mobile money (sandbox). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  operateur?: string;

  /** Numéro de téléphone du payeur (sandbox). */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero_telephone?: string;
}
