import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import {
  AuthAddPasswordDocs,
  AuthChangePasswordDocs,
  AuthGoogleDocs,
  AuthGoogleLinkDocs,
  AuthLogoutDocs,
  AuthOtpRequestDocs,
  AuthOtpVerifyDocs,
  AuthPasswordLoginDocs,
  AuthPasswordResetConfirmDocs,
  AuthPasswordResetRequestDocs,
  AuthPasswordResetVerifyDocs,
  AuthRefreshDocs,
  AuthRegisterDocs,
  AuthRegisterPasswordDocs,
} from './auth.controller.docs';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { EmailDto } from './dto/email.dto';
import { GoogleTokenDto } from './dto/google.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import {
  AddPasswordDto,
  ChangePasswordDto,
  PasswordLoginDto,
  PasswordResetConfirmDto,
} from './dto/password.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { RegisterDto, RegisterPasswordDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './services/token.service';

@ApiTags(SWAGGER_TAGS.AUTH)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @AuthRegisterDocs()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register/password')
  @AuthRegisterPasswordDocs()
  @HttpCode(HttpStatus.CREATED)
  registerWithPassword(@Body() dto: RegisterPasswordDto) {
    return this.authService.registerWithPassword(dto);
  }

  @Post('otp/request')
  @AuthOtpRequestDocs()
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: EmailDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @AuthOtpVerifyDocs()
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('google')
  @AuthGoogleDocs()
  async googleLogin(
    @Body() dto: GoogleTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleLogin(dto);
    const { statusCode, ...body } = result;
    res.status(statusCode);
    return body;
  }

  @Post('google/link')
  @AuthGoogleLinkDocs()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  linkGoogle(@CurrentUser() user: JwtPayload, @Body() dto: GoogleTokenDto) {
    return this.authService.linkGoogle(user.sub, dto);
  }

  @Post('password/add')
  @AuthAddPasswordDocs()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  addPassword(@CurrentUser() user: JwtPayload, @Body() dto: AddPasswordDto) {
    return this.authService.addPassword(user.sub, dto);
  }

  @Post('password/change')
  @AuthChangePasswordDocs()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  @Post('password/login')
  @AuthPasswordLoginDocs()
  @HttpCode(HttpStatus.OK)
  passwordLogin(@Body() dto: PasswordLoginDto) {
    return this.authService.passwordLogin(dto);
  }

  @Post('password/reset/request')
  @AuthPasswordResetRequestDocs()
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() dto: EmailDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password/reset/verify')
  @AuthPasswordResetVerifyDocs()
  @HttpCode(HttpStatus.OK)
  verifyPasswordResetOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyPasswordResetOtp(dto);
  }

  @Post('password/reset/confirm')
  @AuthPasswordResetConfirmDocs()
  @HttpCode(HttpStatus.OK)
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post('token/refresh')
  @AuthRefreshDocs()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @AuthLogoutDocs()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: JwtPayload, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(user.jti, dto.refresh_token);
  }
}
