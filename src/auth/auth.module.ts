import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_CONSTANTS } from './auth.constants';
import { ActiveAccountGuard } from './guards/active-account.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtAuthenticatedGuard } from './guards/jwt-authenticated.guard';
import { EmailService } from './services/email.service';
import { OtpService } from './services/otp.service';
import { AuthCacheService } from './services/auth-cache.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: AUTH_CONSTANTS.JWT_EXPIRES },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    EmailService,
    AuthCacheService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    JwtAuthenticatedGuard,
    ActiveAccountGuard,
  ],
  exports: [
    JwtAuthGuard,
    JwtAuthenticatedGuard,
    ActiveAccountGuard,
    AuthCacheService,
  ],
})
export class AuthModule {}
