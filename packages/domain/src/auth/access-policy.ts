import { PRIVILEGED_ROLES, type Role } from './roles.js';

export const PERMISSIONS = [
  'account:read-self',
  'account:accept-policies',
  'account:manage-credentials',
  'roles:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type AuthenticatorAssuranceLevel = 'aal1' | 'aal2';

/**
 * Declares who may do what. Kept as data so the rules can be read in one place and so tests can
 * exercise `authorize` with permissions that production does not have yet.
 */
export interface AccessPolicy<P extends string = Permission> {
  /** Held by every authenticated identity, including one with no roles yet. */
  readonly baselinePermissions: ReadonlySet<P>;
  readonly rolePermissions: Readonly<Record<Role, ReadonlySet<P>>>;
  /** Permissions a privileged role may use before completing MFA, e.g. to find out MFA is needed. */
  readonly permissionsAllowedBeforeMfa: ReadonlySet<P>;
  /**
   * Permissions usable before the current Terms, Privacy Notice and age attestation are accepted:
   * reading one's own state, accepting them, and securing one's own credentials.
   */
  readonly permissionsAllowedBeforePolicyAcceptance: ReadonlySet<P>;
}

const ACCOUNT_SELF_SERVICE = [
  'account:read-self',
  'account:accept-policies',
  'account:manage-credentials',
] as const satisfies readonly Permission[];

export const ACCESS_POLICY: AccessPolicy = {
  baselinePermissions: new Set<Permission>(ACCOUNT_SELF_SERVICE),
  rolePermissions: {
    client: new Set<Permission>(),
    practitioner: new Set<Permission>(),
    admin: new Set<Permission>(['roles:manage']),
  },
  permissionsAllowedBeforeMfa: new Set<Permission>(['account:read-self']),
  permissionsAllowedBeforePolicyAcceptance: new Set<Permission>(ACCOUNT_SELF_SERVICE),
};

/** What decides whether an identity must complete MFA. */
export interface MfaContext {
  readonly roles: readonly Role[];
  /** The user has set up an authenticator, so MFA protects their account whatever their role. */
  readonly hasVerifiedMfaFactor: boolean;
}

export interface AuthorizationRequest<P extends string> extends MfaContext {
  readonly aal: AuthenticatorAssuranceLevel;
  /** True while the identity has not accepted the current version of every required policy. */
  readonly hasPendingPolicies: boolean;
  readonly permission: P;
}

export type AuthorizationDecision =
  'allowed' | 'forbidden' | 'mfa_required' | 'policy_acceptance_required';

/** Practitioners and admins must use MFA, whether or not they have set it up yet. */
export function isMfaRequiredForRoles(roles: readonly Role[]): boolean {
  return roles.some((role) => PRIVILEGED_ROLES.has(role));
}

/** MFA is required for a privileged role, and for anyone who has chosen to set it up. */
export function isMfaRequired({ roles, hasVerifiedMfaFactor }: MfaContext): boolean {
  return hasVerifiedMfaFactor || isMfaRequiredForRoles(roles);
}

/** True when MFA is required but this session has not completed it. */
export function isMfaPending(context: MfaContext, aal: AuthenticatorAssuranceLevel): boolean {
  return aal !== 'aal2' && isMfaRequired(context);
}

/**
 * Order matters: `forbidden` comes first so a denied request never reveals MFA or policy state,
 * and MFA comes before policies so a privileged account is secured before anything else.
 */
export function authorize<P extends string>(
  policy: AccessPolicy<P>,
  { roles, aal, hasVerifiedMfaFactor, hasPendingPolicies, permission }: AuthorizationRequest<P>,
): AuthorizationDecision {
  const isGranted =
    policy.baselinePermissions.has(permission) ||
    roles.some((role) => policy.rolePermissions[role].has(permission));
  if (!isGranted) {
    return 'forbidden';
  }
  if (
    isMfaPending({ roles, hasVerifiedMfaFactor }, aal) &&
    !policy.permissionsAllowedBeforeMfa.has(permission)
  ) {
    return 'mfa_required';
  }
  if (hasPendingPolicies && !policy.permissionsAllowedBeforePolicyAcceptance.has(permission)) {
    return 'policy_acceptance_required';
  }
  return 'allowed';
}
