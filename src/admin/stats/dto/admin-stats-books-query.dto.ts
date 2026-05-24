import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const ADMIN_STATS_BOOKS_SORT = [
  'nb_lectures',
  'note_moyenne',
  'nb_terminees',
  'nb_lectures_7j',
] as const;

export type AdminStatsBooksSort = (typeof ADMIN_STATS_BOOKS_SORT)[number];

export class AdminStatsBooksQueryDto {
  @IsOptional()
  @IsIn(ADMIN_STATS_BOOKS_SORT)
  sort?: AdminStatsBooksSort = 'nb_lectures';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
