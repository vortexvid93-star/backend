import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthStatut } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../services/token.service';

@Injectable()
export class ActiveAccountGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException('Session invalide.');
    }

    const auth = await this.prisma.auth.findUnique({
      where: { id: user.sub },
    });

    if (!auth) {
      throw new UnauthorizedException('Session invalide.');
    }

    if (auth.statut === AuthStatut.PENDING) {
      throw new ForbiddenException(
        "Validez d'abord votre email via OTP.",
      );
    }

    if (auth.statut === AuthStatut.BANNI) {
      throw new ForbiddenException('Compte suspendu.');
    }

    if (auth.statut !== AuthStatut.ACTIF) {
      throw new ForbiddenException('Compte non actif.');
    }

    return true;
  }
}
