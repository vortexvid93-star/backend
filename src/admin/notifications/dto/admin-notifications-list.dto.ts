import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ADMIN_CREATABLE_NOTIFICATION_TYPES } from './create-admin-notification.dto';

export class AdminNotificationsListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn([...ADMIN_CREATABLE_NOTIFICATION_TYPES])
  type?: string;
}
