jest.mock('../challenges/challenges-engine.service', () => ({
  ChallengesEngineService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ChallengesEngineService } from '../challenges/challenges-engine.service';
import { RecommendationsService } from '../discovery/recommendations.service';
import { AuthCacheService } from '../auth/services/auth-cache.service';
import { AuthService } from '../auth/auth.service';
import { AuthProvider, AuthStatut } from '../../generated/prisma/enums';
import {
  FakePrisma,
  GOOGLE_TOKEN_PAYLOAD,
  PrismaP2004Error,
} from './fake-prisma.util';

describe('ProfileService.deleteAccount — cohérence chk_auth_credentials', () => {
  let service: ProfileService;
  let fake: FakePrisma;

  const seed = (overrides: {
    id: string;
    personneId: string;
    auth_provider: AuthProvider;
    google_id?: string | null;
    mot_de_passe_hash?: string | null;
  }) => {
    fake.personnes.set(overrides.personneId, {
      id: overrides.personneId,
      nom: 'Test',
      prenom: 'User',
      deleted_at: null,
      photo_profil_url: null,
    });
    fake.auths.set(overrides.id, {
      id: overrides.id,
      personne_id: overrides.personneId,
      email: `${overrides.id}@blinks.test`,
      numero_telephone: null,
      mot_de_passe_hash: overrides.mot_de_passe_hash ?? null,
      google_id: overrides.google_id ?? null,
      auth_provider: overrides.auth_provider,
      role: 'USER',
      statut: AuthStatut.ACTIF,
      email_verified: overrides.auth_provider !== AuthProvider.LOCAL,
      refresh_token: null,
      refresh_token_expires_at: null,
      jti: null,
      expo_push_token: null,
      fcm_push_token: null,
      push_platform: null,
    });
  };

  beforeEach(async () => {
    fake = new FakePrisma();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: fake },
        {
          provide: CloudinaryService,
          useValue: { deleteByUrl: jest.fn() },
        },
        { provide: ChallengesEngineService, useValue: {} },
        { provide: RecommendationsService, useValue: {} },
        { provide: AuthCacheService, useValue: { blacklistJti: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(ProfileService);
  });

  it('reproduit la violation P2004 pour l’état d’avant-fix (google_id NULL, provider GOOGLE)', () => {
    expect(() =>
      fake.validateAuth({
        auth_provider: AuthProvider.GOOGLE,
        google_id: null,
        mot_de_passe_hash: null,
        email_verified: true,
      }),
    ).toThrow(PrismaP2004Error);
  });

  it('LOCAL : suppression réussit (non-régression, chemin existant inchangé)', async () => {
    seed({
      id: 'auth-local',
      personneId: 'personne-local',
      auth_provider: AuthProvider.LOCAL,
      mot_de_passe_hash: '$2b$10$hash-local',
    });

    await expect(
      service.deleteAccount('auth-local', undefined),
    ).resolves.toBeDefined();

    const row = fake.auths.get('auth-local')!;
    expect(row.auth_provider).toBe(AuthProvider.LOCAL);
    expect(row.google_id).toBeNull();
    expect(row.mot_de_passe_hash).toBeNull();
    expect(row.email).toMatch(/^deleted-auth-local@blinks\.invalid$/);
    expect(row.statut).toBe(AuthStatut.BANNI);
  });

  it('GOOGLE : suppression réussit sans erreur P2004', async () => {
    seed({
      id: 'auth-google',
      personneId: 'personne-google',
      auth_provider: AuthProvider.GOOGLE,
      google_id: 'google-123',
    });

    await expect(
      service.deleteAccount('auth-google', undefined),
    ).resolves.toBeDefined();

    const row = fake.auths.get('auth-google')!;
    expect(row.auth_provider).toBe(AuthProvider.LOCAL);
    expect(row.google_id).toBeNull();
    expect(row.mot_de_passe_hash).toBeNull();
    expect(() => fake.validateAuth(row)).not.toThrow();
  });

  it('HYBRID : suppression réussit, mot_de_passe_hash bien nullé', async () => {
    seed({
      id: 'auth-hybrid',
      personneId: 'personne-hybrid',
      auth_provider: AuthProvider.HYBRID,
      google_id: 'google-123',
      mot_de_passe_hash: '$2b$10$hash-hybrid',
    });

    await expect(
      service.deleteAccount('auth-hybrid', undefined),
    ).resolves.toBeDefined();

    const row = fake.auths.get('auth-hybrid')!;
    expect(row.auth_provider).toBe(AuthProvider.LOCAL);
    expect(row.google_id).toBeNull();
    expect(row.mot_de_passe_hash).toBeNull();
    expect(() => fake.validateAuth(row)).not.toThrow();
  });
});

describe('Non-régression fonctionnelle — réinscription Google après suppression', () => {
  let profileService: ProfileService;
  let authService: AuthService;
  let fake: FakePrisma;

  beforeEach(async () => {
    fake = new FakePrisma();
    fake.personnes.set('personne-google', {
      id: 'personne-google',
      nom: 'Test',
      prenom: 'User',
      deleted_at: null,
      photo_profil_url: null,
    });
    fake.auths.set('auth-google', {
      id: 'auth-google',
      personne_id: 'personne-google',
      email: 'original@x.com',
      numero_telephone: null,
      mot_de_passe_hash: null,
      google_id: 'google-123',
      auth_provider: AuthProvider.GOOGLE,
      role: 'USER',
      statut: AuthStatut.ACTIF,
      email_verified: true,
      refresh_token: null,
      refresh_token_expires_at: null,
      jti: null,
      expo_push_token: null,
      fcm_push_token: null,
      push_platform: null,
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: fake },
        { provide: CloudinaryService, useValue: { deleteByUrl: jest.fn() } },
        { provide: ChallengesEngineService, useValue: {} },
        { provide: RecommendationsService, useValue: {} },
        { provide: AuthCacheService, useValue: { blacklistJti: jest.fn() } },
      ],
    }).compile();
    profileService = moduleRef.get(ProfileService);

    authService = new AuthService(
      fake as unknown as PrismaService,
      {} as never,
      {
        issueTokens: jest.fn().mockResolvedValue({
          access_token: 'access',
          refresh_token: 'refresh',
          user: {},
        }),
      } as never,
      { blacklistJti: jest.fn() } as never,
      {
        getOrThrow: () => 'fake-google-client-id',
        get: () => undefined,
      } as never,
    );
  });

  it('après suppression d’un compte GOOGLE, le même id_token recrée un compte neuf', async () => {
    await expect(
      profileService.deleteAccount('auth-google', undefined),
    ).resolves.toBeDefined();

    const deleted = fake.auths.get('auth-google')!;
    expect(deleted.auth_provider).toBe(AuthProvider.LOCAL);
    expect(deleted.google_id).toBeNull();
    expect(deleted.email).toBe('deleted-auth-google@blinks.invalid');
    expect(() => fake.validateAuth(deleted)).not.toThrow();

    jest
      .spyOn(
        authService as unknown as { verifyGoogleToken: unknown },
        'verifyGoogleToken',
      )
      .mockResolvedValue(GOOGLE_TOKEN_PAYLOAD);

    const result = await authService.googleLogin({
      id_token: 'fake-id-token',
    });

    expect(result.isNewUser).toBe(true);
    expect(result.statusCode).toBe(201);

    const recreated = [...fake.auths.values()].find(
      (a) => a.google_id === 'google-123' && a.id !== 'auth-google',
    );
    expect(recreated).toBeDefined();
    expect(recreated!.auth_provider).toBe(AuthProvider.GOOGLE);
    expect(recreated!.email).toBe('original@x.com');

    const stillDeleted = fake.auths.get('auth-google')!;
    expect(stillDeleted.auth_provider).toBe(AuthProvider.LOCAL);
    expect(stillDeleted.google_id).toBeNull();
    expect(stillDeleted.email).toBe('deleted-auth-google@blinks.invalid');
  });
});
