import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  sub: string;
  role: UserRole;
  [key: string]: any;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const authenticatedUser = user as { role?: UserRole } | undefined;

    if (!authenticatedUser || !authenticatedUser.role) {
      return false;
    }

    return requiredRoles.some((role) => authenticatedUser.role === role);
  }
}
