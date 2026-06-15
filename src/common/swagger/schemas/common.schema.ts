import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseSchema {
  @ApiProperty({ example: 'Opération réussie.' })
  message: string;
}

export class PaginationMetaSchema {
  @ApiProperty({ example: 1, description: 'Page courante (base 1).' })
  page: number;

  @ApiProperty({ example: 20, description: 'Nombre d’éléments par page.' })
  limit: number;

  @ApiProperty({
    example: 142,
    description: 'Nombre total d’éléments correspondant aux filtres.',
  })
  total: number;

  @ApiProperty({ example: 8, description: 'Nombre total de pages.' })
  total_pages: number;
}
