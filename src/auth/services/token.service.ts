import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Auth, Personne } from '../../../generated/prisma/client';
import { AuthStatut, AuthRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_CONSTANTS } from '../auth.constants';

export interface JwtPayload {
  sub: string;
  role: AuthRole;
  statut: AuthStatut;
  jti: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  role: AuthRole;
  statut: AuthStatut;
  personne: {
    nom: string;
    prenom: string;
    points: number;
  };
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  buildUserResponse(auth: Auth & { personne: Personne }): AuthUserResponse {
    return {
      id: auth.id,
      email: auth.email,
      role: auth.role,
      statut: auth.statut,
      personne: {
        nom: auth.personne.nom,
        prenom: auth.personne.prenom,
        points: auth.personne.points,
      },
    };
  }

  async issueTokens(
    auth: Auth & { personne: Personne },
  ): Promise<AuthTokens & { user: AuthUserResponse }> {
    const jti = randomUUID();
    const secret = randomBytes(64).toString('hex');
    const refreshToken = `${auth.id}.${secret}`;
    const refreshHash = await hash(secret, AUTH_CONSTANTS.BCRYPT_ROUNDS);
    const refreshExpires = new Date();
    refreshExpires.setDate(
      refreshExpires.getDate() + AUTH_CONSTANTS.REFRESH_EXPIRES_DAYS,
    );

    await this.prisma.auth.update({
      where: { id: auth.id },
      data: {
        jti,
        refresh_token: refreshHash,
        refresh_token_expires_at: refreshExpires,
        derniere_connexion: new Date(),
      },
    });

    const access_token = await this.jwt.signAsync({
      sub: auth.id,
      role: auth.role,
      statut: auth.statut,
      jti,
    } satisfies JwtPayload);

    return {
      access_token,
      refresh_token: refreshToken,
      user: this.buildUserResponse(auth),
    };
  }

  /** Secret aléatoire = 64 octets → 128 caractères hex. */
  private static readonly REFRESH_SECRET_HEX_LENGTH = 128;

  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private parseRefreshToken(
    refreshToken: string,
  ): { authId: string; secret: string } | null {
    const token = refreshToken.trim();
    const dotIndex = token.indexOf('.');
    if (dotIndex <= 0) return null;

    const authId = token.slice(0, dotIndex);
    const secret = token.slice(dotIndex + 1);

    if (
      !TokenService.UUID_REGEX.test(authId) ||
      secret.length !== TokenService.REFRESH_SECRET_HEX_LENGTH ||
      !/^[a-f0-9]+$/i.test(secret)
    ) {
      return null;
    }

    return { authId, secret };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }

    const matched = await this.prisma.auth.findUnique({
      where: { id: parsed.authId },
      include: { personne: true },
    });

    if (
      !matched?.refresh_token ||
      !matched.refresh_token_expires_at ||
      matched.refresh_token_expires_at <= new Date() ||
      !(await compare(parsed.secret, matched.refresh_token))
    ) {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }

    if (matched.statut === AuthStatut.BANNI) {
      throw new ForbiddenException('Compte suspendu.');
    }

    const tokens = await this.issueTokens(matched);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) return;

    const auth = await this.prisma.auth.findUnique({
      where: { id: parsed.authId },
    });
    if (
      auth?.refresh_token &&
      (await compare(parsed.secret, auth.refresh_token))
    ) {
      await this.prisma.auth.update({
        where: { id: auth.id },
        data: {
          refresh_token: null,
          refresh_token_expires_at: null,
        },
      });
    }
  }
}
