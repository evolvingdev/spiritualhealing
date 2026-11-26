import { describe, expect, it } from 'vitest';
import {
  findPendingPolicies,
  isPolicyKind,
  matchesCurrentVersions,
  POLICY_KINDS,
  type PolicyVersions,
} from './policies.js';

const CURRENT: PolicyVersions = {
  terms_of_service: '2026-11-25',
  privacy_notice: '2026-11-25',
  adult_attestation: '2026-11-25',
};

describe('findPendingPolicies', () => {
  it('lists every policy for a new account', () => {
    expect(findPendingPolicies([], CURRENT)).toEqual([...POLICY_KINDS]);
  });

  it('is empty when the current version of every policy is accepted', () => {
    const accepted = POLICY_KINDS.map((policy) => ({ policy, version: CURRENT[policy] }));
    expect(findPendingPolicies(accepted, CURRENT)).toEqual([]);
  });

  it('does not count acceptance of an older version', () => {
    const accepted = [
      { policy: 'terms_of_service' as const, version: '2026-01-01' },
      { policy: 'privacy_notice' as const, version: CURRENT.privacy_notice },
      { policy: 'adult_attestation' as const, version: CURRENT.adult_attestation },
    ];
    expect(findPendingPolicies(accepted, CURRENT)).toEqual(['terms_of_service']);
  });
});

describe('matchesCurrentVersions', () => {
  it('accepts exactly the current versions', () => {
    expect(matchesCurrentVersions({ ...CURRENT }, CURRENT)).toBe(true);
  });

  it('rejects a submission made against an outdated version', () => {
    expect(matchesCurrentVersions({ ...CURRENT, privacy_notice: '2026-01-01' }, CURRENT)).toBe(
      false,
    );
  });
});

describe('isPolicyKind', () => {
  it.each([...POLICY_KINDS])('recognises %s', (kind) => {
    expect(isPolicyKind(kind)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isPolicyKind('marketing')).toBe(false);
  });
});
