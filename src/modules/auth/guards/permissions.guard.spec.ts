import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionName } from '../../../common/constants/permissions';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { PermissionsGuard } from './permissions.guard';

const adminUser: AuthenticatedUser = {
  userId: 1,
  email: 'admin@example.com',
  roleId: 1,
  role: 'admin',
};

const regularUser: AuthenticatedUser = {
  userId: 2,
  email: 'user@example.com',
  roleId: 2,
  role: 'user',
};

const createContext = (user?: AuthenticatedUser) => {
  const handler = jest.fn();
  const controller = jest.fn();

  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => controller,
  } as unknown as ExecutionContext;
};

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const requirePermissions = (permissions: PermissionName[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('lets an unannotated route through', () => {
    requirePermissions(undefined);

    expect(guard.canActivate(createContext(regularUser))).toBe(true);
  });

  it('lets a route annotated with an empty permission list through', () => {
    requirePermissions([]);

    expect(guard.canActivate(createContext(regularUser))).toBe(true);
  });

  it('allows a user who has all required permissions', () => {
    requirePermissions(['users:read']);

    expect(guard.canActivate(createContext(regularUser))).toBe(true);
  });

  it('allows an admin who has all required permissions', () => {
    requirePermissions(['users:delete', 'roles:create']);

    expect(guard.canActivate(createContext(adminUser))).toBe(true);
  });

  it('rejects a user who lacks a required permission', () => {
    requirePermissions(['users:delete']);

    expect(() => guard.canActivate(createContext(regularUser))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a request that carries no authenticated user', () => {
    requirePermissions(['users:read']);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });

  it('reads the metadata off both the handler and the controller', () => {
    const spy = requirePermissions(['users:read']);
    const context = createContext(adminUser);

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
