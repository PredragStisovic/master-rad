export const PERMISSIONS = [
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'roles:read',
  'roles:create',
  'roles:update',
  'roles:delete',
  'permissions:read',
] as const;

export type PermissionName = (typeof PERMISSIONS)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  readonly PermissionName[]
> = {
  admin: PERMISSIONS,
  user: ['users:read', 'roles:read'],
};
