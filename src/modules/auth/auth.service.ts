import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.MEMBER,
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async loginWithGoogle(profile: {
    googleId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (!profile.googleId) {
      throw new UnauthorizedException('Invalid Google profile');
    }
    const user = await this.usersService.upsertGoogleUser({
      googleId: profile.googleId,
      email: profile.email ?? '',
      firstName: profile.firstName,
      lastName: profile.lastName,
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  private issueTokens(sub: string, email: string, role: UserRole) {
    const payload = { sub, email, role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
