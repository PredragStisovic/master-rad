/** Shape returned by `JwtStrategy.validate` and attached to `request.user`. */
export interface AuthenticatedUser {
  userId: number;
  username?: string;
}
