import { RoleName } from '../../../common/constants/roles';

/** Shape returned by `JwtStrategy.validate` and attached to `request.user`. */
export interface AuthenticatedUser {
  userId: number;
  email: string;
  roleId: number;
  role: RoleName;
}
