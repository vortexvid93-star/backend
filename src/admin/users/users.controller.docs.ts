import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import {
  AdminStatsReadingHabitsSchema,
  AdminUserDetailSchema,
  PaginatedAdminUserListSchema,
} from '../../common/swagger/schemas/admin.schema';
import {
  AdminUserCreateSchema,
  IdStatutSchema,
} from '../../common/swagger/schemas/shared.schema';

const authIdParam = () =>
  ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identifiant UUID du compte (`auth.id`).',
  });

export const AdminUsersControllerDocs = () => ApiJwtAdmin();

export const AdminUsersListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste paginée de tous les utilisateurs',
      description:
        'Vue admin complète (tous statuts, y compris personnes soft-deleted). ' +
        'Ne retourne jamais `mot_de_passe_hash`, `refresh_token`, `jti`, `google_id`.',
    }),
    ApiOkResponse({ type: PaginatedAdminUserListSchema }),
  );

export const AdminUsersDetailDocs = () =>
  applyDecorators(
    authIdParam(),
    ApiOperation({
      summary: 'Détail complet d’un utilisateur',
      description:
        'Profil auth + personne, historiques abonnements/paiements et compteurs d’activité.',
    }),
    ApiOkResponse({ type: AdminUserDetailSchema }),
    ApiNotFoundResponse({ description: 'Utilisateur introuvable.' }),
  );

export const AdminUsersReadingHabitsDocs = () =>
  applyDecorators(
    authIdParam(),
    ApiOperation({
      summary: 'Habitudes de lecture d’un utilisateur',
      description:
        'Heatmap, créneau préféré, durée moyenne de session et streak, filtrés sur cet utilisateur. Query `periode` : 7j | 30j | 90j | 365j (défaut 30j).',
    }),
    ApiOkResponse({ type: AdminStatsReadingHabitsSchema }),
    ApiNotFoundResponse({ description: 'Utilisateur introuvable.' }),
  );

export const AdminUsersBanDocs = () =>
  applyDecorators(
    authIdParam(),
    ApiOperation({
      summary: 'Bannir un utilisateur',
      description:
        'Passe `statut` à BANNI, révoque le refresh token et blackliste le `jti` courant. ' +
        'Auto-bannissement interdit (HTTP 400). Le champ `raison` est journalisé côté serveur (non stocké en base).',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiBadRequestResponse({ description: 'Tentative de s’auto-bannir.' }),
    ApiNotFoundResponse({ description: 'Utilisateur introuvable.' }),
  );

export const AdminUsersUnbanDocs = () =>
  applyDecorators(
    authIdParam(),
    ApiOperation({
      summary: 'Débannir un utilisateur',
      description: 'Repasse `statut` à ACTIF.',
    }),
    ApiOkResponse({ type: IdStatutSchema }),
    ApiNotFoundResponse({ description: 'Utilisateur introuvable.' }),
  );

export const AdminUsersCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer un compte administrateur',
      description:
        'Crée un compte `role=ADMIN`, `statut=ACTIF`, `email_verified=true` (inscription publique interdite pour les admins).',
    }),
    ApiCreatedResponse({ type: AdminUserCreateSchema }),
    ApiBadRequestResponse({ description: 'Email ou mot de passe invalide.' }),
    ApiConflictResponse({ description: 'Email déjà utilisé.' }),
  );
