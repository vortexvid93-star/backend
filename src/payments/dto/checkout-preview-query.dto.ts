import { IsUUID } from 'class-validator';

export class CheckoutPreviewQueryDto {
  /** UUID du plan pour lequel calculer l’aperçu tarifaire. */
  @IsUUID()
  plan_id!: string;
}
