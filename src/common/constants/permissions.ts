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
  'projects:read',
  'projects:create',
  'projects:update',
  'projects:delete',
  'tasks:read',
  'tasks:create',
  'tasks:update',
  'tasks:delete',
  'comments:read',
  'comments:create',
  'comments:update',
  'comments:delete',
] as const;

export type PermissionName = (typeof PERMISSIONS)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  readonly PermissionName[]
> = {
  admin: PERMISSIONS,
  user: [
    'users:read',
    'roles:read',
    'projects:read',
    'projects:create',
    'projects:update',
    'projects:delete',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'comments:read',
    'comments:create',
    'comments:update',
    'comments:delete',
  ],
};
