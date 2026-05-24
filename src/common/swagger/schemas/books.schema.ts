import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StatutProgression,
  TypeAccesToken,
  TypeLivre,
} from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';
import {
  AuteurBriefSchema,
  AuteurDetailSchema,
  CategorieBriefSchema,
} from './shared.schema';

export class LivreCatalogItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) isbn: string | null;
  @ApiPropertyOptional({ nullable: true }) resume: string | null;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty() is_downloadable: boolean;
  @ApiPropertyOptional({ nullable: true }) langue: string | null;
  @ApiPropertyOptional({ nullable: true }) annee_publication: number | null;
  @ApiPropertyOptional({ nullable: true }) nombre_pages: number | null;
  @ApiProperty({ type: [AuteurBriefSchema] }) auteurs: AuteurBriefSchema[];
  @ApiProperty({ type: [CategorieBriefSchema] }) categories: CategorieBriefSchema[];
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
  @ApiProperty() nb_lectures: number;
  @ApiPropertyOptional() nb_lectures_7j?: number;
}

export class PaginatedLivreCatalogSchema {
  @ApiProperty({ type: [LivreCatalogItemSchema] }) data: LivreCatalogItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class MaProgressionBriefSchema {
  @ApiProperty() page_actuelle: number;
  @ApiProperty() pourcentage: number;
  @ApiProperty({ enum: StatutProgression }) statut: StatutProgression;
  @ApiProperty({ format: 'date-time' }) derniere_maj: string;
}

export class LivreLibraryItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) isbn: string | null;
  @ApiPropertyOptional({ nullable: true }) resume: string | null;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty() is_downloadable: boolean;
  @ApiPropertyOptional({ nullable: true }) langue: string | null;
  @ApiPropertyOptional({ nullable: true }) annee_publication: number | null;
  @ApiPropertyOptional({ nullable: true }) nombre_pages: number | null;
  @ApiProperty({ type: [AuteurBriefSchema] }) auteurs: AuteurBriefSchema[];
  @ApiProperty({ type: [CategorieBriefSchema] }) categories: CategorieBriefSchema[];
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
  @ApiProperty() nb_lectures: number;
}

export class LivreLibraryItemWithProgressSchema extends LivreLibraryItemSchema {
  @ApiPropertyOptional({ type: MaProgressionBriefSchema, nullable: true })
  ma_progression: MaProgressionBriefSchema | null;
}

export class PaginatedLivreLibrarySchema {
  @ApiProperty({ type: [LivreLibraryItemWithProgressSchema] })
  data: LivreLibraryItemWithProgressSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class LivreStatistiquesSchema {
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
  @ApiProperty() nb_notes: number;
  @ApiProperty() nb_lectures: number;
  @ApiProperty() nb_terminees: number;
}

export class LivreAccesSchema {
  @ApiProperty() peut_lire: boolean;
  @ApiProperty() peut_telecharger: boolean;
  @ApiPropertyOptional({ nullable: true }) raison_blocage: string | null;
  @ApiProperty() ressource_disponible: boolean;
  @ApiProperty() acces_type: string;
}

export class LivreDetailSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) isbn: string | null;
  @ApiPropertyOptional({ nullable: true }) resume: string | null;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty() is_downloadable: boolean;
  @ApiPropertyOptional({ nullable: true }) langue: string | null;
  @ApiPropertyOptional({ nullable: true }) annee_publication: number | null;
  @ApiPropertyOptional({ nullable: true }) nombre_pages: number | null;
  @ApiProperty({ type: [AuteurDetailSchema] }) auteurs: AuteurDetailSchema[];
  @ApiProperty({ type: [CategorieBriefSchema] }) categories: CategorieBriefSchema[];
  @ApiProperty({ type: LivreStatistiquesSchema }) statistiques: LivreStatistiquesSchema;
  @ApiPropertyOptional({ type: MaProgressionBriefSchema, nullable: true })
  ma_progression: MaProgressionBriefSchema | null;
  @ApiPropertyOptional({ nullable: true }) ma_note: number | null;
  @ApiPropertyOptional({ type: LivreAccesSchema, nullable: true }) acces: LivreAccesSchema | null;
}

export class BookAccessCheckSchema {
  @ApiProperty({ format: 'uuid' }) livre_id: string;
  @ApiPropertyOptional({ enum: TypeAccesToken, nullable: true }) type_acces_demande: TypeAccesToken | null;
  @ApiProperty() peut_lire: boolean;
  @ApiProperty() peut_telecharger: boolean;
  @ApiProperty() eligible: boolean;
  @ApiProperty({ type: [String] }) codes: string[];
  @ApiPropertyOptional({ nullable: true }) raison_blocage: string | null;
  @ApiProperty() ressource_disponible: boolean;
  @ApiProperty() acces_type: string;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty() is_downloadable: boolean;
}

export class BookResourceInfoSchema {
  @ApiProperty({ format: 'uuid' }) livre_id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
  @ApiProperty() is_downloadable: boolean;
  @ApiPropertyOptional({ nullable: true }) nombre_pages: number | null;
  @ApiPropertyOptional({ nullable: true }) langue: string | null;
  @ApiProperty() ressource_disponible: boolean;
  @ApiProperty() acces_type: string;
  @ApiProperty() peut_lire: boolean;
  @ApiProperty() peut_telecharger: boolean;
  @ApiPropertyOptional({ nullable: true }) raison_blocage: string | null;
  @ApiProperty({ type: [String] }) codes: string[];
  @ApiPropertyOptional({ type: MaProgressionBriefSchema, nullable: true })
  ma_progression: MaProgressionBriefSchema | null;
  @ApiProperty() nb_ouvertures: number;
}

export class BookAccessTokenSchema {
  @ApiPropertyOptional({ nullable: true }) token: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) expires_at: string | null;
  @ApiPropertyOptional({ enum: TypeAccesToken, nullable: true }) type_acces: TypeAccesToken | null;
  @ApiPropertyOptional({ nullable: true }) stream_url: string | null;
  @ApiPropertyOptional() expires_in_sec?: number;
  @ApiPropertyOptional() progression_creee?: boolean;
}

export class BookStreamValidateSchema {
  @ApiProperty() valid: boolean;
  @ApiPropertyOptional({ nullable: true }) redirect_url: string | null;
  @ApiPropertyOptional({ nullable: true }) message: string | null;
}

export class ProgressionSchema {
  @ApiProperty() page_actuelle: number;
  @ApiProperty() pourcentage: number;
  @ApiProperty() duree_lecture_min: number;
  @ApiProperty({ enum: StatutProgression }) statut: StatutProgression;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) date_fin: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) date_telechargement: string | null;
}

export class ProgressionUpdateSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() page_actuelle: number;
  @ApiProperty() pourcentage: number;
  @ApiProperty({ enum: StatutProgression }) statut: StatutProgression;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) date_fin: string | null;
}

export class CommentAuteurSchema {
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
  @ApiPropertyOptional({ nullable: true }) photo_profil_url: string | null;
}

export class CommentSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() contenu: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: CommentAuteurSchema }) auteur: CommentAuteurSchema;
}

export class PaginatedCommentSchema {
  @ApiProperty({ type: [CommentSchema] }) data: CommentSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class BookRatingResponseSchema {
  @ApiProperty() valeur: number;
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
}

export class RecentAccessItemSchema extends LivreCatalogItemSchema {
  @ApiPropertyOptional({ format: 'date-time' }) dernier_acces?: string;
}

export class PaginatedRecentAccessSchema {
  @ApiProperty({ type: [RecentAccessItemSchema] }) data: RecentAccessItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}
