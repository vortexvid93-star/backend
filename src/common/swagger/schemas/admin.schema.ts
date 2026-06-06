import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthProvider,
  AuthRole,
  AuthStatut,
  PlanType,
  StatutAbonnement,
  StatutCommentaire,
  StatutDefi,
  StatutLivre,
  StatutPaiement,
  StatutBibliotheque,
  StatutUserDefi,
  TypeBibliotheque,
  TypeDefi,
  TypeLivre,
  TypeRenouvellement,
} from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';
import { AbonnementActifSchema, AuteurBriefSchema, CategorieBriefSchema } from './shared.schema';

export class AdminBookListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) isbn: string | null;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty() is_downloadable: boolean;
  @ApiProperty({ enum: StatutLivre }) statut: StatutLivre;
  @ApiPropertyOptional({ nullable: true }) langue: string | null;
  @ApiProperty() nb_lectures: number;
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
  @ApiProperty({ type: [AuteurBriefSchema] }) auteurs: AuteurBriefSchema[];
  @ApiProperty({ type: [CategorieBriefSchema] }) categories: CategorieBriefSchema[];
}

export class PaginatedAdminBookListSchema {
  @ApiProperty({ type: [AdminBookListItemSchema] }) data: AdminBookListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminUserListPersonneSchema {
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
  @ApiProperty() points: number;
}

export class AdminUserListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ enum: AuthRole }) role: AuthRole;
  @ApiProperty({ enum: AuthStatut }) statut: AuthStatut;
  @ApiProperty({ enum: AuthProvider }) auth_provider: AuthProvider;
  @ApiProperty() email_verified: boolean;
  @ApiProperty({ format: 'date-time' }) date_inscription: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) derniere_connexion: string | null;
  @ApiProperty({ type: AdminUserListPersonneSchema }) personne: AdminUserListPersonneSchema;
  @ApiPropertyOptional({ type: AbonnementActifSchema, nullable: true })
  abonnement_actif: AbonnementActifSchema | null;
}

export class PaginatedAdminUserListSchema {
  @ApiProperty({ type: [AdminUserListItemSchema] }) data: AdminUserListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminUserDetailAuthSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ enum: AuthRole }) role: AuthRole;
  @ApiProperty({ enum: AuthStatut }) statut: AuthStatut;
  @ApiProperty({ enum: AuthProvider }) auth_provider: AuthProvider;
  @ApiProperty() email_verified: boolean;
  @ApiProperty({ format: 'date-time' }) date_inscription: string;
  @ApiPropertyOptional({ nullable: true }) numero_telephone: string | null;
}

export class AdminUserDetailPersonneSchema {
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
  @ApiPropertyOptional({ nullable: true }) bio: string | null;
  @ApiPropertyOptional({ nullable: true }) ecole: string | null;
  @ApiPropertyOptional({ nullable: true }) niveau: string | null;
  @ApiProperty() points: number;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) deleted_at: string | null;
}

export class AdminUserDetailAbonnementSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) paiement_id: string | null;
  @ApiProperty({ enum: PlanType }) plan: PlanType;
  @ApiProperty({ format: 'uuid' }) plan_id: string;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty({ enum: StatutAbonnement }) statut: StatutAbonnement;
  @ApiProperty({ enum: TypeRenouvellement }) type_renouvellement: TypeRenouvellement;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class AdminUserDetailPaiementSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: PlanType }) plan: PlanType;
  @ApiProperty({ format: 'uuid' }) plan_id: string;
  @ApiProperty() montant: number;
  @ApiProperty() devise: string;
  @ApiProperty() operateur: string;
  @ApiPropertyOptional({ nullable: true }) numero_telephone: string | null;
  @ApiProperty() ref_transaction: string;
  @ApiProperty({ enum: StatutPaiement }) statut: StatutPaiement;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class AdminUserDetailSchema {
  @ApiProperty({ type: AdminUserDetailAuthSchema }) auth: AdminUserDetailAuthSchema;
  @ApiProperty({ type: AdminUserDetailPersonneSchema }) personne: AdminUserDetailPersonneSchema;
  @ApiPropertyOptional({ type: [AdminUserDetailAbonnementSchema] }) abonnements?: AdminUserDetailAbonnementSchema[];
  @ApiPropertyOptional({ type: [AdminUserDetailPaiementSchema] }) paiements?: AdminUserDetailPaiementSchema[];
}

export class AdminPaymentAuthBriefSchema {
  @ApiProperty({ format: 'email' }) email: string;
}

export class AdminPaymentPlanBriefSchema {
  @ApiProperty({ enum: PlanType }) plan: PlanType;
  @ApiProperty() prix: number;
}

export class AdminPaymentListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() ref_transaction: string;
  @ApiProperty({ enum: StatutPaiement }) statut: StatutPaiement;
  @ApiProperty() montant: number;
  @ApiProperty() devise: string;
  @ApiPropertyOptional({ nullable: true }) operateur: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: AdminPaymentAuthBriefSchema }) auth: AdminPaymentAuthBriefSchema;
  @ApiProperty({ type: AdminPaymentPlanBriefSchema }) plan: AdminPaymentPlanBriefSchema;
}

export class PaginatedAdminPaymentListSchema {
  @ApiProperty({ type: [AdminPaymentListItemSchema] }) data: AdminPaymentListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminStatsTopLivreSchema {
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty() nb_lectures: number;
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
}

export class AdminStatsDashboardSchema {
  @ApiProperty() nb_utilisateurs_actifs: number;
  @ApiProperty() nb_abonnements_actifs: number;
  @ApiProperty() revenue_mois_courant: number;
  @ApiProperty() nb_livres_publies: number;
  @ApiProperty() nb_lectures_7j: number;
  @ApiProperty() nb_inscriptions_7j: number;
  @ApiProperty() nb_paiements_succes_7j: number;
  @ApiProperty({ type: [AdminStatsTopLivreSchema] }) top_5_livres: AdminStatsTopLivreSchema[];
}

/** Alias historique — même forme que `AdminStatsDashboardSchema`. */
export class AdminDashboardSchema extends AdminStatsDashboardSchema {}

export class AdminStatsBookLivreSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty({ enum: StatutLivre }) statut: StatutLivre;
}

export class AdminStatsBookListItemSchema {
  @ApiProperty({ type: AdminStatsBookLivreSchema }) livre: AdminStatsBookLivreSchema;
  @ApiProperty() nb_lectures: number;
  @ApiProperty() nb_terminees: number;
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
  @ApiProperty() nb_notes: number;
  @ApiProperty() nb_lectures_7j: number;
}

export class PaginatedAdminStatsBooksSchema {
  @ApiProperty({ type: [AdminStatsBookListItemSchema] }) data: AdminStatsBookListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

/** @deprecated Utiliser PaginatedAdminStatsBooksSchema */
export class AdminStatsBooksSchema extends PaginatedAdminStatsBooksSchema {}

export class AdminStatsInscriptionJourSchema {
  @ApiProperty({ format: 'date' }) date: string;
  @ApiProperty() count: number;
}

export class AdminStatsUsersSchema {
  @ApiProperty({ type: [AdminStatsInscriptionJourSchema] })
  inscriptions_par_jour: AdminStatsInscriptionJourSchema[];
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { LOCAL: 12, GOOGLE: 5, HYBRID: 1 },
  })
  repartition_provider: Record<AuthProvider, number>;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { PENDING: 2, ACTIF: 14, BANNI: 0 },
  })
  repartition_statut: Record<AuthStatut, number>;
  @ApiProperty() taux_activation: number;
  @ApiProperty() nb_abonnes_actifs: number;
}

export class AdminStatsSearchTermItemSchema {
  @ApiProperty() terme: string;
  @ApiProperty() nb_recherches: number;
  @ApiProperty() taux_clic: number;
  @ApiProperty() nb_resultats_moyen: number;
}

export class AdminStatsSearchTermSansResultatSchema {
  @ApiProperty() terme: string;
  @ApiProperty() nb_recherches: number;
}

export class AdminStatsSearchTermsSchema {
  @ApiProperty({ type: [AdminStatsSearchTermItemSchema] }) data: AdminStatsSearchTermItemSchema[];
  @ApiProperty({ type: [AdminStatsSearchTermSansResultatSchema] })
  top_sans_resultats: AdminStatsSearchTermSansResultatSchema[];
}

export class AdminAuteurListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiPropertyOptional({ nullable: true }) prenom: string | null;
  @ApiPropertyOptional({ nullable: true }) bio: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class PaginatedAdminAuteurListSchema {
  @ApiProperty({ type: [AdminAuteurListItemSchema] }) data: AdminAuteurListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminCategorieListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() nb_livres: number;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class PaginatedAdminCategorieListSchema {
  @ApiProperty({ type: [AdminCategorieListItemSchema] }) data: AdminCategorieListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminCommentLivreBriefSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
}

export class AdminCommentAuteurBriefSchema {
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
}

export class AdminCommentListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() contenu: string;
  @ApiProperty({ enum: StatutCommentaire }) statut: StatutCommentaire;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: AdminCommentLivreBriefSchema }) livre: AdminCommentLivreBriefSchema;
  @ApiProperty({ type: AdminCommentAuteurBriefSchema }) auteur: AdminCommentAuteurBriefSchema;
}

export class PaginatedAdminCommentListSchema {
  @ApiProperty({ type: [AdminCommentListItemSchema] }) data: AdminCommentListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminSubscriptionPlanBriefSchema {
  @ApiProperty({ enum: PlanType }) plan: PlanType;
  @ApiProperty() prix: number;
}

export class AdminSubscriptionAuthPersonneSchema {
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
}

export class AdminSubscriptionAuthBriefSchema {
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ type: AdminSubscriptionAuthPersonneSchema }) personne: AdminSubscriptionAuthPersonneSchema;
}

export class AdminSubscriptionListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: AdminSubscriptionPlanBriefSchema }) plan: AdminSubscriptionPlanBriefSchema;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty({ enum: StatutAbonnement }) statut: StatutAbonnement;
  @ApiProperty({ enum: TypeRenouvellement }) type_renouvellement: TypeRenouvellement;
  @ApiProperty({ type: AdminSubscriptionAuthBriefSchema }) auth: AdminSubscriptionAuthBriefSchema;
}

export class PaginatedAdminSubscriptionListSchema {
  @ApiProperty({ type: [AdminSubscriptionListItemSchema] }) data: AdminSubscriptionListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminLibraryListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiProperty({ enum: TypeBibliotheque }) type: TypeBibliotheque;
  @ApiProperty({ enum: StatutBibliotheque }) statut: StatutBibliotheque;
  @ApiProperty() nb_livres: number;
  @ApiPropertyOptional({ nullable: true }) url_externe: string | null;
}

export class PaginatedAdminLibraryListSchema {
  @ApiProperty({ type: [AdminLibraryListItemSchema] }) data: AdminLibraryListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminBadgeListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiProperty() icone: string;
  @ApiProperty() couleur: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() points: number;
  @ApiProperty() nb_utilisateurs: number;
}

export class PaginatedAdminBadgeListSchema {
  @ApiProperty({ type: [AdminBadgeListItemSchema] }) data: AdminBadgeListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminChallengeBadgeBriefSchema {
  @ApiProperty() nom: string;
  @ApiProperty() icone: string;
}

export class AdminChallengeListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty({ enum: TypeDefi }) type: TypeDefi;
  @ApiProperty({ enum: StatutDefi }) statut: StatutDefi;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty() objectif_valeur: number;
  @ApiProperty() points_bonus: number;
  @ApiProperty() nb_participants: number;
  @ApiProperty({ type: AdminChallengeBadgeBriefSchema }) badge: AdminChallengeBadgeBriefSchema;
}

export class PaginatedAdminChallengeListSchema {
  @ApiProperty({ type: [AdminChallengeListItemSchema] }) data: AdminChallengeListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminChallengeParticipantPersonneSchema {
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
}

export class AdminChallengeParticipantAuthSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ type: AdminChallengeParticipantPersonneSchema })
  personne: AdminChallengeParticipantPersonneSchema;
}

export class AdminChallengeParticipantItemSchema {
  @ApiProperty({ type: AdminChallengeParticipantAuthSchema }) auth: AdminChallengeParticipantAuthSchema;
  @ApiProperty() progression: number;
  @ApiProperty({ enum: StatutUserDefi }) statut: StatutUserDefi;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) date_completion: string | null;
}

export class PaginatedAdminChallengeParticipantsSchema {
  @ApiProperty({ type: [AdminChallengeParticipantItemSchema] })
  data: AdminChallengeParticipantItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

/** @deprecated Remplacer par un schéma paginé typé par ressource. */
export class PaginatedAdminGenericSchema {
  @ApiProperty({ type: [Object] }) data: Record<string, unknown>[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class AdminBookCategoriesResponseSchema {
  @ApiProperty({ type: [CategorieBriefSchema] }) categories: CategorieBriefSchema[];
}

export class AdminBookAuthorsResponseSchema {
  @ApiProperty({ type: [AuteurBriefSchema] }) auteurs: AuteurBriefSchema[];
}

export class AdminBadgeCreateSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() icone: string;
}

export class AdminChallengeCreateSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
}

export class AdminChallengeCancelSchema {
  @ApiProperty() statut: string;
  @ApiProperty() nb_utilisateurs_echoues: number;
}

export class AdminNotificationCreateSchema {
  @ApiProperty({ enum: ['UTILISATEUR', 'TOUS'] }) cible: string;
  @ApiProperty() created: number;
  @ApiPropertyOptional({ format: 'uuid' }) auth_id?: string;
  @ApiPropertyOptional({ format: 'uuid' }) notification_id?: string;
}
