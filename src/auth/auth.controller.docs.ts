import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiJwtActiveAccount } from '../common/swagger/decorators';
import {
  AuthTokensResponseSchema,
  AuthTokensWithNewUserSchema,
} from '../common/swagger/schemas/auth.schema';
import { MessageResponseSchema } from '../common/swagger/schemas/common.schema';

export const AuthRegisterDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Inscription par email (sans mot de passe)',
      description:
        'Crée un compte **local** avec email, nom et prénom. Un code OTP est envoyé par email (validité 10 min). ' +
        'Le compte reste en statut `PENDING` tant que l’OTP n’est pas validé via `POST /auth/otp/verify`. ' +
        '**Frontend** : écran « Créer un compte » → puis écran saisie OTP. Ne pas attendre de tokens ici.',
    }),
    ApiCreatedResponse({ type: MessageResponseSchema }),
    ApiConflictResponse({ description: 'Email déjà utilisé.' }),
  );

export const AuthRegisterPasswordDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Inscription par email + mot de passe',
      description:
        'Crée un compte **ACTIF** avec mot de passe (8–128 caractères) et renvoie immédiatement `access_token`, `refresh_token` et `user`. ' +
        'Aucun OTP requis à l’inscription — l’OTP est réservé à la réinitialisation du mot de passe. ' +
        '**Frontend** : écran inscription → stocker les tokens → accueil ou onboarding.',
    }),
    ApiCreatedResponse({ type: AuthTokensWithNewUserSchema }),
    ApiConflictResponse({ description: 'Email déjà utilisé.' }),
  );

export const AuthOtpRequestDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Demander un code OTP (connexion ou ré-envoi)',
      description:
        'Envoie un OTP à un email **déjà inscrit**. Utilisé pour la connexion sans mot de passe ou pour renvoyer un code après inscription. ' +
        '**Frontend** : écran « Se connecter par email » ou bouton « Renvoyer le code ».',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiNotFoundResponse({
      description:
        'Email inconnu — rediriger vers `POST /auth/register` pour créer un compte.',
    }),
    ApiForbiddenResponse({ description: 'Compte banni.' }),
  );

export const AuthOtpVerifyDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Valider l’OTP et obtenir les tokens',
      description:
        'Vérifie le code à 6 chiffres. Active le compte (`ACTIF`) et renvoie `access_token`, `refresh_token` et l’objet `user`. ' +
        'Réponse inclut `is_new_user` pour adapter l’onboarding. ' +
        '**Frontend** : stocker les deux tokens (secure storage), puis rediriger vers l’accueil.',
    }),
    ApiOkResponse({ type: AuthTokensWithNewUserSchema }),
    ApiBadRequestResponse({ description: 'Code OTP invalide ou expiré.' }),
    ApiNotFoundResponse({ description: 'Email inconnu.' }),
    ApiForbiddenResponse({ description: 'Compte banni.' }),
  );

export const AuthGoogleDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Connexion ou inscription via Google',
      description:
        'Accepte un `id_token` Google (Sign-In côté mobile/web). ' +
        'Crée le compte si besoin, lie le provider GOOGLE, renvoie les tokens. ' +
        'Statut HTTP peut être 200 (connexion) ou 201 (nouveau compte). ' +
        '**Frontend** : après Google Sign-In, envoyer `id_token` (pas le access_token Google OAuth classique).',
    }),
    ApiOkResponse({ type: AuthTokensWithNewUserSchema }),
    ApiCreatedResponse({ type: AuthTokensWithNewUserSchema }),
    ApiUnauthorizedResponse({
      description: 'Token Google invalide ou audience incorrecte.',
    }),
  );

export const AuthGoogleLinkDocs = () =>
  applyDecorators(
    ApiJwtActiveAccount(),
    ApiOperation({
      summary: 'Lier un compte Google à un compte existant',
      description:
        'Associe Google à l’utilisateur déjà connecté (ex. compte créé par OTP). ' +
        '**Frontend** : paramètres compte → « Lier Google ».',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiConflictResponse({
      description: 'Ce compte Google est déjà lié à un autre utilisateur.',
    }),
  );

export const AuthAddPasswordDocs = () =>
  applyDecorators(
    ApiJwtActiveAccount(),
    ApiOperation({
      summary: 'Ajouter un mot de passe au compte',
      description:
        'Pour les comptes créés sans mot de passe (OTP/Google). Permet ensuite `POST /auth/password/login`.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiBadRequestResponse({ description: 'Mot de passe déjà défini.' }),
  );

export const AuthChangePasswordDocs = () =>
  applyDecorators(
    ApiJwtActiveAccount(),
    ApiOperation({
      summary: 'Changer le mot de passe (utilisateur connecté)',
      description:
        'Requiert le mot de passe actuel et le nouveau (8–128 caractères). ' +
        '**Frontend** : écran « Sécurité » / modification du mot de passe.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiBadRequestResponse({
      description: 'Mot de passe actuel incorrect ou compte sans mot de passe.',
    }),
  );

export const AuthPasswordLoginDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Connexion par email et mot de passe',
      description:
        'Authentification classique. Le compte doit être `ACTIF` et avoir un mot de passe enregistré. ' +
        '**Frontend** : écran login email/password.',
    }),
    ApiOkResponse({ type: AuthTokensResponseSchema }),
    ApiUnauthorizedResponse({
      description: 'Identifiants incorrects (message générique).',
    }),
  );

export const AuthPasswordResetRequestDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Demander la réinitialisation du mot de passe',
      description:
        'Envoie un OTP de type reset par email. Ne révèle pas si l’email existe (sauf cas métier actuel : email inconnu → 404).',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiNotFoundResponse({ description: 'Email inconnu.' }),
  );

export const AuthPasswordResetVerifyDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Vérifier le code OTP de réinitialisation',
      description:
        'Contrôle que le code saisi correspond à celui envoyé par email, sans encore changer le mot de passe.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
    ApiBadRequestResponse({ description: 'Code OTP incorrect ou expiré.' }),
    ApiNotFoundResponse({ description: 'Email inconnu.' }),
  );

export const AuthPasswordResetConfirmDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Confirmer la réinitialisation (OTP + nouveau mot de passe)',
      description:
        'Valide le code reçu par email et définit le nouveau mot de passe, puis connecte l’utilisateur (tokens).',
    }),
    ApiOkResponse({ type: AuthTokensResponseSchema }),
    ApiBadRequestResponse({
      description: 'OTP invalide ou mot de passe non conforme.',
    }),
  );

export const AuthRefreshDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Rafraîchir l’access token',
      description:
        'Échange un `refresh_token` valide contre une nouvelle paire de tokens (rotation du refresh). ' +
        '**Frontend** : appeler en intercepteur HTTP sur 401, puis rejouer la requête avec le nouvel `access_token`.',
    }),
    ApiOkResponse({ type: AuthTokensResponseSchema }),
    ApiUnauthorizedResponse({
      description: 'Refresh token invalide, expiré ou révoqué.',
    }),
  );

export const AuthLogoutDocs = () =>
  applyDecorators(
    ApiJwtActiveAccount(),
    ApiOperation({
      summary: 'Déconnexion (révocation des tokens)',
      description:
        'Invalide le `jti` du access token courant et le refresh token fourni. ' +
        '**Frontend** : supprimer les tokens locaux après succès.',
    }),
    ApiOkResponse({ type: MessageResponseSchema }),
  );
