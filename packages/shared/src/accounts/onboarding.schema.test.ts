import { describe, expect, it } from 'vitest';
import { CURRENT_POLICY_VERSIONS } from '../policies/policy.schema.js';
import { completeOnboardingRequestSchema } from './onboarding.schema.js';

describe('completeOnboardingRequestSchema', () => {
  const valid = { acceptedPolicyVersions: { ...CURRENT_POLICY_VERSIONS } };

  it('accepts every current policy version', () => {
    expect(completeOnboardingRequestSchema.parse(valid)).toEqual(valid);
  });

  it('requires the adult attestation', () => {
    const withoutAttestation = {
      terms_of_service: CURRENT_POLICY_VERSIONS.terms_of_service,
      privacy_notice: CURRENT_POLICY_VERSIONS.privacy_notice,
    };
    expect(
      completeOnboardingRequestSchema.safeParse({ acceptedPolicyVersions: withoutAttestation })
        .success,
    ).toBe(false);
  });

  it('rejects unknown fields (no mass assignment of roles or other data)', () => {
    expect(completeOnboardingRequestSchema.safeParse({ ...valid, roles: ['admin'] }).success).toBe(
      false,
    );
    expect(
      completeOnboardingRequestSchema.safeParse({
        acceptedPolicyVersions: { ...CURRENT_POLICY_VERSIONS, marketing: '2026-11-25' },
      }).success,
    ).toBe(false);
  });

  it('rejects versions that are not dates', () => {
    expect(
      completeOnboardingRequestSchema.safeParse({
        acceptedPolicyVersions: { ...CURRENT_POLICY_VERSIONS, terms_of_service: 'latest' },
      }).success,
    ).toBe(false);
  });
});
