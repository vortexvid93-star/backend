jest.mock('../challenges/challenges-engine.service', () => ({
  ChallengesEngineService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import type { TokenPayload } from 'google-auth-library';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { ProfileService } from '../profile/profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ChallengesEngineService } from '../challenges/challenges-engine.service';
import { RecommendationsService } from '../discovery/recommendations.service';
import { AuthCacheService } from './services/auth-cache.service';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthProvider, AuthStatut } from '../../generated/prisma/enums';
import {
  AuthRow,
  FakePrisma,
  GOOGLE_TOKEN_PAYLOAD,
} from '../profile/fake-prisma.util';

/**
 * Audit post-fix du flux complet de suppression de compte :
 *  - Point 1 : login (LOCAL + GOOGLE) sur compte BANNI/supprimé
 *  - Point 2 : recréation Google avec le même email (collision unique)
 *  - Point 3 : numero_telephone (nullé, pas de contrainte UNIQUE)
 *  - Point 4 : révocation refresh token + access token (guard)
 * Aucune correction n'est faite ici : on documente le comportement observé.
 */
describe('Audit flux post-suppression de compte', () => {
  let fake: FakePrisma;
  let cache: AuthCacheService;
  let profileService: ProfileService;
  let authService: AuthService;
  let tokenService: TokenService;

  const UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  const seedAuth = (params: {
    id: string;
    email: string;
    auth_provider: AuthProvider;
    statut?: AuthStatut;
    google_id?: string | null;
    mot_de_passe_hash?: string | null;
    numero_telephone?: string | null;
    email_verified?: boolean;
    refresh_token?: string | null;
    refresh_token_expires_at?: Date | null;
    jti?: string | null;
  }) => {
    const personneId = `personne-${params.id}`;
    fake.personnes.set(personneId, {
      id: personneId,
      nom: 'Test',
      prenom: 'User',
      deleted_at: null,
      photo_profil_url: null,
    });
    fake.auths.set(params.id, {
      id: params.id,
      personne_id: personneId,
      email: params.email,
      numero_telephone: params.numero_telephone ?? null,
      mot_de_passe_hash: params.mot_de_passe_hash ?? null,
      google_id: params.google_id ?? null,
      auth_provider: params.auth_provider,
      role: 'USER',
      statut: params.statut ?? AuthStatut.ACTIF,
      email_verified:
        params.email_verified ?? params.auth_provider !== AuthProvider.LOCAL,
      refresh_token: params.refresh_token ?? null,
      refresh_token_expires_at: params.refresh_token_expires_at ?? null,
      jti: params.jti ?? null,
      expo_push_token: null,
      fcm_push_token: null,
      push_platform: null,
    });
  };

  beforeEach(async () => {
    fake = new FakePrisma();
    cache = new AuthCacheService();

    authService = new AuthService(
      fake as unknown as PrismaService,
      {} as never,
      {
        issueTokens: jest.fn((auth: AuthRow) => {
          fake.auths.set(auth.id, {
            ...auth,
            jti: 'issued-jti',
            refresh_token: 'issued-hash',
            refresh_token_expires_at: new Date(Date.now() + 86_400_000),
          });
          return {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            user: { id: auth.id },
          };
        }),
      } as never,
      cache,
      {
        getOrThrow: () => 'fake-google-client-id',
        get: () => undefined,
      } as never,
    );

    tokenService = new TokenService(
      {} as never,
      fake as unknown as PrismaService,
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: fake },
        { provide: CloudinaryService, useValue: { deleteByUrl: jest.fn() } },
        { provide: ChallengesEngineService, useValue: {} },
        { provide: RecommendationsService, useValue: {} },
        { provide: AuthCacheService, useValue: cache },
      ],
    }).compile();
    profileService = moduleRef.get(ProfileService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockGoogleVerify = () =>
    jest
      .spyOn(
        authService as unknown as {
          verifyGoogleToken: (idToken: string) => Promise<Partial<TokenPayload>>;
        },
        'verifyGoogleToken',
      )
      .mockResolvedValue(GOOGLE_TOKEN_PAYLOAD);

  describe('Point 1 — login sur compte BANNI / supprimé', () => {
    it('LOCAL : mot de passe correct sur compte BANNI (bannissement admin) → Forbidden', async () => {
      seedAuth({
        id: 'auth-ban',
        email: 'ban@x.com',
        auth_provider: AuthProvider.LOCAL,
        statut: AuthStatut.BANNI,
        mot_de_passe_hash: await hash('correct-password', 4),
      });

      await expect(
        authService.passwordLogin({
          email: 'ban@x.com',
          password: 'correct-password',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('LOCAL : mauvais mot de passe sur compte BANNI → rejeté par le contrôle de statut (avant vérification du mot de passe)', async () => {
      seedAuth({
        id: 'auth-ban',
        email: 'ban@x.com',
        auth_provider: AuthProvider.LOCAL,
        statut: AuthStatut.BANNI,
        mot_de_passe_hash: await hash('correct-password', 4),
      });

      await expect(
        authService.passwordLogin({
          email: 'ban@x.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('LOCAL : compte supprimé (soft-delete) → login impossible par l’email d’origine', async () => {
      seedAuth({
        id: 'auth-del',
        email: 'orig@x.com',
        auth_provider: AuthProvider.LOCAL,
        mot_de_passe_hash: await hash('correct-password', 4),
      });
      await profileService.deleteAccount('auth-del', undefined);

      await expect(
        authService.passwordLogin({
          email: 'orig@x.com',
          password: 'correct-password',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        authService.passwordLogin({
          email: 'deleted-auth-del@blinks.invalid',
          password: 'correct-password',
        }),
      ).rejects.toThrow(BadRequestException);

      const row = fake.auths.get('auth-del')!;
      expect(row.statut).toBe(AuthStatut.BANNI);
      expect(row.mot_de_passe_hash).toBeNull();
    });

    it('GOOGLE : après suppression, Sign-in with Google ne connecte PAS l’ancien compte BANNI', async () => {
      seedAuth({
        id: 'auth-google',
        email: 'original@x.com',
        auth_provider: AuthProvider.GOOGLE,
        google_id: 'google-123',
      });
      await profileService.deleteAccount('auth-google', undefined);
      mockGoogleVerify();

      const result = await authService.googleLogin({
        id_token: 'fake-id-token',
      });

      expect(result.isNewUser).toBe(true);
      expect(result.statusCode).toBe(201);

      const recreated = [...fake.auths.values()].find(
        (a) => a.google_id === 'google-123' && a.id !== 'auth-google',
      );
      expect(recreated).toBeDefined();

      const old = fake.auths.get('auth-google')!;
      expect(old.statut).toBe(AuthStatut.BANNI);
      expect(old.auth_provider).toBe(AuthProvider.LOCAL);
      expect(old.google_id).toBeNull();
      expect(old.refresh_token).toBeNull();
      expect(old.jti).toBeNull();
    });
  });

  describe('Point 2 — recréation Google sans collision email', () => {
    it('réinscription avec le même email X réussit (email unique non violé)', async () => {
      seedAuth({
        id: 'auth-google',
        email: 'original@x.com',
        auth_provider: AuthProvider.GOOGLE,
        google_id: 'google-123',
      });
      await profileService.deleteAccount('auth-google', undefined);
      mockGoogleVerify();

      const result = await authService.googleLogin({
        id_token: 'fake-id-token',
      });

      expect(result.statusCode).toBe(201);

      const recreated = [...fake.auths.values()].find(
        (a) => a.google_id === 'google-123' && a.id !== 'auth-google',
      );
      expect(recreated).toBeDefined();
      expect(recreated!.email).toBe('original@x.com');
      expect(recreated!.auth_provider).toBe(AuthProvider.GOOGLE);

      const deleted = fake.auths.get('auth-google')!;
      expect(deleted.email).toBe('deleted-auth-google@blinks.invalid');
      expect(deleted.email).not.toBe(recreated!.email);
    });
  });

  describe('Point 3 — numero_telephone', () => {
    it('numero_telephone nullé au soft-delete (aucune contrainte UNIQUE sur la colonne)', async () => {
      seedAuth({
        id: 'auth-phone',
        email: 'phone@x.com',
        auth_provider: AuthProvider.LOCAL,
        numero_telephone: '691234567',
        mot_de_passe_hash: await hash('correct-password', 4),
      });

      await profileService.deleteAccount('auth-phone', undefined);

      expect(fake.auths.get('auth-phone')!.numero_telephone).toBeNull();
    });
  });

  describe('Point 4 — révocation sessions / refresh tokens', () => {
    it('refresh token émis avant la suppression → refusé immédiatement', async () => {
      const secret = 'a'.repeat(128);
      const refreshToken = `${UUID}.${secret}`;
      const expiresAt = new Date(Date.now() + 86_400_000);

      seedAuth({
        id: UUID,
        email: 'sess@x.com',
        auth_provider: AuthProvider.LOCAL,
        mot_de_passe_hash: await hash('correct-password', 4),
        refresh_token: await hash(secret, 4),
        refresh_token_expires_at: expiresAt,
        jti: 'jti-1',
      });
      await profileService.deleteAccount(UUID, undefined);

      expect(fake.auths.get(UUID)!.refresh_token).toBeNull();
      expect(fake.auths.get(UUID)!.jti).toBeNull();

      await expect(tokenService.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('access token d’une session non-courante → rejeté sur compte BANNI (statut vérifié en base)', async () => {
      const spy = jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);
      seedAuth({
        id: UUID,
        email: 'sess@x.com',
        auth_provider: AuthProvider.LOCAL,
        statut: AuthStatut.BANNI,
        mot_de_passe_hash: await hash('correct-password', 4),
      });

      const guard = new JwtAuthGuard(cache, fake as unknown as PrismaService);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              sub: UUID,
              jti: 'other-session',
              role: 'USER',
              statut: 'BANNI',
            },
          }),
        }),
      } as never;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      spy.mockRestore();
    });

    it('access token de la session courante (jti blacklisté) → rejeté immédiatement', async () => {
      const spy = jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);
      seedAuth({
        id: UUID,
        email: 'sess@x.com',
        auth_provider: AuthProvider.LOCAL,
        statut: AuthStatut.ACTIF,
        mot_de_passe_hash: await hash('correct-password', 4),
      });
      cache.blacklistJti('jti-current');

      const guard = new JwtAuthGuard(cache, fake as unknown as PrismaService);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              sub: UUID,
              jti: 'jti-current',
              role: 'USER',
              statut: 'ACTIF',
            },
          }),
        }),
      } as never;

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Token révoqué.',
      );
      spy.mockRestore();
    });

    it('contrôle : access token valide sur compte ACTIF → accepté', async () => {
      const spy = jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);
      seedAuth({
        id: UUID,
        email: 'sess@x.com',
        auth_provider: AuthProvider.LOCAL,
        statut: AuthStatut.ACTIF,
        mot_de_passe_hash: await hash('correct-password', 4),
      });

      const guard = new JwtAuthGuard(cache, fake as unknown as PrismaService);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: UUID, jti: 'ok-jti', role: 'USER', statut: 'ACTIF' },
          }),
        }),
      } as never;

      await expect(guard.canActivate(context)).resolves.toBe(true);
      spy.mockRestore();
    });
  });
});
