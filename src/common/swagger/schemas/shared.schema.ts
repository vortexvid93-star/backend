import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthProvider,
  AuthRole,
  AuthStatut,
  GenrePersonne,
  PlanType as PlanEnum,
  TypeBibliotheque,
  TypeLivre,
} from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';

export class AuteurBriefSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
}

export class AuteurDetailSchema extends AuteurBriefSchema {
  @ApiPropertyOptional({ nullable: true }) bio: string | null;
}

export class CategorieBriefSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
}

export class AbonnementActifSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: PlanEnum }) plan: PlanEnum;
  @ApiProperty({ format: 'date-time' }) date_debut: string;
  @ApiProperty({ format: 'date-time' }) date_fin: string;
  @ApiProperty() jours_restants: number;
}

export class PersonneSchema {
  @ApiProperty() nom: string;
  @ApiProperty() prenom: string;
  @ApiPropertyOptional({ nullable: true, format: 'date' }) date_naissance: string | null;
  @ApiPropertyOptional({ nullable: true }) photo_profil_url: string | null;
  @ApiPropertyOptional({ nullable: true }) bio: string | null;
  @ApiPropertyOptional({ enum: GenrePersonne, nullable: true }) genre: GenrePersonne | null;
  @ApiPropertyOptional({ nullable: true }) ecole: string | null;
  @ApiPropertyOptional({ nullable: true }) niveau: string | null;
  @ApiProperty() points: number;
}

export class IdStatutSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() statut: string;
}

export class IdUpdatedAtSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class AdminBookCreateSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiProperty() type_livre: string;
  @ApiProperty() statut: string;
}

export class AdminUserCreateSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty() role: string;
  @ApiProperty() statut: string;
}

export class AddedCountSchema {
  @ApiProperty() added: number;
}

export class AdminLibraryCreateSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiProperty() type: string;
}

export class ArchiveStatutSchema {
  @ApiProperty() statut: string;
}

export class DeletedAtSchema {
  @ApiProperty({ format: 'date-time' }) deleted_at: string;
}

export class IdNomSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
}

/** Wrapper paginé générique — instancier une sous-classe par ressource. */
export class PaginatedResponseBaseSchema {
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class ProfileAuthCoreSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ enum: AuthRole }) role: AuthRole;
  @ApiProperty({ enum: AuthStatut }) statut: AuthStatut;
  @ApiProperty({ enum: AuthProvider }) auth_provider: AuthProvider;
  @ApiProperty() email_verified: boolean;
  @ApiPropertyOptional({ nullable: true }) numero_telephone: string | null;
  @ApiProperty({ format: 'date-time' }) date_inscription: string;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' }) derniere_connexion: string | null;
}

export class BibliothequeTypeSchema {
  @ApiProperty({ enum: TypeBibliotheque }) type: TypeBibliotheque;
}

export class LivreTypeSchema {
  @ApiProperty({ enum: TypeLivre }) type_livre: TypeLivre;
}
