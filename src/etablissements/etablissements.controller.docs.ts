import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiJwtAuthenticated } from '../common/swagger/decorators';

export const EtablissementsJoinDocs = () =>
  applyDecorators(
    ApiJwtAuthenticated(),
    ApiOperation({
      summary: 'Rejoindre un pack établissement via un code d’invitation',
      description:
        'Rattache le compte au pack désigné par `code` (ex. `BLNK-7F3K`) si une place est disponible. ' +
        'Verrouille la ligne établissement le temps de la vérification pour éviter un dépassement de quota en cas de rattachements concurrents.',
    }),
    ApiOkResponse({
      description: 'Adhésion créée.',
    }),
  );

export const EtablissementsMeDocs = () =>
  applyDecorators(
    ApiJwtAuthenticated(),
    ApiOperation({
      summary: 'Membership établissement actif de l’utilisateur connecté',
      description:
        'Utilisé côté mobile en repli quand l’abonnement individuel est absent (`tier: free`), pour afficher le statut premium et l’école lié à un pack établissement.',
    }),
    ApiOkResponse({
      description: '{ actif: boolean, etablissement: {...} | null }',
    }),
  );

export const EtablissementsOffresDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Catalogue public des offres établissement',
      description: 'Liste des offres actives, sans authentification requise.',
    }),
  );

export const EtablissementsPayerDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Payer un pack établissement (sans compte)',
      description:
        'Initie un paiement Mobile Money PawaPay pour une offre. Aucun compte B LINKS requis.',
    }),
  );

export const EtablissementsPaiementStatutDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Statut d’un paiement établissement',
      description:
        'À utiliser en polling depuis la page publique de paiement. Retourne le code d’invitation dès que le pack est créé.',
    }),
  );
