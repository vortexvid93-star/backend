import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'node:crypto';
import { OtpType } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_CONSTANTS } from '../auth.constants';
import { EmailService } from './email.service';
import { AuthCacheService } from './auth-cache.service';

@Injectable()
export class OtpService {
  private readonly hmacSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly cache: AuthCacheService,
    config: ConfigService,
  ) {
    this.hmacSecret = config.getOrThrow<string>('OTP_HMAC_SECRET');
  }

  hashCode(code: string): string {
    return createHmac('sha256', this.hmacSecret).update(code).digest('hex');
  }

  generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  async assertGenerationRateLimit(email: string, type: OtpType): Promise<void> {
    const since = new Date(
      Date.now() - AUTH_CONSTANTS.OTP_GEN_WINDOW_MINUTES * 60 * 1000,
    );
    const count = await this.prisma.otp.count({
      where: { email, type, createdAt: { gte: since } },
    });
    if (count >= AUTH_CONSTANTS.OTP_GEN_MAX) {
      throw new HttpException(
        'Trop de demandes. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertVerificationRateLimit(email: string): Promise<void> {
    const count = await this.cache.incrementOtpVerifyAttempts(email);
    if (count > AUTH_CONSTANTS.OTP_VERIFY_MAX) {
      throw new HttpException(
        'Trop de tentatives. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async invalidateActiveOtps(authId: string, type: OtpType): Promise<void> {
    await this.prisma.otp.updateMany({
      where: { auth_id: authId, type, used: false },
      data: { used: true },
    });
  }

  async createAndSendOtp(
    authId: string,
    email: string,
    type: OtpType,
    purpose: 'login' | 'reset',
  ): Promise<void> {
    await this.assertGenerationRateLimit(email, type);
    await this.invalidateActiveOtps(authId, type);

    const code = this.generateCode();
    const expiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.prisma.otp.create({
      data: {
        auth_id: authId,
        email,
        code_hash: this.hashCode(code),
        type,
        expires_at: expiresAt,
      },
    });

    await this.email.sendOtpEmail(email, code, purpose);
  }

  async verifyOtp(
    authId: string,
    email: string,
    code: string,
    type: OtpType,
  ): Promise<{ otpId: string }> {
    await this.assertVerificationRateLimit(email);

    const otp = await this.prisma.otp.findFirst({
      where: {
        auth_id: authId,
        type,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.code_hash !== this.hashCode(code)) {
      throw new BadRequestException('Code OTP incorrect ou expiré.');
    }

    return { otpId: otp.id };
  }
}
