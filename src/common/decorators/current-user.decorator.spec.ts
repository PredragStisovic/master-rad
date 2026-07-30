import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';
import { CurrentUser } from './current-user.decorator';

type ParamFactory = (data: unknown, context: ExecutionContext) => unknown;

/**
 * Param decorators only expose their factory through route metadata, so we
 * apply the decorator to a throwaway handler and pull the factory back out.
 */
const getFactory = (): ParamFactory => {
  class TestController {
    handler(@CurrentUser() _user: unknown) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'handler',
  ) as Record<string, { factory: ParamFactory }>;

  return Object.values(metadata)[0].factory;
};

const createContext = (user?: AuthenticatedUser): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as ExecutionContext;

describe('CurrentUser', () => {
  const user: AuthenticatedUser = { userId: 1, username: 'jane.doe' };
  const factory = getFactory();

  it('returns the whole user when no property is given', () => {
    expect(factory(undefined, createContext(user))).toEqual(user);
  });

  it('returns a single property when one is given', () => {
    expect(factory('userId', createContext(user))).toBe(1);
  });

  it('returns undefined when the request carries no user', () => {
    expect(factory(undefined, createContext())).toBeUndefined();
    expect(factory('userId', createContext())).toBeUndefined();
  });
});
