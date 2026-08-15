import { AuthGuard } from '@nestjs/passport';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthCacheService } from '../services/auth-cache.service';
import { JwtAuthenticatedGuard } from './jwt-authenticated.guard';
import { AuthStatut } from '../../../generated/prisma/enums';

/**
 * JwtAuthenticatedGuard — contrôle de statut (fix point 4).
 * Décision actée : PENDING ne détient jamais légitimement de JWT, seul
 * ACTIF est autorisé sur les routes protégées par ce guard.
 */
describe('JwtAuthenticatedGuard — contrôle de statut', () => {
  const UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  const makePrisma = (row: { id: string; statut: AuthStatut } | null) => ({
    auth: { findUnique: jest.fn().mockResolvedValue(row) },
  });

  const makeContext = (jti = 'jti-1') =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { sub: UUID, jti, role: 'USER', statut: 'ACTIF' },
        }),
      }),
    }) as never;

  const spyPassport = () =>
    jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockResolvedValue(true);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('compte BANNI → rejeté (403 ForbiddenException, "Compte suspendu.")', async () => {
    const spy = spyPassport();
    const guard = new JwtAuthenticatedGuard(
      new AuthCacheService(),
      makePrisma({ id: UUID, statut: AuthStatut.BANNI }) as never,
    );

    const promise = guard.canActivate(makeContext());
    await expect(promise).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      'Compte suspendu.',
    );
    spy.mockRestore();
  });

  it('compte PENDING → rejeté (403 ForbiddenException)', async () => {
    const spy = spyPassport();
    const guard = new JwtAuthenticatedGuard(
      new AuthCacheService(),
      makePrisma({ id: UUID, statut: AuthStatut.PENDING }) as never,
    );

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      ForbiddenException,
    );
    spy.mockRestore();
  });

  it('compte ACTIF → autorisé (non-régression)', async () => {
    const spy = spyPassport();
    const guard = new JwtAuthenticatedGuard(
      new AuthCacheService(),
      makePrisma({ id: UUID, statut: AuthStatut.ACTIF }) as never,
    );

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    spy.mockRestore();
  });

  it('compte introuvable → 401 UnauthorizedException (comportement inchangé)', async () => {
    const spy = spyPassport();
    const guard = new JwtAuthenticatedGuard(
      new AuthCacheService(),
      makePrisma(null) as never,
    );

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
    spy.mockRestore();
  });

  it('jti blacklisté → 401 "Token révoqué." (comportement inchangé)', async () => {
    const spy = spyPassport();
    const cache = new AuthCacheService();
    cache.blacklistJti('jti-revoked');
    const guard = new JwtAuthenticatedGuard(
      cache,
      makePrisma({ id: UUID, statut: AuthStatut.ACTIF }) as never,
    );

    await expect(guard.canActivate(makeContext('jti-revoked'))).rejects.toThrow(
      'Token révoqué.',
    );
    spy.mockRestore();
  });
});
