import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSION_KEY } from './permission.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // If user has custom permissions, use those INSTEAD of role defaults
    if (user.permissions?.length > 0) {
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredPermissions && requiredPermissions.length > 0) {
        // User needs ANY of the listed permissions
        if (requiredPermissions.some((p) => user.permissions.includes(p))) {
          return true;
        }
      }

      // Custom permissions set but doesn't include this endpoint
      throw new ForbiddenException('ليس لديك صلاحية للوصول');
    }

    // No custom permissions — fall back to role-based check
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('ليس لديك صلاحية للوصول');
  }
}
