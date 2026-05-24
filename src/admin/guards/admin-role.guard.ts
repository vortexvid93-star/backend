import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthRole } from '../../../generated/prisma/enums';
import type { JwtPayload } from '../../auth/services/token.service';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (request.user?.role !== AuthRole.ADMIN) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return true;
  }
}
