jest.mock('expo-server-sdk', () => ({
  Expo: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthCacheService } from '../services/auth-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthenticatedGuard } from './jwt-authenticated.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { SubscriptionsController } from '../../payments/subscriptions.controller';
import { SubscriptionsService } from '../../payments/subscriptions.service';
import { PaymentsController } from '../../payments/payments.controller';
import { PaymentsService } from '../../payments/payments.service';
import { EtablissementsController } from '../../etablissements/etablissements.controller';
import { EtablissementsService } from '../../etablissements/etablissements.service';
import { EtablissementPaymentsService } from '../../etablissements/etablissement-payments.service';
import { AuthStatut } from '../../../generated/prisma/enums';

/**
 * Intégration — un compte fraîchement BANNI (soft-delete simulé) avec un
 * access token encore valide doit être rejeté (403) sur CHACUNE des routes
 * protégées uniquement par JwtAuthenticatedGuard, et non 200.
 */
const SECRET = 'test-jwt-secret-32-chars-min';

const ok = () => jest.fn().mockResolvedValue({ ok: true });

const configStub = () =>
  ({
    getOrThrow: (key: string) => (key === 'JWT_SECRET' ? SECRET : undefined),
    get: () => undefined,
  }) as unknown as ConfigService;

describe('JwtAuthenticatedGuard — intégration routes protégées', () => {
  const SUB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  let jwtService: JwtService;
  let findUnique: jest.Mock;

  const token = () =>
    jwtService.sign(
      { sub: SUB, role: 'USER', statut: 'ACTIF', jti: 'jti-int' },
      { expiresIn: '15m' },
    );

  const bearer = () => `Bearer ${token()}`;

  const configureStatut = (statut: AuthStatut | null) => {
    findUnique.mockResolvedValue(statut ? { id: SUB, statut } : null);
  };

  const buildApp = async (
    controllers: unknown[],
    providers: unknown[],
  ): Promise<INestApplication<App>> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: controllers as never,
      providers: providers as never,
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    return app;
  };

  const assertForbidden = (res: { body: { message?: string } }) => {
    expect(res.body.message).toBe('Compte suspendu.');
  };

  beforeAll(() => {
    jwtService = new JwtService({ secret: SECRET });
  });

  beforeEach(() => {
    findUnique = jest.fn();
  });

  describe('SubscriptionsController (5 routes)', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
      app = await buildApp(
        [SubscriptionsController],
        [
          JwtAuthenticatedGuard,
          JwtStrategy,
          { provide: AuthCacheService, useValue: new AuthCacheService() },
          { provide: ConfigService, useValue: configStub() },
          { provide: PrismaService, useValue: { auth: { findUnique } } },
          {
            provide: SubscriptionsService,
            useValue: {
              getCurrent: ok(),
              getUpcoming: ok(),
              getSummary: ok(),
              comparePlansForUser: ok(),
              getHistory: ok(),
            },
          },
        ],
      );
    });

    afterEach(async () => {
      await app.close();
    });

    it.each([
      ['/subscriptions/current'],
      ['/subscriptions/upcoming'],
      ['/subscriptions/summary'],
      ['/subscriptions/compare'],
      ['/subscriptions/history'],
    ])('compte BANNI → 403 sur %s', async (route) => {
      configureStatut(AuthStatut.BANNI);
      await request(app.getHttpServer())
        .get(route)
        .set('Authorization', bearer())
        .expect(403)
        .expect(assertForbidden);
    });

    it('contrôle ACTIF → 200 sur /subscriptions/current', async () => {
      configureStatut(AuthStatut.ACTIF);
      await request(app.getHttpServer())
        .get('/subscriptions/current')
        .set('Authorization', bearer())
        .expect(200)
        .expect({ ok: true });
    });
  });

  describe('PaymentsController (2 routes)', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
      app = await buildApp(
        [PaymentsController],
        [
          JwtAuthenticatedGuard,
          JwtStrategy,
          { provide: AuthCacheService, useValue: new AuthCacheService() },
          { provide: ConfigService, useValue: configStub() },
          { provide: PrismaService, useValue: { auth: { findUnique } } },
          {
            provide: PaymentsService,
            useValue: {
              listPendingPayments: ok(),
              getPaymentStatus: ok(),
            },
          },
        ],
      );
    });

    afterEach(async () => {
      await app.close();
    });

    it.each([['/payments/pending'], ['/payments/status']])(
      'compte BANNI → 403 sur %s',
      async (route) => {
        configureStatut(AuthStatut.BANNI);
        await request(app.getHttpServer())
          .get(route)
          .set('Authorization', bearer())
          .expect(403)
          .expect(assertForbidden);
      },
    );

    it('contrôle ACTIF → 200 sur /payments/pending', async () => {
      configureStatut(AuthStatut.ACTIF);
      await request(app.getHttpServer())
        .get('/payments/pending')
        .set('Authorization', bearer())
        .expect(200)
        .expect({ ok: true });
    });
  });

  describe('EtablissementsController (2 routes)', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
      app = await buildApp(
        [EtablissementsController],
        [
          JwtAuthenticatedGuard,
          JwtStrategy,
          { provide: AuthCacheService, useValue: new AuthCacheService() },
          { provide: ConfigService, useValue: configStub() },
          { provide: PrismaService, useValue: { auth: { findUnique } } },
          {
            provide: EtablissementsService,
            useValue: { join: ok(), getMe: ok() },
          },
          { provide: EtablissementPaymentsService, useValue: {} },
        ],
      );
    });

    afterEach(async () => {
      await app.close();
    });

    it('compte BANNI → 403 sur POST /etablissements/join', async () => {
      configureStatut(AuthStatut.BANNI);
      await request(app.getHttpServer())
        .post('/etablissements/join')
        .send({ code: 'ABC123' })
        .set('Authorization', bearer())
        .expect(403)
        .expect(assertForbidden);
    });

    it('compte BANNI → 403 sur GET /etablissements/me', async () => {
      configureStatut(AuthStatut.BANNI);
      await request(app.getHttpServer())
        .get('/etablissements/me')
        .set('Authorization', bearer())
        .expect(403)
        .expect(assertForbidden);
    });

    it('contrôle ACTIF → 200 sur GET /etablissements/me', async () => {
      configureStatut(AuthStatut.ACTIF);
      await request(app.getHttpServer())
        .get('/etablissements/me')
        .set('Authorization', bearer())
        .expect(200)
        .expect({ ok: true });
    });
  });
});
