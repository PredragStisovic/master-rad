import { RoleName } from '../../../common/constants/roles';

export interface JwtPayload {
  sub: number;
  email: string;
  roleId: number;
  role: RoleName;
}
