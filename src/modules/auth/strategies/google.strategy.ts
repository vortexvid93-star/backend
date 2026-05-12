import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? 'google-client-id-placeholder',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'google-client-secret-placeholder',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id?: string; emails?: { value: string }[]; name?: { givenName?: string; familyName?: string } },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    done(null, {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    });
  }
}
