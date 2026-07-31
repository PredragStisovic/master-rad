import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionName } from '../../../common/constants/permissions';
import { RolesRepository } from '../../roles/roles.repository';
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

const ALL_PERMISSIONS: PermissionName[] = [
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'roles:read',
  'roles:create',
  'roles:update',
  'roles:delete',
  'permissions:read',
];

const USER_PERMISSIONS: PermissionName[] = ['users:read', 'roles:read'];

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
  let rolesRepository: jest.Mocked<
    Pick<RolesRepository, 'findPermissionNamesByRoleId'>
  >;

  const requirePermissions = (permissions: PermissionName[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);

  const mockPermissionsForRole = (roleId: number, permissions: string[]) =>
    rolesRepository.findPermissionNamesByRoleId.mockImplementation((id) =>
      Promise.resolve(id === roleId ? permissions : []),
    );

  beforeEach(() => {
    reflector = new Reflector();
    rolesRepository = {
      findPermissionNamesByRoleId: jest.fn(),
    };
    guard = new PermissionsGuard(
      reflector,
      rolesRepository as unknown as RolesRepository,
    );
  });

  it('lets an unannotated route through', async () => {
    requirePermissions(undefined);

    expect(await guard.canActivate(createContext(regularUser))).toBe(true);
  });

  it('lets a route annotated with an empty permission list through', async () => {
    requirePermissions([]);

    expect(await guard.canActivate(createContext(regularUser))).toBe(true);
  });

  it('allows a user who has all required permissions', async () => {
    requirePermissions(['users:read']);
    mockPermissionsForRole(regularUser.roleId, USER_PERMISSIONS);

    expect(await guard.canActivate(createContext(regularUser))).toBe(true);
  });

  it('allows an admin who has all required permissions', async () => {
    requirePermissions(['users:delete', 'roles:create']);
    mockPermissionsForRole(adminUser.roleId, ALL_PERMISSIONS);

    expect(await guard.canActivate(createContext(adminUser))).toBe(true);
  });

  it('rejects a user who lacks a required permission', async () => {
    requirePermissions(['users:delete']);
    mockPermissionsForRole(regularUser.roleId, USER_PERMISSIONS);

    await expect(guard.canActivate(createContext(regularUser))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a request that carries no authenticated user', async () => {
    requirePermissions(['users:read']);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('reads the metadata off both the handler and the controller', async () => {
    const spy = requirePermissions(['users:read']);
    mockPermissionsForRole(adminUser.roleId, ALL_PERMISSIONS);
    const context = createContext(adminUser);

    await guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
