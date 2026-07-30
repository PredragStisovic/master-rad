import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

/**
 * Injects the authenticated user attached to the request by `JwtAuthGuard`.
 *
 * `@CurrentUser() user: AuthenticatedUser` yields the whole object,
 * `@CurrentUser('userId') id: number` a single property of it.
 */
export const CurrentUser = createParamDecorator(
  (
    property: keyof AuthenticatedUser | undefined,
    context: ExecutionContext,
  ) => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    return property && user ? user[property] : user;
  },
);
