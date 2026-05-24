import { IsIn, IsOptional } from 'class-validator';

export class AdminStatsUsersQueryDto {
  @IsOptional()
  @IsIn(['7j', '30j', '90j', '365j'])
  periode?: '7j' | '30j' | '90j' | '365j';
}
