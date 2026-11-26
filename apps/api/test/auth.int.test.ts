import type { Server } from 'node:http';
import { Controller, Get } from '@nestjs/common';
import { ACCESS_POLICY, type AccessPolicy, type Permission } from '@spiritualhealing/domain';
import { meResponseSchema } from '@spiritualhealing/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { RequirePermission } from '../src/auth/decorators.js';
import { expectErrorEnvelope } from './support/error-envelope.js';
import { IdentityFixtures, type TestIdentity } from './support/identity-fixtures.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTokenSigner,
  createUntrustedSigner,
  type AccessTokenOptions,
  type TokenSigner,
} from './support/token-signer.js';

const PRIVILEGED_TEST_PERMISSION = 'test:practice-manage';

/**
 * A permission production does not have yet, granted only to practitioners, to prove the MFA rule
 * end to end. The cast is test-only: the decorator's type intentionally admits real permissions only.
 */
@Controller('test-privileged')
class PrivilegedTestController {
  @Get()
  @RequirePermission(PRIVILEGED_TEST_PERMISSION as Permission)
  read(): { ok: true } {
    return { ok: true };
  }
}

const TEST_POLICY: AccessPolicy<string> = {
  ...ACCESS_POLICY,
  rolePermissions: {
    ...ACCESS_POLICY.rolePermissions,
    practitioner: new Set([PRIVILEGED_TEST_PERMISSION]),
  },
};

describe('authentication and authorization (API)', () => {
  let signer: TokenSigner;
  let fixtures: IdentityFixtures;
  let testApp: TestApp;

  const server = (): Server => testApp.app.getHttpServer();
  const tokenFor = (
    identity: Pick<TestIdentity, 'userId' | 'sessionId'>,
    options: Partial<AccessTokenOptions> = {},
  ) => signer.signAccessToken({ ...identity, ...options });

  beforeAll(async () => {
    signer = await createTokenSigner();
    fixtures = new IdentityFixtures(inject('fixturesDatabaseUrl'));
    testApp = await createTestApp({
      runtimeDatabaseUrl: inject('runtimeDatabaseUrl'),
      signer,
      accessPolicy: TEST_POLICY,
      extraControllers: [PrivilegedTestController],
    });
  });

  afterAll(async () => {
    await testApp.close();
    await fixtures.close();
  });

  describe('GET /api/v1/me', () => {
    it('rejects a request with no token', async () => {
      const response = await request(server()).get('/api/v1/me');
      expect(response.status).toBe(401);
      const envelope = expectErrorEnvelope(response.body, 'authentication_required');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['x-request-id']).toBe(envelope.error.correlationId);
    });

    it.each(['Bearer not-a-token', 'Basic dXNlcjpwYXNz', 'Bearer a.b.c'])(
      'rejects a malformed Authorization header (%s)',
      async (header) => {
        const response = await request(server()).get('/api/v1/me').set('Authorization', header);
        expect(response.status).toBe(401);
        expectErrorEnvelope(response.body, 'authentication_required');
      },
    );

    it('rejects a token signed by a key Supabase does not publish', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const forge = await createUntrustedSigner();
      const response = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${await forge(identity)}`);
      expect(response.status).toBe(401);
    });

    it('rejects an expired token', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const response = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${await tokenFor(identity, { expiresInSeconds: -60 })}`);
      expect(response.status).toBe(401);
    });

    it('rejects a still-valid token once its session is revoked', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity);
      const before = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`);
      expect(before.status).toBe(200);

      await fixtures.revokeSession(identity.sessionId);

      const after = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`);
      expect(after.status).toBe(401);
      expectErrorEnvelope(after.body, 'authentication_required');
    });

    it('rejects a token whose session has passed its absolute expiry', async () => {
      const identity = await fixtures.createIdentity({
        roles: ['client'],
        sessionNotAfter: new Date(Date.now() - 60_000),
      });
      const response = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${await tokenFor(identity)}`);
      expect(response.status).toBe(401);
    });

    it('rejects a token that names another user’s session', async () => {
      const victim = await fixtures.createIdentity({ roles: ['admin'] });
      const attacker = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor({ userId: attacker.userId, sessionId: victim.sessionId });
      const response = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401);
    });

    it('returns exactly the allowlisted fields for a client', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const response = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${await tokenFor(identity)}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: identity.userId,
        roles: ['client'],
        isMfaRequired: false,
        isMfaPending: false,
        pendingPolicies: [],
      });
      expect(meResponseSchema.parse(response.body)).toEqual(response.body);
      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('works for a new identity that has not finished onboarding', async () => {
      const identity = await fixtures.createIdentity({ hasAcceptedPolicies: false });
      const response = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${await tokenFor(identity)}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: identity.userId,
        roles: [],
        isMfaRequired: false,
        isMfaPending: false,
        pendingPolicies: ['terms_of_service', 'privacy_notice', 'adult_attestation'],
      });
    });

    it('tells a practitioner without MFA that MFA is pending', async () => {
      const identity = await fixtures.createIdentity({ roles: ['practitioner'] });
      const aal1 = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${await tokenFor(identity, { aal: 'aal1' })}`);
      expect(aal1.body).toMatchObject({
        roles: ['practitioner'],
        isMfaRequired: true,
        isMfaPending: true,
      });

      const aal2 = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${await tokenFor(identity, { aal: 'aal2' })}`);
      expect(aal2.body).toMatchObject({ roles: ['practitioner'], isMfaPending: false });
    });

    it('takes roles only from our table, never from token metadata', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity, {
        extraClaims: { user_metadata: { role: 'admin' }, app_metadata: { roles: ['admin'] } },
      });
      const response = await request(server())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`);
      expect(response.body).toMatchObject({ roles: ['client'] });
    });
  });

  describe('permissions and MFA', () => {
    it('requires MFA before a practitioner uses a privileged permission', async () => {
      const identity = await fixtures.createIdentity({ roles: ['practitioner'] });
      const aal1 = await request(server())
        .get('/api/v1/test-privileged')
        .set('Authorization', `Bearer ${await tokenFor(identity, { aal: 'aal1' })}`);
      expect(aal1.status).toBe(403);
      expectErrorEnvelope(aal1.body, 'mfa_required');

      const aal2 = await request(server())
        .get('/api/v1/test-privileged')
        .set('Authorization', `Bearer ${await tokenFor(identity, { aal: 'aal2' })}`);
      expect(aal2.status).toBe(200);
    });

    it.each(['client', 'admin'] as const)('forbids a %s without the permission', async (role) => {
      const identity = await fixtures.createIdentity({ roles: [role] });
      const response = await request(server())
        .get('/api/v1/test-privileged')
        .set('Authorization', `Bearer ${await tokenFor(identity, { aal: 'aal2' })}`);
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'forbidden');
    });
  });

  describe('database role constraints', () => {
    it('rejects an unknown role at the database level', async () => {
      const identity = await fixtures.createIdentity();
      await expect(fixtures.insertRawRole(identity.userId, 'superuser')).rejects.toThrow(
        /user_roles_role_check/,
      );
    });
  });

  describe('public endpoints and HTTP hardening', () => {
    it('serves liveness and readiness without authentication', async () => {
      const live = await request(server()).get('/api/health/live');
      expect(live.status).toBe(200);
      expect(live.body).toEqual({ status: 'ok' });

      const ready = await request(server()).get('/api/health/ready');
      expect(ready.status).toBe(200);
      expect(ready.body).toEqual({ status: 'ok' });
    });

    it('returns the envelope for unknown routes', async () => {
      const response = await request(server()).get('/api/v1/does-not-exist');
      expect(response.status).toBe(404);
      expectErrorEnvelope(response.body, 'not_found');
    });

    it('rejects malformed JSON with the envelope', async () => {
      const response = await request(server())
        .post('/api/v1/me')
        .set('Content-Type', 'application/json')
        .send('{"broken":');
      expect(response.status).toBe(400);
      expectErrorEnvelope(response.body, 'validation_error');
    });

    it('rejects oversized bodies with the envelope', async () => {
      const response = await request(server())
        .post('/api/v1/me')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ padding: 'x'.repeat(200 * 1024) }));
      expect(response.status).toBe(413);
      expectErrorEnvelope(response.body, 'payload_too_large');
    });

    it('sets security headers', async () => {
      const response = await request(server()).get('/api/health/live');
      expect(response.headers['content-security-policy']).toBe(
        "default-src 'none';frame-ancestors 'none'",
      );
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('reuses a valid incoming correlation ID and replaces an invalid one', async () => {
      const incoming = '6f1c1a52-1f6a-4f43-9d1e-6a1d2a8c1b11';
      const reused = await request(server()).get('/api/v1/me').set('X-Request-Id', incoming);
      expect(expectErrorEnvelope(reused.body, 'authentication_required').error.correlationId).toBe(
        incoming,
      );

      const forged = '"},"level":"fatal","msg":"forged';
      const injected = await request(server()).get('/api/v1/me').set('X-Request-Id', forged);
      const { correlationId } = expectErrorEnvelope(injected.body, 'authentication_required').error;
      expect(correlationId).not.toBe(forged);
      expect(testApp.logs()).not.toContain('forged');
    });
  });

  describe('logging', () => {
    it('never writes the bearer token or query strings to the logs', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity);
      await request(server())
        .get('/api/v1/me?secret-query-value=1')
        .set('Authorization', `Bearer ${token}`);
      await request(server()).get('/api/v1/me').set('Authorization', 'Bearer a.b.c');

      const logs = testApp.logs();
      expect(logs).toContain('/api/v1/me');
      expect(logs).not.toContain(token);
      expect(logs).not.toContain(token.split('.')[2]);
      expect(logs).not.toContain('secret-query-value');
      expect(logs).toContain('"event":"auth.rejected"');
    });
  });
});

describe('route coverage', () => {
  @Controller('undeclared')
  class UndeclaredController {
    @Get()
    read(): string {
      return 'should never be reachable';
    }
  }

  it('refuses to boot when a route declares neither @Public() nor @RequirePermission()', async () => {
    await expect(
      createTestApp({
        runtimeDatabaseUrl: inject('runtimeDatabaseUrl'),
        signer: await createTokenSigner(),
        extraControllers: [UndeclaredController],
      }),
    ).rejects.toThrow(/UndeclaredController\.read/);
  });
});
