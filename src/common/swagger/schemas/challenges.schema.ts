import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StatutDefi,
  StatutUserDefi,
  TypeDefi,
} from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';
import { AuteurBriefSchema, CategorieBriefSchema } from './shared.schema';

export class BadgeSummarySchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiProperty() icone: string;
  @ApiProperty() couleur: string;
  @ApiProperty() points: number;
}

export class ChallengeParticipationBriefSchema {
  @ApiProperty() progression: number;
  @ApiProperty({ enum: StatutUserDefi }) statut: StatutUserDefi;
}

export class ChallengeParticipationSchema extends ChallengeParticipationBriefSchema {
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  date_completion: string | null;
}

export class ChallengeListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty() points_bonus: number;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty({ type: BadgeSummarySchema }) badge: BadgeSummarySchema;
  @ApiPropertyOptional({
    type: ChallengeParticipationBriefSchema,
    nullable: true,
  })
  ma_participation: ChallengeParticipationBriefSchema | null;
}

export class PaginatedChallengeListSchema {
  @ApiProperty({ type: [ChallengeListItemSchema] })
  data: ChallengeListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class ChallengeDetailSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty() points_bonus: number;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty({ type: BadgeSummarySchema }) badge: BadgeSummarySchema;
  @ApiPropertyOptional({ type: CategorieBriefSchema, nullable: true })
  categorie: CategorieBriefSchema | null;
  @ApiPropertyOptional({ type: AuteurBriefSchema, nullable: true })
  auteur: AuteurBriefSchema | null;
  @ApiPropertyOptional({ nullable: true }) livre: {
    id: string;
    titre: string;
  } | null;
  @ApiPropertyOptional({ type: ChallengeParticipationSchema, nullable: true })
  ma_participation: ChallengeParticipationSchema | null;
}

export class ChallengeJoinSchema {
  @ApiProperty({ format: 'uuid' }) defi_id: string;
  @ApiProperty({ enum: StatutUserDefi }) statut: StatutUserDefi;
  @ApiProperty() progression: number;
}

export class BadgeListItemSchema extends BadgeSummarySchema {
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() obtenu: boolean;
}

export class BadgeDetailDefiActifSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
}

export class BadgeDetailSchema extends BadgeListItemSchema {
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) obtenu_le:
    | string
    | null;
  @ApiProperty({ type: [BadgeDetailDefiActifSchema] })
  defis_actifs: BadgeDetailDefiActifSchema[];
}

export class BadgePathParticipationSchema {
  @ApiProperty() progression: number;
  @ApiProperty({ enum: StatutUserDefi }) statut: StatutUserDefi;
  @ApiProperty() pourcentage: number;
}

export class BadgePathDefiSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: StatutDefi }) statut_defi: StatutDefi;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiPropertyOptional({ type: BadgePathParticipationSchema, nullable: true })
  participation: BadgePathParticipationSchema | null;
}

export class BadgePathHistoriqueSchema {
  @ApiProperty({ format: 'uuid' }) defi_id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  date_completion: string | null;
}

export class BadgePathSchema {
  @ApiProperty({ type: BadgeSummarySchema }) badge: BadgeSummarySchema;
  @ApiProperty() obtenu: boolean;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) obtenu_le:
    | string
    | null;
  @ApiProperty({ type: [BadgePathDefiSchema] }) defis: BadgePathDefiSchema[];
  @ApiProperty({ type: [BadgePathHistoriqueSchema] })
  defis_completes_historique: BadgePathHistoriqueSchema[];
}

export class BadgeNextDefiBriefSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
}

export class BadgeNextItemSchema {
  @ApiProperty({ type: BadgeSummarySchema }) badge: BadgeSummarySchema;
  @ApiProperty({ type: BadgeNextDefiBriefSchema })
  defi: BadgeNextDefiBriefSchema;
  @ApiProperty() pourcentage: number;
  @ApiPropertyOptional() progression?: number;
  @ApiPropertyOptional() objectif_valeur?: number;
  @ApiProperty() message: string;
}

export class BadgeNextResponseSchema {
  @ApiPropertyOptional({ type: BadgeNextItemSchema, nullable: true })
  prochain: BadgeNextItemSchema | null;
}

export class ChallengeStatsSchema {
  @ApiProperty({ format: 'uuid' }) defi_id: string;
  @ApiProperty() nb_participants: number;
  @ApiProperty() nb_completions: number;
  @ApiProperty() taux_completion: number;
}

export class ChallengeProgressActionCibleSchema {
  @ApiProperty() type: string;
  @ApiProperty() id: string;
}

export class ChallengeProgressActionSchema {
  @ApiProperty() code: string;
  @ApiProperty() message: string;
  @ApiPropertyOptional({ type: ChallengeProgressActionCibleSchema })
  cible?: ChallengeProgressActionCibleSchema;
}

export class ChallengeProgressSchema {
  @ApiProperty({ format: 'uuid' }) defi_id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty() jours_restants: number;
  @ApiProperty() inscrit: boolean;
  @ApiPropertyOptional({ type: ChallengeParticipationSchema, nullable: true })
  participation: ChallengeParticipationSchema | null;
  @ApiProperty() pourcentage: number;
  @ApiProperty({ type: ChallengeProgressActionSchema })
  prochaine_action: ChallengeProgressActionSchema;
  @ApiProperty({ type: BadgeSummarySchema }) badge: BadgeSummarySchema;
}

export class PaginatedBadgeListSchema {
  @ApiProperty({ type: [BadgeListItemSchema] }) data: BadgeListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class GamificationOverviewSchema {
  @ApiProperty() points: number;
  @ApiProperty({ type: [ChallengeListItemSchema] })
  defis_actifs: ChallengeListItemSchema[];
  @ApiProperty({ type: [BadgeSummarySchema] })
  badges_recents: BadgeSummarySchema[];
  @ApiPropertyOptional({ type: BadgeSummarySchema, nullable: true })
  prochain_badge: BadgeSummarySchema | null;
}
