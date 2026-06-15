import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '../../../profile/dto/activity-query.dto';
import {
  StatutProgression,
  StatutUserDefi,
  TypeDefi,
} from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';
import { RecommandationSchema } from './discovery.schema';
import {
  AbonnementActifSchema,
  PersonneSchema,
  ProfileAuthCoreSchema,
} from './shared.schema';
import { BadgeSummarySchema } from './challenges.schema';

export class ProfileFullSchema extends ProfileAuthCoreSchema {
  @ApiProperty({ type: PersonneSchema }) personne: PersonneSchema;
  @ApiPropertyOptional({ type: AbonnementActifSchema, nullable: true })
  abonnement_actif: AbonnementActifSchema | null;
}

export class DashboardProfileSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty() prenom: string;
  @ApiProperty() nom: string;
  @ApiPropertyOptional({ nullable: true }) photo_profil_url: string | null;
  @ApiProperty() points: number;
  @ApiProperty() email_verified: boolean;
  @ApiPropertyOptional({ type: AbonnementActifSchema, nullable: true })
  abonnement_actif: AbonnementActifSchema | null;
}

export class DashboardLivreEnCoursSchema {
  @ApiProperty({ format: 'uuid' }) livre_id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty() pourcentage: number;
}

export class DashboardStatsSchema {
  @ApiProperty() total_livres_lus: number;
  @ApiProperty() total_duree_lecture_min: number;
  @ApiProperty() total_points: number;
  @ApiProperty() nb_badges_obtenus: number;
  @ApiProperty() nb_defis_completes: number;
  @ApiProperty() livres_en_cours: number;
  @ApiProperty() livres_abandonnes: number;
  @ApiPropertyOptional({ type: DashboardLivreEnCoursSchema, nullable: true })
  livre_en_cours_actuel: DashboardLivreEnCoursSchema | null;
}

export class DashboardProchaineEcheanceSchema {
  @ApiProperty({ format: 'uuid' }) defi_id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty() progression: number;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty() pourcentage: number;
}

export class DashboardDefisSchema {
  @ApiProperty() en_cours: number;
  @ApiProperty() completes: number;
  @ApiProperty() echoques: number;
  @ApiPropertyOptional({
    type: DashboardProchaineEcheanceSchema,
    nullable: true,
  })
  prochaine_echeance: DashboardProchaineEcheanceSchema | null;
}

export class DashboardBadgeRecentSchema {
  @ApiProperty() nom: string;
  @ApiProperty() icone: string;
  @ApiProperty() couleur: string;
  @ApiProperty({ format: 'date-time' }) obtenu_le: string;
}

export class DashboardRecommandationsSchema {
  @ApiProperty() nb_recos_non_vues: number;
  @ApiProperty({ type: [RecommandationSchema] }) picks: RecommandationSchema[];
}

export class ProfileDashboardSchema {
  @ApiProperty({ type: DashboardProfileSchema }) profil: DashboardProfileSchema;
  @ApiProperty({ type: DashboardStatsSchema }) stats: DashboardStatsSchema;
  @ApiProperty({ type: DashboardDefisSchema }) defis: DashboardDefisSchema;
  @ApiProperty() nb_notifications_non_lues: number;
  @ApiProperty({ type: DashboardRecommandationsSchema })
  recommandations: DashboardRecommandationsSchema;
  @ApiPropertyOptional({ type: DashboardBadgeRecentSchema, nullable: true })
  badge_recent: DashboardBadgeRecentSchema | null;
}

export class ReadingLivreBriefSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty() type_livre: string;
  @ApiPropertyOptional({ nullable: true }) nombre_pages: number | null;
}

export class ProfileReadingItemSchema {
  @ApiProperty({ format: 'uuid' }) progression_id: string;
  @ApiProperty({ type: ReadingLivreBriefSchema })
  livre: ReadingLivreBriefSchema;
  @ApiProperty() page_actuelle: number;
  @ApiProperty() pourcentage: number;
  @ApiProperty() duree_lecture_min: number;
  @ApiProperty({ enum: StatutProgression }) statut: StatutProgression;
  @ApiProperty({ format: 'date-time' }) derniere_maj: string;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) date_fin:
    | string
    | null;
}

export class PaginatedProfileReadingSchema {
  @ApiProperty({ type: [ProfileReadingItemSchema] })
  data: ProfileReadingItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class ProfileCompletionSchema {
  @ApiProperty() pourcentage: number;
  @ApiProperty({ type: [String] }) champs_manquants: string[];
  @ApiProperty({ type: [String] }) champs_completes: string[];
  @ApiProperty() total_champs: number;
}

export class ProfileActionCibleSchema {
  @ApiProperty() type: string;
  @ApiProperty() id: string;
}

export class ProfileActionSchema {
  @ApiProperty() code: string;
  @ApiProperty({ enum: ['haute', 'moyenne', 'basse'] }) priorite: string;
  @ApiProperty() titre: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional({ type: ProfileActionCibleSchema })
  cible?: ProfileActionCibleSchema;
}

export class ProfileActionsSchema {
  @ApiProperty({ type: [ProfileActionSchema] }) data: ProfileActionSchema[];
  @ApiProperty() total: number;
}

export class ProfileUpdateResponseSchema {
  @ApiProperty({ type: PersonneSchema }) personne: PersonneSchema;
  @ApiPropertyOptional({ nullable: true }) numero_telephone: string | null;
}

export class ProfilePhotoResponseSchema {
  @ApiProperty() photo_profil_url: string;
  @ApiProperty({ type: PersonneSchema }) personne: PersonneSchema;
}

export class ProfileActivityBadgeBriefSchema {
  @ApiProperty() nom: string;
  @ApiProperty() icone: string;
}

export class ProfileActivityItemSchema {
  @ApiProperty({ enum: ActivityType }) type: ActivityType;
  @ApiProperty({ format: 'date-time' }) date: string;
  @ApiPropertyOptional({ format: 'uuid' }) livre_id?: string;
  @ApiPropertyOptional() titre?: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url?: string | null;
  @ApiPropertyOptional() duree_lecture_min?: number;
  @ApiPropertyOptional({ format: 'uuid' }) badge_id?: string;
  @ApiPropertyOptional() nom?: string;
  @ApiPropertyOptional() icone?: string;
  @ApiPropertyOptional() couleur?: string;
  @ApiPropertyOptional() points?: number;
  @ApiPropertyOptional({ format: 'uuid' }) defi_id?: string;
  @ApiPropertyOptional() points_bonus?: number;
  @ApiPropertyOptional({ type: ProfileActivityBadgeBriefSchema })
  badge?: ProfileActivityBadgeBriefSchema;
  @ApiPropertyOptional({ format: 'uuid' }) commentaire_id?: string;
  @ApiPropertyOptional() livre_titre?: string;
  @ApiPropertyOptional() extrait?: string;
}

export class PaginatedProfileActivitySchema {
  @ApiProperty({ type: [ProfileActivityItemSchema] })
  data: ProfileActivityItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class ProfileCommentLivreSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
}

export class ProfileCommentItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() contenu: string;
  @ApiProperty({ type: ProfileCommentLivreSchema })
  livre: ProfileCommentLivreSchema;
  @ApiProperty({ format: 'date-time' }) cree_le: string;
}

export class PaginatedProfileCommentsSchema {
  @ApiProperty({ type: [ProfileCommentItemSchema] })
  data: ProfileCommentItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class ProfileRatingLivreSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
}

export class ProfileRatingItemSchema {
  @ApiProperty({ type: ProfileRatingLivreSchema })
  livre: ProfileRatingLivreSchema;
  @ApiProperty() valeur: number;
  @ApiProperty({ format: 'date-time' }) note_le: string;
}

export class PaginatedProfileRatingsSchema {
  @ApiProperty({ type: [ProfileRatingItemSchema] })
  data: ProfileRatingItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class ProfileStatsMoisSchema {
  @ApiProperty({ example: '2025-03' }) mois: string;
  @ApiProperty() count: number;
}

export class ProfileStatsCategorieSchema {
  @ApiProperty({ format: 'uuid' }) categorie_id: string;
  @ApiProperty() nom: string;
  @ApiProperty() count: number;
}

export class ProfileStatsReadingResumeSchema {
  @ApiProperty() total_livres_termines: number;
  @ApiProperty() duree_totale_min: number;
  @ApiProperty() duree_moyenne_min: number;
}

export class ProfileStatsReadingSchema {
  @ApiProperty({ type: [ProfileStatsMoisSchema] })
  livres_termines_par_mois: ProfileStatsMoisSchema[];
  @ApiProperty() duree_lecture_totale_min: number;
  @ApiProperty() duree_moyenne_par_livre_termine_min: number;
  @ApiProperty({ type: [ProfileStatsCategorieSchema] })
  top_categories: ProfileStatsCategorieSchema[];
  @ApiProperty() serie_lecture_jours: number;
  @ApiProperty({ type: ProfileStatsReadingResumeSchema })
  resume: ProfileStatsReadingResumeSchema;
}

export class ProfileStatsSocialSchema {
  @ApiProperty() nb_commentaires: number;
  @ApiProperty() nb_notes_donnees: number;
  @ApiPropertyOptional({ nullable: true }) note_moyenne_donnee: number | null;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { 1: 0, 2: 1, 3: 2, 4: 5, 5: 3 },
  })
  distribution_notes: Record<number, number>;
}

/** Réponse de `GET /profile/stats` — agrégat lecture (identique au snapshot dashboard). */
export class ProfileStatsSchema extends DashboardStatsSchema {}

export class ProfileBadgesSummarySchema {
  @ApiProperty() obtenus: number;
  @ApiProperty() total: number;
  @ApiProperty() pourcentage: number;
  @ApiProperty() points_badges: number;
}

export class ProfileOwnedBadgeSchema extends BadgeSummarySchema {
  @ApiPropertyOptional({ nullable: true }) description: string | null;
}

export class ProfileOwnedBadgeItemSchema {
  @ApiProperty({ type: ProfileOwnedBadgeSchema })
  badge: ProfileOwnedBadgeSchema;
  @ApiProperty({ format: 'date-time' }) obtenu_le: string;
}

export class ProfileBadgesListSchema {
  @ApiProperty({ type: [ProfileOwnedBadgeItemSchema] })
  data: ProfileOwnedBadgeItemSchema[];
}

export class ProfileChallengeParticipationSummarySchema {
  @ApiProperty({ format: 'uuid' }) defi_id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty() progression: number;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty() pourcentage: number;
}

export class ProfileChallengesSummarySchema {
  @ApiProperty() en_cours: number;
  @ApiProperty() completes: number;
  @ApiProperty() echoques: number;
  @ApiPropertyOptional({
    type: ProfileChallengeParticipationSummarySchema,
    nullable: true,
  })
  prochaine_echeance: ProfileChallengeParticipationSummarySchema | null;
  @ApiPropertyOptional({
    type: ProfileChallengeParticipationSummarySchema,
    nullable: true,
  })
  defi_plus_avance: ProfileChallengeParticipationSummarySchema | null;
}

export class ProfileMyChallengeBadgeSchema {
  @ApiProperty() nom: string;
  @ApiProperty() icone: string;
}

export class ProfileMyChallengeDefiSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty() points_bonus: number;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty({ type: ProfileMyChallengeBadgeSchema })
  badge: ProfileMyChallengeBadgeSchema;
}

export class ProfileMyChallengeItemSchema {
  @ApiProperty({ type: ProfileMyChallengeDefiSchema })
  defi: ProfileMyChallengeDefiSchema;
  @ApiProperty() progression: number;
  @ApiProperty({ enum: StatutUserDefi }) statut: StatutUserDefi;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  date_completion: string | null;
}

export class PaginatedProfileMyChallengesSchema {
  @ApiProperty({ type: [ProfileMyChallengeItemSchema] })
  data: ProfileMyChallengeItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class ProfileMyParticipationDefiSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty() points_bonus: number;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty({ type: BadgeSummarySchema }) badge: BadgeSummarySchema;
}

export class ProfileMyParticipationSchema {
  @ApiProperty({ type: ProfileMyParticipationDefiSchema })
  defi: ProfileMyParticipationDefiSchema;
  @ApiProperty() progression: number;
  @ApiProperty({ enum: StatutUserDefi }) statut: StatutUserDefi;
  @ApiProperty() pourcentage: number;
  @ApiProperty() jours_restants: number;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  date_completion: string | null;
}
