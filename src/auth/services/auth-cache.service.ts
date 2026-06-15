import { Injectable } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../auth.constants';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Cache en mémoire pour la blacklist JWT (jti) et le rate-limit OTP.
 * Aucune dépendance Redis requise — adapté au dev et aux déploiements mono-instance.
 */
@Injectable()
export class AuthCacheService {
  private readonly store = new Map<string, CacheEntry>();

  blacklistJti(jti: string): void {
    this.set(
      `${AUTH_CONSTANTS.REDIS_JTI_PREFIX}${jti}`,
      '1',
      AUTH_CONSTANTS.JWT_EXPIRES_SECONDS,
    );
  }

  isJtiBlacklisted(jti: string): boolean {
    return this.get(`${AUTH_CONSTANTS.REDIS_JTI_PREFIX}${jti}`) !== null;
  }

  incrementOtpVerifyAttempts(email: string): number {
    const key = `otp:verify:${email}`;
    const current = this.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    this.set(key, String(count), AUTH_CONSTANTS.OTP_VERIFY_WINDOW_MINUTES * 60);
    return count;
  }

  private set(key: string, value: string, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
}
