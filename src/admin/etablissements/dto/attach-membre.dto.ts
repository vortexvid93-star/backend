import { IsUUID } from 'class-validator';

export class AttachMembreDto {
  @IsUUID()
  auth_id: string;
}
