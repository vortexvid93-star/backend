import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcrypt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import {
  AuthProvider,
  AuthStatut,
  OtpType,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import {
  findAuthByEmail,
  normalizeEmail,
} from '../common/normalize-email.util';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_CONSTANTS } from './auth.constants';
import { GoogleTokenDto } from './dto/google.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import {
  AddPasswordDto,
  ChangePasswordDto,
  PasswordLoginDto,
  PasswordResetConfirmDto,
} from './dto/password.dto';
import { RegisterDto, RegisterPasswordDto } from './dto/register.dto';
import { EmailDto } from './dto/email.dto';
import { OtpService } from './services/otp.service';
import { AuthCacheService } from './services/auth-cache.service';
import { TokenService } from './services/token.service';

const GENERIC_LOGIN_ERROR = 'Identifiants incorrects.';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly googleAudiences: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly cache: AuthCacheService,
    config: ConfigService,
  ) {
    this.googleClientId = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const extra = [
      config.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
      config.get<string>('GOOGLE_IOS_CLIENT_ID'),
    ]
      .flatMap((value) =>
        value
          ?.split(',')
          .map((part) => part.trim())
          .filter(Boolean) ?? [],
      );
    this.googleAudiences = [...new Set([this.googleClientId, ...extra])];
    this.googleClient = new OAuth2Client(this.googleClientId);
  }

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    await this.assertEmailAvailable(email);
    const auth = await this.createLocalAccount({ ...dto, email }, null);
    await this.otp.createAndSendOtp(auth.id, email, OtpType.LOGIN, 'login');
    return { message: 'OTP envoyé. Valide 10 minutes.' };
  }

  async registerWithPassword(dto: RegisterPasswordDto) {
    const email = normalizeEmail(dto.email);
    await this.assertEmailAvailable(email);
    const passwordHash = await hash(dto.password, AUTH_CONSTANTS.BCRYPT_ROUNDS);
    const auth = await this.createActiveLocalAccount(
      { ...dto, email },
      passwordHash,
    );
    const tokens = await this.tokens.issueTokens(auth);
    return { ...tokens, isNewUser: true };
  }

  async requestOtp(dto: EmailDto) {
    const email = normalizeEmail(dto.email);
    const auth = await findAuthByEmail(this.prisma, email);
    if (!auth) {
      throw new NotFoundException(
        'Email inconnu — utilisez POST /auth/register pour créer un compte.',
      );
    }
    if (auth.statut === AuthStatut.BANNI) {
      throw new ForbiddenException('Compte suspendu.');
    }
    await this.otp.createAndSendOtp(auth.id, email, OtpType.LOGIN, 'login');
    return { message: 'OTP envoyé. Valide 10 minutes.' };
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const email = normalizeEmail(dto.email);
    const auth = await this.prisma.auth.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { personne: true },
    });
    if (!auth) {
      throw new NotFoundException('Email inconnu.');
    }
    if (auth.statut === AuthStatut.BANNI) {
      throw new ForbiddenException('Compte suspendu.');
    }

    const isNewUser = auth.derniere_connexion === null;
    const { otpId } = await this.otp.verifyOtp(
      auth.id,
      email,
      dto.code,
      OtpType.LOGIN,
    );

    await this.prisma.$transaction([
      this.prisma.otp.update({
        where: { id: otpId },
        data: { used: true },
      }),
      this.prisma.auth.update({
        where: { id: auth.id },
        data: {
          statut: AuthStatut.ACTIF,
          email_verified: true,
        },
      }),
    ]);

    const updated = await this.prisma.auth.findUniqueOrThrow({
      where: { id: auth.id },
      include: { personne: true },
    });

    const result = await this.tokens.issueTokens(updated);
    return { ...result, isNewUser };
  }

  async googleLogin(dto: GoogleTokenDto) {
    const payload = await this.verifyGoogleToken(dto.id_token);
    const rawEmail = payload.email;
    if (!rawEmail) {
      throw new BadRequestException('id_token invalide ou expiré.');
    }
    const email = normalizeEmail(rawEmail);

    const googleId = payload.sub;
    if (!googleId) {
      throw new BadRequestException('id_token invalide ou expiré.');
    }

    const byGoogle = await this.prisma.auth.findUnique({
      where: { google_id: googleId },
      include: { personne: true },
    });
    if (byGoogle) {
      if (byGoogle.statut === AuthStatut.BANNI) {
        throw new ForbiddenException('Compte suspendu.');
      }
      const tokens = await this.tokens.issueTokens(byGoogle);
      return { ...tokens, isNewUser: false, statusCode: HttpStatus.OK };
    }

    const byEmail = await this.prisma.auth.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { personne: true },
    });
    if (byEmail) {
      throw new ConflictException(
        'Email déjà associé à un compte LOCAL — liaison manuelle requise.',
      );
    }

    const nom = payload.family_name ?? payload.name ?? 'Utilisateur';
    const prenom = payload.given_name ?? 'Google';

    const created = await this.prisma.$transaction(async (tx) => {
      const personne = await tx.personne.create({
        data: { nom, prenom },
      });
      return tx.auth.create({
        data: {
          personne_id: personne.id,
          email,
          google_id: googleId,
          auth_provider: AuthProvider.GOOGLE,
          statut: AuthStatut.ACTIF,
          email_verified: true,
        },
        include: { personne: true },
      });
    });

    const tokens = await this.tokens.issueTokens(created);
    return { ...tokens, isNewUser: true, statusCode: HttpStatus.CREATED };
  }

  async linkGoogle(authId: string, dto: GoogleTokenDto) {
    const auth = await this.prisma.auth.findUniqueOrThrow({
      where: { id: authId },
    });
    if (auth.statut !== AuthStatut.ACTIF) {
      throw new ForbiddenException('Session invalide.');
    }

    const payload = await this.verifyGoogleToken(dto.id_token);
    const googleId = payload.sub;
    if (!googleId) {
      throw new BadRequestException('id_token invalide');
    }

    const existing = await this.prisma.auth.findUnique({
      where: { google_id: googleId },
    });
    if (existing && existing.id !== authId) {
      throw new ConflictException('google_id déjà associé à un autre compte.');
    }

    await this.prisma.auth.update({
      where: { id: authId },
      data: {
        google_id: googleId,
        auth_provider: AuthProvider.HYBRID,
        email_verified: true,
      },
    });

    return {
      message: 'Compte Google lié avec succès.',
      auth_provider: AuthProvider.HYBRID,
      email_verified: true,
    };
  }

  async changePassword(authId: string, dto: ChangePasswordDto) {
    const auth = await this.prisma.auth.findUniqueOrThrow({
      where: { id: authId },
    });

    if (!auth.mot_de_passe_hash) {
      throw new BadRequestException(
        'Aucun mot de passe défini — utilisez POST /auth/password/add.',
      );
    }

    const valid = await compare(dto.currentPassword, auth.mot_de_passe_hash);
    if (!valid) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }

    const passwordHash = await hash(
      dto.newPassword,
      AUTH_CONSTANTS.BCRYPT_ROUNDS,
    );

    await this.prisma.auth.update({
      where: { id: authId },
      data: { mot_de_passe_hash: passwordHash },
    });

    return { message: 'Mot de passe modifié avec succès.' };
  }

  async addPassword(authId: string, dto: AddPasswordDto) {
    const auth = await this.prisma.auth.findUniqueOrThrow({
      where: { id: authId },
    });

    if (auth.mot_de_passe_hash) {
      throw new ConflictException('Mot de passe déjà défini pour ce compte.');
    }

    const passwordHash = await hash(dto.password, AUTH_CONSTANTS.BCRYPT_ROUNDS);

    const data: {
      mot_de_passe_hash: string;
      auth_provider?: AuthProvider;
    } = { mot_de_passe_hash: passwordHash };

    if (auth.auth_provider === AuthProvider.GOOGLE) {
      data.auth_provider = AuthProvider.HYBRID;
    }

    await this.prisma.auth.update({
      where: { id: authId },
      data,
    });

    return {
      message: 'Mot de passe ajouté.',
      auth_provider: data.auth_provider ?? auth.auth_provider,
    };
  }

  async passwordLogin(dto: PasswordLoginDto) {
    const auth = await this.prisma.auth.findFirst({
      where: {
        email: { equals: normalizeEmail(dto.email), mode: 'insensitive' },
      },
      include: { personne: true },
    });

    if (!auth?.mot_de_passe_hash) {
      throw new BadRequestException(GENERIC_LOGIN_ERROR);
    }

    if (auth.statut === AuthStatut.BANNI) {
      throw new ForbiddenException('Compte suspendu.');
    }
    if (auth.statut === AuthStatut.PENDING && !auth.mot_de_passe_hash) {
      throw new ForbiddenException("Validez d'abord votre email via OTP.");
    }

    const valid = await compare(dto.password, auth.mot_de_passe_hash);
    if (!valid) {
      throw new BadRequestException(GENERIC_LOGIN_ERROR);
    }

    if (auth.statut === AuthStatut.PENDING) {
      await this.prisma.auth.update({
        where: { id: auth.id },
        data: { statut: AuthStatut.ACTIF, email_verified: true },
      });
      auth.statut = AuthStatut.ACTIF;
    }

    const tokens = await this.tokens.issueTokens(auth);
    return { ...tokens, isNewUser: false };
  }

  async requestPasswordReset(dto: EmailDto) {
    const email = normalizeEmail(dto.email);
    const auth = await findAuthByEmail(this.prisma, email);
    if (auth && auth.statut !== AuthStatut.BANNI) {
      await this.otp.createAndSendOtp(
        auth.id,
        email,
        OtpType.RESET_PASSWORD,
        'reset',
      );
    }
    return { message: 'Instructions envoyées si le compte existe.' };
  }

  async verifyPasswordResetOtp(dto: OtpVerifyDto) {
    const email = normalizeEmail(dto.email);
    const auth = await findAuthByEmail(this.prisma, email);
    if (!auth) {
      throw new NotFoundException('Email inconnu.');
    }
    if (auth.statut === AuthStatut.BANNI) {
      throw new ForbiddenException('Compte suspendu.');
    }

    await this.otp.verifyOtp(auth.id, email, dto.code, OtpType.RESET_PASSWORD);

    return { message: 'Code valide.', valid: true };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    const email = normalizeEmail(dto.email);
    const auth = await findAuthByEmail(this.prisma, email);
    if (!auth) {
      throw new NotFoundException('Email inconnu.');
    }
    if (auth.statut === AuthStatut.BANNI) {
      throw new ForbiddenException('Compte suspendu.');
    }

    const { otpId } = await this.otp.verifyOtp(
      auth.id,
      email,
      dto.code,
      OtpType.RESET_PASSWORD,
    );

    const passwordHash = await hash(
      dto.newPassword,
      AUTH_CONSTANTS.BCRYPT_ROUNDS,
    );

    const updateData: {
      mot_de_passe_hash: string;
      refresh_token: null;
      refresh_token_expires_at: null;
      auth_provider?: AuthProvider;
    } = {
      mot_de_passe_hash: passwordHash,
      refresh_token: null,
      refresh_token_expires_at: null,
    };

    if (auth.auth_provider === AuthProvider.GOOGLE && auth.google_id) {
      updateData.auth_provider = AuthProvider.HYBRID;
    }

    await this.prisma.$transaction([
      this.prisma.otp.update({
        where: { id: otpId },
        data: { used: true },
      }),
      this.prisma.auth.update({
        where: { id: auth.id },
        data: updateData,
      }),
    ]);

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  async refresh(refreshToken: string) {
    return this.tokens.refreshTokens(refreshToken);
  }

  async logout(jti: string, refreshToken: string) {
    await this.tokens.revokeRefreshToken(refreshToken);
    if (jti) {
      this.cache.blacklistJti(jti);
    }
    return { message: 'Déconnexion réussie.' };
  }

  private async assertEmailAvailable(email: string) {
    const existing = await findAuthByEmail(this.prisma, email);
    if (existing) {
      throw new ConflictException('Email déjà associé à un compte existant.');
    }
  }

  private async createLocalAccount(
    dto: RegisterDto,
    passwordHash: string | null,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const personne = await tx.personne.create({
          data: { nom: dto.nom.trim(), prenom: dto.prenom.trim() },
        });
        return tx.auth.create({
          data: {
            personne_id: personne.id,
            email: normalizeEmail(dto.email),
            mot_de_passe_hash: passwordHash,
            auth_provider: AuthProvider.LOCAL,
            statut: AuthStatut.PENDING,
            email_verified: false,
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email déjà associé à un compte existant.');
      }
      throw err;
    }
  }

  /** Inscription email + mot de passe — compte actif immédiatement (pas d’OTP). */
  private async createActiveLocalAccount(
    dto: RegisterDto,
    passwordHash: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const personne = await tx.personne.create({
          data: { nom: dto.nom.trim(), prenom: dto.prenom.trim() },
        });
        const auth = await tx.auth.create({
          data: {
            personne_id: personne.id,
            email: normalizeEmail(dto.email),
            mot_de_passe_hash: passwordHash,
            auth_provider: AuthProvider.LOCAL,
            statut: AuthStatut.ACTIF,
            email_verified: true,
          },
        });
        return tx.auth.findUniqueOrThrow({
          where: { id: auth.id },
          include: { personne: true },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email déjà associé à un compte existant.');
      }
      throw err;
    }
  }

  private async verifyGoogleToken(idToken: string): Promise<TokenPayload> {
    for (const audience of this.googleAudiences) {
      try {
        const ticket = await this.googleClient.verifyIdToken({
          idToken,
          audience,
        });
        const payload = ticket.getPayload();
        if (payload) return payload;
      } catch {
        // Essayer le client ID suivant (Web vs Android)
      }
    }
    throw new BadRequestException('id_token invalide ou expiré.');
  }
}
