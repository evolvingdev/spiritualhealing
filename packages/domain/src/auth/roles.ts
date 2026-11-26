export const ROLES = ['client', 'practitioner', 'admin'] as const;

export type Role = (typeof ROLES)[number];

/** Roles that must complete MFA (aal2) before using anything beyond the pre-MFA permissions. */
export const PRIVILEGED_ROLES: ReadonlySet<Role> = new Set<Role>(['practitioner', 'admin']);

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
