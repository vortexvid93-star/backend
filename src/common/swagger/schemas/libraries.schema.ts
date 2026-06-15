import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StatutBibliotheque,
  TypeBibliotheque,
} from '../../../../generated/prisma/enums';
import { PaginationMetaSchema } from './common.schema';

export class LivrePopulaireSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() titre: string;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiPropertyOptional({ nullable: true }) note_moyenne: number | null;
  @ApiProperty() nb_lectures: number;
}

export class BibliothequeListItemSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiPropertyOptional({ nullable: true }) couverture_url: string | null;
  @ApiProperty({ enum: TypeBibliotheque }) type: TypeBibliotheque;
  @ApiPropertyOptional({ nullable: true }) url_externe: string | null;
  @ApiPropertyOptional({ nullable: true }) nb_livres: number | null;
}

export class PaginatedBibliothequeListSchema {
  @ApiProperty({ type: [BibliothequeListItemSchema] })
  data: BibliothequeListItemSchema[];
  @ApiProperty({ type: PaginationMetaSchema }) meta: PaginationMetaSchema;
}

export class BibliothequeDetailSchema extends BibliothequeListItemSchema {
  @ApiProperty({ enum: StatutBibliotheque }) statut: StatutBibliotheque;
  @ApiProperty() acces_livres: string;
  @ApiProperty({ type: [LivrePopulaireSchema] })
  livres_populaires: LivrePopulaireSchema[];
}

export class BibliothequeStatsSchema {
  @ApiProperty() nb_livres: number;
  @ApiProperty() nb_auteurs: number;
  @ApiProperty() nb_categories: number;
}

export class BibliothequeCategorieCountSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() nom: string;
  @ApiProperty() nb_livres: number;
}

export class LibrariesSummarySchema {
  @ApiProperty() nb_bibliotheques: number;
  @ApiProperty() nb_livres_total: number;
}
