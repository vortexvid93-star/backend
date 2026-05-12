import { Request } from 'express';
import { UserRole } from '../../modules/users/entities/user.entity';

export type JwtUser = { id: string; email: string; role: UserRole };

export type AuthedRequest = Request & { user: JwtUser };
