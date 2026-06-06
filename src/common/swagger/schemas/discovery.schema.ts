import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RaisonRecommandation, TypeNotification } from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';
import { AuteurBriefSchema, CategorieBriefSchema } from './shared.schema';
import { TypeLivre } from '../../../../generated/prisma/enums';

export class LivreSearchItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty({ type: [AuteurBriefSchema] }) auteurs: AuteurBriefSchema[];
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
}

export class PaginatedLivreSearchSchema {
  @ApiProperty({ type: [LivreSearchItemSchema] }) data: LivreSearchItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class RecommandationLivreSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
  @ApiProperty() nb_lectures: number;
  @ApiProperty({ type: [AuteurBriefSchema] }) auteurs: AuteurBriefSchema[];
  @ApiProperty({ type: [CategorieBriefSchema] }) categories: CategorieBriefSchema[];
}

export class RecommandationSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: RecommandationLivreSchema }) livre: RecommandationLivreSchema;
  @ApiProperty() score: number;
  @ApiProperty({ enum: RaisonRecommandation }) raison: RaisonRecommandation;
  @ApiProperty() raison_libelle: string;
  @ApiPropertyOptional({ nullable: true }) contexte: string | null;
  @ApiProperty() vu: boolean;
  @ApiProperty() clique: boolean;
}

export class PaginatedRecommandationSchema {
  @ApiProperty({ type: [RecommandationSchema] }) data: RecommandationSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class RecommandationSummarySchema {
  @ApiProperty() total: number;
  @ApiProperty() non_vues: number;
}

export class RecommandationRefreshSchema {
  @ApiProperty() upserted: number;
  @ApiProperty({ type: Object }) summary: Record<string, unknown>;
}

export class RecommandationDismissSchema {
  @ApiProperty() dismissed: number;
}

export class HistoriqueRechercheSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() terme: string;
  @ApiProperty() nb_resultats: number;
  @ApiProperty() a_clique: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class PaginatedHistoriqueRechercheSchema {
  @ApiProperty({ type: [HistoriqueRechercheSchema] }) data: HistoriqueRechercheSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class NotificationSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty() contenu: string;
  @ApiProperty({ enum: TypeNotification }) type: TypeNotification;
  @ApiProperty() lu: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class PaginatedNotificationSchema {
  @ApiProperty({ type: [NotificationSchema] }) data: NotificationSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
  @ApiProperty() unread_count: number;
}

export class NotificationReadAllSchema {
  @ApiProperty() updated: number;
}

export class SearchHistoryClearSchema {
  @ApiProperty() nb_supprimees: number;
}

export class RecommandationMarkAllSeenSchema {
  @ApiProperty() updated: number;
}

export class RecommandationsByReasonSchema {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'array', items: { $ref: '#/components/schemas/RecommandationSchema' } },
  })
  groups: Record<string, RecommandationSchema[]>;
}
