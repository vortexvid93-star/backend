import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class AdminStatsSearchTermsQueryDto {
  @IsOptional()
  @IsIn(['7j', '30j'])
  periode?: '7j' | '30j';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  no_results?: boolean;
}
