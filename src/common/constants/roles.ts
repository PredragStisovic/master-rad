export const ROLES = ['admin', 'user'] as const;

export type RoleName = (typeof ROLES)[number];
