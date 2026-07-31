import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';

export const AdminEtablissementsControllerDocs = () => ApiJwtAdmin();

export const AdminEtablissementsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste paginée des packs établissement',
      description: 'Filtrable par `statut`. Inclut le nombre de membres actifs.',
    }),
  );

export const AdminEtablissementsCreateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Créer un pack établissement manuellement',
      description:
        'Génère un code d’invitation unique (`BLNK-XXXX`). Alternative admin au flux de paiement en ligne.',
    }),
    ApiCreatedResponse({ description: 'Pack créé.' }),
  );

export const AdminEtablissementsAttachMembreDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Rattacher manuellement un utilisateur au pack',
      description: 'Refusé si la limite de places (`nb_users_max`) est atteinte.',
    }),
    ApiOkResponse({ description: 'Membre rattaché.' }),
  );

export const AdminEtablissementsProlongerDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Prolonger un pack établissement',
      description:
        'Ajoute `jours_supplementaires` à `date_fin` (à partir de la date de fin actuelle si le pack est encore actif, sinon à partir de maintenant). Réactive un pack EXPIRE.',
    }),
    ApiOkResponse({ description: 'Pack prolongé.' }),
  );

export const AdminEtablissementsDetachMembreDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Retirer un membre du pack',
      description: 'Marque `retire_le` — libère aussitôt une place.',
    }),
    ApiOkResponse({ description: 'Membre retiré.' }),
  );

export const AdminEtablissementsPerformanceDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Revenu réel et engagement de lecture du pack',
      description:
        'Paiement lié (montant, devise, statut) et statistiques d’usage réelles agrégées sur les sessions de lecture de tous les membres (actifs et retirés) : membres ayant réellement lu, minutes cumulées, top 5 des livres les plus lus.',
    }),
    ApiOkResponse({ description: 'Performance calculée.' }),
  );
