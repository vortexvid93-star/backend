import { applyDecorators } from '@nestjs/common';
import {
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import { MessageResponseSchema } from '../common/swagger/schemas/common.schema';
import {
  PaginatedProfileActivitySchema,
  PaginatedProfileCommentsSchema,
  PaginatedProfileReadingSchema,
  PaginatedProfileRatingsSchema,
  ProfileActionsSchema,
  ProfileBadgesSummarySchema,
  ProfileCompletionSchema,
  ProfileDashboardSchema,
  ProfileFullSchema,
  ProfilePhotoResponseSchema,
  ProfileStatsReadingSchema,
  ProfileStatsSchema,
  ProfileStatsSocialSchema,
  ProfileUpdateResponseSchema,
  ProfileBadgesListSchema,
  ProfileChallengesSummarySchema,
  ProfileMyParticipationSchema,
  PaginatedProfileMyChallengesSchema,
} from '../common/swagger/schemas/profile.schema';

const defiIdParam = () =>
  ApiParam({
    name: 'defiId',
    format: 'uuid',
    description: 'Identifiant UUID du défi (`defi.id`).',
  });

export const ProfileControllerDocs = () => ApiJwtActiveAccount();

export const ProfileGetDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Profil de l’utilisateur connecté',
      description:
        'Informations personnelles, email, photo, points, préférences. ' +
        '**Frontend** : écran « Mon compte » / paramètres.',
    }),
    ApiOkResponse({ type: ProfileFullSchema }),
  );

export const ProfileDashboardDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Tableau de bord personnel',
      description:
        'Agrégat pour l’accueil connecté : lecture en cours, stats clés, prochain badge, défis actifs. ' +
        '**Frontend** : home après login — un seul appel pour peupler plusieurs widgets.',
    }),
    ApiOkResponse({ type: ProfileDashboardSchema }),
  );

export const ProfileReadingDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Historique et filtres de lecture',
      description:
        'Livres en cours, terminés ou favoris selon query `statut`. ' +
        '**Frontend** : onglet « Ma bibliothèque » / « Mes lectures ».',
    }),
    ApiOkResponse({ type: PaginatedProfileReadingSchema }),
  );

export const ProfileActivityDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Fil d’activité récente',
      description:
        'Événements : fin de livre, badge obtenu, défi rejoint, commentaire… ' +
        '**Frontend** : timeline « Activité récente ».',
    }),
    ApiOkResponse({ type: PaginatedProfileActivitySchema }),
  );

export const ProfileCompletionDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Complétion du profil',
      description:
        'Pourcentage et checklist (photo, nom, abonnement…) pour inciter à finaliser le profil. ' +
        '**Frontend** : barre de progression onboarding.',
    }),
    ApiOkResponse({ type: ProfileCompletionSchema }),
  );

export const ProfileActionsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Actions suggérées',
      description:
        'CTA dynamiques : valider email, choisir un plan, rejoindre un défi… ' +
        '**Frontend** : cartes d’actions sur le dashboard.',
    }),
    ApiOkResponse({ type: ProfileActionsSchema }),
  );

export const ProfileUpdateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Mettre à jour le profil',
      description:
        'Modifie nom, prénom, bio, préférences (champs fournis uniquement). ' +
        '**Frontend** : formulaire édition profil.',
    }),
    ApiOkResponse({ type: ProfileUpdateResponseSchema }),
  );

export const ProfileUploadPhotoDocs = () =>
  applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Uploader une photo de profil',
      description:
        'Envoie une image `file` (multipart). Hébergée sur Cloudinary. Taille max configurée côté serveur. ' +
        '**Frontend** : `FormData` avec champ `file`.',
    }),
    ApiOkResponse({ type: ProfilePhotoResponseSchema }),
  );

export const ProfileDeletePhotoDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Supprimer la photo de profil',
      description: 'Retire l’image Cloudinary et remet l’avatar par défaut.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
  );

export const ProfileBadgesSummaryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Résumé des badges',
      description: 'Nombre obtenus / total et dernier badge débloqué. **Frontend** : widget compact.',
    }),
    ApiOkResponse({ type: ProfileBadgesSummarySchema }),
  );

export const ProfileBadgesDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste complète des badges utilisateur',
      description: 'Tous les badges avec statut obtenu / verrouillé. **Frontend** : galerie badges.',
    }),
    ApiOkResponse({ type: ProfileBadgesListSchema }),
  );

export const ProfileChallengesSummaryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Résumé des défis en cours',
      description: 'Compteurs et défis actifs prioritaires. **Frontend** : widget défis sur le profil.',
    }),
    ApiOkResponse({ type: ProfileChallengesSummarySchema }),
  );

export const ProfileChallengeParticipationDocs = () =>
  applyDecorators(
    defiIdParam(),
    ApiOperation({
      summary: 'Participation à un défi précis',
      description:
        'Progression détaillée pour un `defiId` donné. **Frontend** : écran détail défi depuis le profil.',
    }),
    ApiOkResponse({ type: ProfileMyParticipationSchema }),
  );

export const ProfileChallengesDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Mes défis (liste filtrée)',
      description:
        'Défis rejoints ou disponibles selon filtres. **Frontend** : onglet défis du profil.',
    }),
    ApiOkResponse({ type: PaginatedProfileMyChallengesSchema }),
  );

export const ProfileStatsReadingDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Statistiques de lecture',
      description:
        'Temps, pages, livres terminés, séries… **Frontend** : graphiques « Mes stats lecture ».',
    }),
    ApiOkResponse({ type: ProfileStatsReadingSchema }),
  );

export const ProfileStatsSocialDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Statistiques sociales',
      description:
        'Commentaires, notes données. **Frontend** : section engagement communautaire.',
    }),
    ApiOkResponse({ type: ProfileStatsSocialSchema }),
  );

export const ProfileStatsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Statistiques globales',
      description:
        'Fusion lecture + social + gamification. **Frontend** : page stats complète.',
    }),
    ApiOkResponse({ type: ProfileStatsSchema }),
  );

export const ProfileCommentsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Mes commentaires',
      description: 'Historique des commentaires publiés par l’utilisateur.',
    }),
    ApiOkResponse({ type: PaginatedProfileCommentsSchema }),
  );

export const ProfileRatingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Mes notes',
      description: 'Historique des notes (étoiles) données aux livres.',
    }),
    ApiOkResponse({ type: PaginatedProfileRatingsSchema }),
  );
