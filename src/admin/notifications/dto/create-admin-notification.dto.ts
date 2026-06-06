import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Types réservés aux notifications créées manuellement par un admin. */
export const ADMIN_CREATABLE_NOTIFICATION_TYPES = [
  'ANNONCE',
  'PROMOTION',
  'MAINTENANCE',
  'ACTUALITE',
  'ALERTE',
] as const;

export type AdminCreatableNotificationType =
  (typeof ADMIN_CREATABLE_NOTIFICATION_TYPES)[number];

export class CreateAdminNotificationDto {
  /** Destinataire ciblé. Omis ou null → tous les comptes ACTIF. */
  @IsOptional()
  @IsUUID()
  auth_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titre: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsIn(ADMIN_CREATABLE_NOTIFICATION_TYPES)
  type: AdminCreatableNotificationType;
}
