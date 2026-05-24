import { ApiProperty } from '@nestjs/swagger';
import { AuthRole, AuthStatut } from '../../../../generated/prisma/enums';

export class AuthPersonneSchema {
  @ApiProperty({ example: 'Dupont' })
  nom: string;

  @ApiProperty({ example: 'Jean' })
  prenom: string;

  @ApiProperty({ example: 120, description: 'Points de gamification cumulés.' })
  points: number;
}

export class AuthUserSchema {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  email: string;

  @ApiProperty({ enum: AuthRole })
  role: AuthRole;

  @ApiProperty({
    enum: AuthStatut,
    description:
      'PENDING = email non validé ; ACTIF = compte utilisable ; BANNI = accès bloqué.',
  })
  statut: AuthStatut;

  @ApiProperty({ type: AuthPersonneSchema })
  personne: AuthPersonneSchema;
}

export class AuthTokensResponseSchema {
  @ApiProperty({
    description:
      'JWT court (15 min). À envoyer dans `Authorization: Bearer <token>` sur les routes protégées.',
  })
  access_token: string;

  @ApiProperty({
    description:
      'Jeton long (30 jours). À stocker côté client et à envoyer uniquement sur POST /auth/token/refresh et POST /auth/logout.',
  })
  refresh_token: string;

  @ApiProperty({ type: AuthUserSchema })
  user: AuthUserSchema;
}

/** Réponse OTP verify / Google login (champ additionnel onboarding). */
export class AuthTokensWithNewUserSchema extends AuthTokensResponseSchema {
  @ApiProperty({
    description: 'true si première connexion (inscription), false si reconnexion.',
    example: true,
  })
  is_new_user: boolean;
}
