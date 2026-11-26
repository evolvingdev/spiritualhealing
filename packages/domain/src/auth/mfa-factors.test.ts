import { describe, expect, it } from 'vitest';
import { canRemoveMfaFactor } from './mfa-factors.js';
import type { Role } from './roles.js';

describe('canRemoveMfaFactor', () => {
  it.each<[readonly Role[]]>([[[]], [['client']]])(
    'lets roles %j remove their only verified factor (MFA is optional for them)',
    (roles) => {
      expect(canRemoveMfaFactor({ roles, factorStatus: 'verified', verifiedFactorCount: 1 })).toBe(
        true,
      );
    },
  );

  it.each<Role>(['practitioner', 'admin'])('keeps a %s’s last verified factor', (role) => {
    expect(
      canRemoveMfaFactor({ roles: [role], factorStatus: 'verified', verifiedFactorCount: 1 }),
    ).toBe(false);
  });

  it.each<Role>(['practitioner', 'admin'])(
    'lets a %s remove a verified factor while another remains',
    (role) => {
      expect(
        canRemoveMfaFactor({ roles: [role], factorStatus: 'verified', verifiedFactorCount: 2 }),
      ).toBe(true);
    },
  );

  it('always allows removing an unfinished (unverified) enrolment', () => {
    expect(
      canRemoveMfaFactor({ roles: ['admin'], factorStatus: 'unverified', verifiedFactorCount: 1 }),
    ).toBe(true);
  });
});
