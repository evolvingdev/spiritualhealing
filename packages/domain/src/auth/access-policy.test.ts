import { describe, expect, it } from 'vitest';
import {
  ACCESS_POLICY,
  authorize,
  isMfaPending,
  type AccessPolicy,
  type AuthenticatorAssuranceLevel,
  type Permission,
} from './access-policy.js';
import { ROLES, type Role } from './roles.js';

type TestPermission = 'account:read-self' | 'booking:create' | 'practice:manage' | 'admin:audit';

const TEST_POLICY: AccessPolicy<TestPermission> = {
  baselinePermissions: new Set(['account:read-self']),
  rolePermissions: {
    client: new Set(['booking:create']),
    practitioner: new Set(['practice:manage']),
    admin: new Set(['admin:audit']),
  },
  permissionsAllowedBeforeMfa: new Set(['account:read-self']),
  permissionsAllowedBeforePolicyAcceptance: new Set(['account:read-self']),
};

const AALS: readonly AuthenticatorAssuranceLevel[] = ['aal1', 'aal2'];

describe('authorize', () => {
  it.each(AALS)('grants baseline permissions to an identity with no roles at %s', (aal) => {
    expect(
      authorize(TEST_POLICY, {
        hasPendingPolicies: false,
        hasVerifiedMfaFactor: false,
        roles: [],
        aal,
        permission: 'account:read-self',
      }),
    ).toBe('allowed');
  });

  it.each(AALS)('forbids role permissions to an identity with no roles at %s', (aal) => {
    expect(
      authorize(TEST_POLICY, {
        hasPendingPolicies: false,
        hasVerifiedMfaFactor: false,
        roles: [],
        aal,
        permission: 'booking:create',
      }),
    ).toBe('forbidden');
  });

  it.each(AALS)('lets a client use client permissions at %s (MFA optional)', (aal) => {
    expect(
      authorize(TEST_POLICY, {
        hasPendingPolicies: false,
        hasVerifiedMfaFactor: false,
        roles: ['client'],
        aal,
        permission: 'booking:create',
      }),
    ).toBe('allowed');
  });

  it.each<[Role, TestPermission]>([
    ['practitioner', 'practice:manage'],
    ['admin', 'admin:audit'],
  ])('requires MFA before a %s uses %s', (role, permission) => {
    expect(
      authorize(TEST_POLICY, {
        hasPendingPolicies: false,
        hasVerifiedMfaFactor: false,
        roles: [role],
        aal: 'aal1',
        permission,
      }),
    ).toBe('mfa_required');
    expect(
      authorize(TEST_POLICY, {
        hasPendingPolicies: false,
        hasVerifiedMfaFactor: false,
        roles: [role],
        aal: 'aal2',
        permission,
      }),
    ).toBe('allowed');
  });

  it.each<Role>(['practitioner', 'admin'])(
    'lets a %s use pre-MFA permissions without MFA',
    (role) => {
      expect(
        authorize(TEST_POLICY, {
          hasPendingPolicies: false,
          hasVerifiedMfaFactor: false,
          roles: [role],
          aal: 'aal1',
          permission: 'account:read-self',
        }),
      ).toBe('allowed');
    },
  );

  it('requires MFA for a client permission when the identity also holds a privileged role', () => {
    expect(
      authorize(TEST_POLICY, {
        roles: ['client', 'practitioner'],
        aal: 'aal1',
        hasPendingPolicies: false,
        hasVerifiedMfaFactor: false,
        permission: 'booking:create',
      }),
    ).toBe('mfa_required');
  });

  it('forbids before checking MFA, so a denied request never reveals the MFA state', () => {
    expect(
      authorize(TEST_POLICY, {
        hasPendingPolicies: false,
        hasVerifiedMfaFactor: false,
        roles: ['practitioner'],
        aal: 'aal1',
        permission: 'admin:audit',
      }),
    ).toBe('forbidden');
  });

  it.each(ROLES.flatMap((role) => AALS.map((aal) => [role, aal] as const)))(
    'does not let %s at %s cross into another role’s permissions',
    (role, aal) => {
      const otherRolePermissions = ROLES.filter((other) => other !== role).flatMap((other) => [
        ...TEST_POLICY.rolePermissions[other],
      ]);
      for (const permission of otherRolePermissions) {
        expect(
          authorize(TEST_POLICY, {
            hasPendingPolicies: false,
            hasVerifiedMfaFactor: false,
            roles: [role],
            aal,
            permission,
          }),
        ).toBe('forbidden');
      }
    },
  );
});

describe('authorize with pending policies', () => {
  it('asks for policy acceptance before a role permission is used', () => {
    expect(
      authorize(TEST_POLICY, {
        roles: ['client'],
        aal: 'aal1',
        hasPendingPolicies: true,
        hasVerifiedMfaFactor: false,
        permission: 'booking:create',
      }),
    ).toBe('policy_acceptance_required');
  });

  it('still allows the permissions needed to accept the policies', () => {
    expect(
      authorize(TEST_POLICY, {
        roles: [],
        aal: 'aal1',
        hasPendingPolicies: true,
        hasVerifiedMfaFactor: false,
        permission: 'account:read-self',
      }),
    ).toBe('allowed');
  });

  it('reports forbidden, not pending policies, for a permission the identity lacks', () => {
    expect(
      authorize(TEST_POLICY, {
        roles: [],
        aal: 'aal1',
        hasPendingPolicies: true,
        hasVerifiedMfaFactor: false,
        permission: 'booking:create',
      }),
    ).toBe('forbidden');
  });

  it('asks a privileged role for MFA before asking for policy acceptance', () => {
    expect(
      authorize(TEST_POLICY, {
        roles: ['practitioner'],
        aal: 'aal1',
        hasPendingPolicies: true,
        hasVerifiedMfaFactor: false,
        permission: 'practice:manage',
      }),
    ).toBe('mfa_required');
  });
});

describe('ACCESS_POLICY', () => {
  const decide = (
    roles: readonly Role[],
    aal: AuthenticatorAssuranceLevel,
    permission: Permission,
    hasPendingPolicies = false,
  ) =>
    authorize(ACCESS_POLICY, {
      roles,
      aal,
      hasPendingPolicies,
      hasVerifiedMfaFactor: false,
      permission,
    });

  it.each<Permission>([
    'account:read-self',
    'account:accept-policies',
    'account:manage-credentials',
  ])('lets a new identity with no roles and pending policies use %s', (permission) => {
    expect(decide([], 'aal1', permission, true)).toBe('allowed');
  });

  it.each<Role>(['client', 'practitioner'])('forbids %s from managing roles', (role) => {
    expect(decide([role], 'aal2', 'roles:manage')).toBe('forbidden');
  });

  it('lets an admin manage roles only after MFA and with current policies', () => {
    expect(decide(['admin'], 'aal1', 'roles:manage')).toBe('mfa_required');
    expect(decide(['admin'], 'aal2', 'roles:manage', true)).toBe('policy_acceptance_required');
    expect(decide(['admin'], 'aal2', 'roles:manage')).toBe('allowed');
  });

  it.each<Role>(['practitioner', 'admin'])(
    'requires MFA before a %s accepts policies or changes credentials',
    (role) => {
      expect(decide([role], 'aal1', 'account:accept-policies', true)).toBe('mfa_required');
      expect(decide([role], 'aal1', 'account:manage-credentials')).toBe('mfa_required');
    },
  );

  it.each(ROLES.flatMap((role) => AALS.map((aal) => [role, aal] as const)))(
    'lets %s at %s read their own account',
    (role, aal) => {
      expect(
        authorize(ACCESS_POLICY, {
          hasPendingPolicies: false,
          hasVerifiedMfaFactor: false,
          roles: [role],
          aal,
          permission: 'account:read-self',
        }),
      ).toBe('allowed');
    },
  );
});

describe('isMfaPending', () => {
  it.each<[readonly Role[], AuthenticatorAssuranceLevel, boolean]>([
    [[], 'aal1', false],
    [['client'], 'aal1', false],
    [['practitioner'], 'aal1', true],
    [['admin'], 'aal1', true],
    [['client', 'admin'], 'aal1', true],
    [['practitioner'], 'aal2', false],
    [['admin'], 'aal2', false],
  ])('roles %j at %s → %s', (roles, aal, expected) => {
    expect(isMfaPending({ roles, hasVerifiedMfaFactor: false }, aal)).toBe(expected);
  });

  it('applies to a client who has set up an authenticator', () => {
    expect(isMfaPending({ roles: ['client'], hasVerifiedMfaFactor: true }, 'aal1')).toBe(true);
    expect(isMfaPending({ roles: ['client'], hasVerifiedMfaFactor: true }, 'aal2')).toBe(false);
  });
});

describe('authorize for a client with an authenticator', () => {
  it('requires MFA before role permissions, as it would for a practitioner', () => {
    const request = {
      roles: ['client'] as const,
      hasVerifiedMfaFactor: true,
      hasPendingPolicies: false,
      permission: 'booking:create' as const,
    };
    expect(authorize(TEST_POLICY, { ...request, aal: 'aal1' })).toBe('mfa_required');
    expect(authorize(TEST_POLICY, { ...request, aal: 'aal2' })).toBe('allowed');
  });
});
