import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../../common/constants/roles';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { RolesGuard } from './roles.guard';

const authenticatedUser: AuthenticatedUser = {
  userId: 1,
  email: 'jane.doe@example.com',
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

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const requireRoles = (roles: RoleName[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('lets an unannotated route through', () => {
    requireRoles(undefined);

    expect(guard.canActivate(createContext(authenticatedUser))).toBe(true);
  });

  it('lets a route annotated with an empty role list through', () => {
    requireRoles([]);

    expect(guard.canActivate(createContext(authenticatedUser))).toBe(true);
  });

  it('allows a user whose role is among the required ones', () => {
    requireRoles(['admin', 'user']);

    expect(guard.canActivate(createContext(authenticatedUser))).toBe(true);
  });

  it('rejects a user whose role is not required', () => {
    requireRoles(['admin']);

    expect(() => guard.canActivate(createContext(authenticatedUser))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a request that carries no authenticated user', () => {
    requireRoles(['admin']);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('reads the metadata off both the handler and the controller', () => {
    const spy = requireRoles(['admin']);
    const context = createContext(authenticatedUser);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(spy).toHaveBeenCalledWith('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
