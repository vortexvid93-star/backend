import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolveChannelQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q: string;
}
