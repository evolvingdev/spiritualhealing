import { isMfaRequiredForRoles } from './access-policy.js';
import type { Role } from './roles.js';

export type MfaFactorStatus = 'verified' | 'unverified';

export interface MfaFactorRemoval {
  readonly roles: readonly Role[];
  readonly factorStatus: MfaFactorStatus;
  /** Verified factors the account has now, including the one being removed. */
  readonly verifiedFactorCount: number;
}

/** A role that requires MFA must always keep at least one verified authenticator. */
export function canRemoveMfaFactor({
  roles,
  factorStatus,
  verifiedFactorCount,
}: MfaFactorRemoval): boolean {
  if (factorStatus === 'unverified' || !isMfaRequiredForRoles(roles)) {
    return true;
  }
  return verifiedFactorCount > 1;
}
