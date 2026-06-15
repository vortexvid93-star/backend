import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PlanType as PlanEnum,
  StatutPaiement,
} from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';
import { AbonnementActifSchema } from './shared.schema';

export class PlanItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: PlanEnum }) plan: PlanEnum;
  @ApiProperty() prix: number;
  @ApiProperty() devise: string;
  @ApiProperty() duree_jours: number;
}

export class PlanSummarySchema {
  @ApiProperty({ enum: PlanEnum }) plan: PlanEnum;
  @ApiProperty() prix: number;
  @ApiProperty() devise: string;
  @ApiProperty() duree_jours: number;
}

export class CurrentSubscriptionSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: PlanSummarySchema }) plan: PlanSummarySchema;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty() jours_restants: number;
}

export class SubscriptionSummarySchema {
  @ApiPropertyOptional({ type: CurrentSubscriptionSchema, nullable: true })
  actif: CurrentSubscriptionSchema | null;
  @ApiPropertyOptional({ type: CurrentSubscriptionSchema, nullable: true })
  prochain: CurrentSubscriptionSchema | null;
}

export class SubscriptionHistoryItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: StatutPaiement }) statut_paiement: StatutPaiement;
  @ApiProperty() montant: number;
  @ApiProperty() devise: string;
  @ApiProperty({ format: 'date-time' }) date: string;
  @ApiPropertyOptional({ type: PlanSummarySchema, nullable: true })
  plan: PlanSummarySchema | null;
}

export class PaginatedSubscriptionHistorySchema {
  @ApiProperty({ type: [SubscriptionHistoryItemSchema] })
  data: SubscriptionHistoryItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class PaymentInitSchema {
  @ApiProperty() payment_url: string;
  @ApiProperty() ref_transaction: string;
  @ApiProperty({ format: 'uuid' }) paiement_id: string;
  @ApiPropertyOptional() channel_ussd?: string;
  @ApiPropertyOptional({ enum: StatutPaiement }) statut?: StatutPaiement;
  @ApiPropertyOptional() message?: string;
  @ApiPropertyOptional({ type: Object }) pawapay?: {
    deposit_id?: string;
    initiation_accepted?: boolean;
  };
}

export class PaymentStatusSchema {
  @ApiProperty({ enum: StatutPaiement }) statut: StatutPaiement;
  @ApiProperty() message: string;
  @ApiPropertyOptional({ type: PlanSummarySchema, nullable: true })
  plan: PlanSummarySchema | null;
  @ApiPropertyOptional({ type: AbonnementActifSchema, nullable: true })
  abonnement_lie: AbonnementActifSchema | null;
  @ApiPropertyOptional({ type: AbonnementActifSchema, nullable: true })
  abonnement_actuel: AbonnementActifSchema | null;
}

export class PaymentCheckoutPreviewSchema {
  @ApiProperty({ format: 'uuid' }) plan_id: string;
  @ApiProperty({ enum: PlanEnum }) plan: PlanEnum;
  @ApiProperty() montant: number;
  @ApiProperty() devise: string;
  @ApiPropertyOptional() prorata?: number;
  @ApiPropertyOptional() libelle?: string;
}

export class PaymentPendingItemSchema {
  @ApiProperty() ref_transaction: string;
  @ApiProperty({ enum: StatutPaiement }) statut: StatutPaiement;
  @ApiProperty() montant: number;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class AdminPlanUpdateResponseSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() prix: number;
  @ApiProperty() statut: string;
}

export class PaymentReturnSchema {
  @ApiProperty({ enum: StatutPaiement }) statut: StatutPaiement;
  @ApiProperty() message: string;
  @ApiPropertyOptional() transaction_id?: string;
}
