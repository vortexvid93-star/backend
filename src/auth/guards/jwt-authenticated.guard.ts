import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthCacheService } from '../services/auth-cache.service';
import type { JwtPayload } from '../services/token.service';

@Injectable()
export class JwtAuthenticatedGuard extends AuthGuard('jwt') {
  constructor(
    private readonly cache: AuthCacheService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) return false;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (await this.cache.isJtiBlacklisted(user.jti)) {
      throw new UnauthorizedException('Token révoqué.');
    }

    const auth = await this.prisma.auth.findUnique({
      where: { id: user.sub },
    });
    if (!auth) {
      throw new UnauthorizedException('Session invalide.');
    }

    return true;
  }
}
