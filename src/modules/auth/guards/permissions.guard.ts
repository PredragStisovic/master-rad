import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PermissionName,
} from '../../../common/constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionName[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not sent with request');
    }
    const userPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] ?? [];
    const hasNeededPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasNeededPermissions) {
      throw new ForbiddenException(
        'You do not have permissions to execute this action',
      );
    }

    return true;
  }
}
