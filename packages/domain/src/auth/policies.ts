/** Documents every account must accept, in their current version, before using the service. */
export const POLICY_KINDS = ['terms_of_service', 'privacy_notice', 'adult_attestation'] as const;

export type PolicyKind = (typeof POLICY_KINDS)[number];

export type PolicyVersions = Readonly<Record<PolicyKind, string>>;

export interface PolicyAcceptance {
  readonly policy: PolicyKind;
  readonly version: string;
}

export function isPolicyKind(value: string): value is PolicyKind {
  return (POLICY_KINDS as readonly string[]).includes(value);
}

/** Policies whose current version the account has not accepted (an older version does not count). */
export function findPendingPolicies(
  accepted: readonly PolicyAcceptance[],
  current: PolicyVersions,
): PolicyKind[] {
  return POLICY_KINDS.filter(
    (policy) =>
      !accepted.some(
        (acceptance) => acceptance.policy === policy && acceptance.version === current[policy],
      ),
  );
}

/** True when the submitted versions are exactly the current ones, i.e. what the user was shown. */
export function matchesCurrentVersions(
  submitted: PolicyVersions,
  current: PolicyVersions,
): boolean {
  return POLICY_KINDS.every((policy) => submitted[policy] === current[policy]);
}
