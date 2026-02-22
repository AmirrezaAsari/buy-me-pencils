import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../users/user.entity';

/**
 * Guard that ensures the authenticated user has admin role.
 * Must be used after UserGuard so request.user is set.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: User }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.type !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
