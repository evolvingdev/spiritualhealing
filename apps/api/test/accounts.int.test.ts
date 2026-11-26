import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { CURRENT_POLICY_VERSIONS, errorEnvelopeSchema } from '@spiritualhealing/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { PasswordRejectedError, ServiceUnavailableError } from '../src/common/errors/app-error.js';
import { expectErrorEnvelope } from './support/error-envelope.js';
import { IdentityFixtures, type TestIdentity } from './support/identity-fixtures.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTokenSigner,
  type AccessTokenOptions,
  type TokenSigner,
} from './support/token-signer.js';

const NEW_PASSWORD = 'a calm and very long passphrase';
const STALE_SIGN_IN_SECONDS = 10 * 60;

describe('the caller’s own account (API)', () => {
  let signer: TokenSigner;
  let fixtures: IdentityFixtures;
  let testApp: TestApp;

  const server = (): Server => testApp.app.getHttpServer();
  const nowSeconds = (): number => Math.floor(Date.now() / 1000);
  const tokenFor = (identity: TestIdentity, options: Partial<AccessTokenOptions> = {}) =>
    signer.signAccessToken({ ...identity, ...options });
  const staleSignIn = (): Partial<AccessTokenOptions> => ({
    amr: [{ method: 'password', timestamp: nowSeconds() - STALE_SIGN_IN_SECONDS }],
  });

  beforeAll(async () => {
    signer = await createTokenSigner();
    fixtures = new IdentityFixtures(inject('fixturesDatabaseUrl'));
    testApp = await createTestApp({ runtimeDatabaseUrl: inject('runtimeDatabaseUrl'), signer });
  });

  beforeEach(() => {
    testApp.clock.reset();
  });

  afterAll(async () => {
    await testApp.close();
    await fixtures.close();
  });

  describe('POST /api/v1/me/onboarding', () => {
    const onboard = async (
      token: string,
      body: object = { acceptedPolicyVersions: CURRENT_POLICY_VERSIONS },
    ) =>
      request(server())
        .post('/api/v1/me/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    it('records every acceptance, makes the account a client, and is audited once', async () => {
      const identity = await fixtures.createIdentity({ hasAcceptedPolicies: false });
      const token = await tokenFor(identity);

      const first = await onboard(token);
      expect(first.status).toBe(204);
      expect(await fixtures.rolesOf(identity.userId)).toEqual(['client']);
      expect(await fixtures.acceptancesOf(identity.userId)).toEqual([
        { policy: 'adult_attestation', version: CURRENT_POLICY_VERSIONS.adult_attestation },
        { policy: 'privacy_notice', version: CURRENT_POLICY_VERSIONS.privacy_notice },
        { policy: 'terms_of_service', version: CURRENT_POLICY_VERSIONS.terms_of_service },
      ]);

      const repeat = await onboard(token);
      expect(repeat.status).toBe(204);
      const events = await fixtures.auditEventsFor(identity.userId);
      expect(events.map(({ action }) => action)).toEqual(['account.onboarding_completed']);
      expect(events[0]?.actor_user_id).toBe(identity.userId);

      const me = await request(server()).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
      expect(me.body).toMatchObject({ roles: ['client'], pendingPolicies: [] });
    });

    it('refuses versions that are not current, writing nothing', async () => {
      const identity = await fixtures.createIdentity({ hasAcceptedPolicies: false });
      const response = await onboard(await tokenFor(identity), {
        acceptedPolicyVersions: { ...CURRENT_POLICY_VERSIONS, privacy_notice: '2020-01-01' },
      });
      expect(response.status).toBe(409);
      expectErrorEnvelope(response.body, 'policy_version_outdated');
      expect(await fixtures.rolesOf(identity.userId)).toEqual([]);
      expect(await fixtures.acceptancesOf(identity.userId)).toEqual([]);
    });

    it.each([
      [
        'an attempt to assign a role',
        { acceptedPolicyVersions: CURRENT_POLICY_VERSIONS, roles: ['admin'] },
      ],
      [
        'a missing age attestation',
        {
          acceptedPolicyVersions: {
            terms_of_service: CURRENT_POLICY_VERSIONS.terms_of_service,
            privacy_notice: CURRENT_POLICY_VERSIONS.privacy_notice,
          },
        },
      ],
      ['an empty body', {}],
    ])('rejects %s with field details', async (_case, body) => {
      const identity = await fixtures.createIdentity({ hasAcceptedPolicies: false });
      const response = await onboard(await tokenFor(identity), body);
      expect(response.status).toBe(400);
      const envelope = expectErrorEnvelope(response.body, 'validation_error');
      expect(envelope.error.details?.length).toBeGreaterThan(0);
      expect(await fixtures.rolesOf(identity.userId)).toEqual([]);
    });

    it('does not add the client role to an account an admin already gave a role', async () => {
      const identity = await fixtures.createIdentity({
        roles: ['practitioner'],
        hasAcceptedPolicies: false,
      });
      const response = await onboard(await tokenFor(identity, { aal: 'aal2' }));
      expect(response.status).toBe(204);
      expect(await fixtures.rolesOf(identity.userId)).toEqual(['practitioner']);
    });

    it('requires MFA before a practitioner accepts policies', async () => {
      const identity = await fixtures.createIdentity({
        roles: ['practitioner'],
        hasAcceptedPolicies: false,
      });
      const response = await onboard(await tokenFor(identity, { aal: 'aal1' }));
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'mfa_required');
    });

    it('requires authentication', async () => {
      const response = await request(server())
        .post('/api/v1/me/onboarding')
        .send({ acceptedPolicyVersions: CURRENT_POLICY_VERSIONS });
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/me/password', () => {
    const changePassword = (token: string, body: object = { password: NEW_PASSWORD }) =>
      request(server())
        .put('/api/v1/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    it('changes the password, signs out other sessions and audits it', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity);

      const response = await changePassword(token);

      expect(response.status).toBe(204);
      expect(testApp.supabaseAuth.callsFor(token).map(({ operation }) => operation)).toEqual([
        'updatePassword',
        'signOut',
      ]);
      expect(testApp.supabaseAuth.callsFor(token)).toContainEqual({
        operation: 'signOut',
        accessToken: token,
        scope: 'others',
      });
      expect((await fixtures.auditEventsFor(identity.userId)).map(({ action }) => action)).toEqual([
        'account.password_changed',
      ]);
      expect(testApp.logs()).not.toContain(NEW_PASSWORD);
    });

    it('completes a password reset for an account that has not finished onboarding', async () => {
      const identity = await fixtures.createIdentity({ hasAcceptedPolicies: false });
      const token = await tokenFor(identity, {
        amr: [{ method: 'recovery', timestamp: nowSeconds() }],
      });
      expect((await changePassword(token)).status).toBe(204);
    });

    it('requires a sign-in within the last five minutes', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity, staleSignIn());
      const response = await changePassword(token);
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'reauthentication_required');
      expect(testApp.supabaseAuth.callsFor(token)).toEqual([]);
    });

    it('requires a recent TOTP as well for a practitioner', async () => {
      const identity = await fixtures.createIdentity({ roles: ['practitioner'] });
      const token = await tokenFor(identity, {
        aal: 'aal2',
        amr: [
          { method: 'totp', timestamp: nowSeconds() - STALE_SIGN_IN_SECONDS },
          { method: 'password', timestamp: nowSeconds() },
        ],
      });
      const response = await changePassword(token);
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'reauthentication_required');
    });

    it('measures recency with the server clock', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity);
      testApp.clock.advanceBy(5 * 60_000);
      expect((await changePassword(token)).status).toBe(403);
    });

    it.each([
      ['too short', { password: 'short' }],
      ['an unknown field', { password: NEW_PASSWORD, currentPassword: 'x' }],
    ])('rejects a body that is %s', async (_case, body) => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const response = await changePassword(await tokenFor(identity), body);
      expect(response.status).toBe(400);
      expectErrorEnvelope(response.body, 'validation_error');
    });

    it('reports a password Supabase rejects without leaking its message', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      testApp.supabaseAuth.failNextCallWith(
        new PasswordRejectedError('same_password from Supabase'),
      );
      const response = await changePassword(await tokenFor(identity));
      expect(response.status).toBe(400);
      expectErrorEnvelope(response.body, 'password_rejected');
      expect(JSON.stringify(response.body)).not.toContain('same_password');
    });

    it('reports a Supabase outage as temporarily unavailable', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      testApp.supabaseAuth.failNextCallWith(new ServiceUnavailableError('timeout'));
      const response = await changePassword(await tokenFor(identity));
      expect(response.status).toBe(503);
      expect(await fixtures.auditEventsFor(identity.userId)).toEqual([]);
    });

    it('limits attempts per account, across IP addresses', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        expect((await changePassword(token, { password: 'short' })).status).toBe(400);
      }
      const limited = await changePassword(token);
      expect(limited.status).toBe(429);
      expectErrorEnvelope(limited.body, 'rate_limited');
      expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('a client who has set up an authenticator', () => {
    const changePassword = (token: string) =>
      request(server())
        .put('/api/v1/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: NEW_PASSWORD });

    it('must complete MFA before changing credentials, like a practitioner', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      await fixtures.addVerifiedMfaFactor(identity.userId);

      const aal1 = await tokenFor(identity, { aal: 'aal1' });
      const me = await request(server()).get('/api/v1/me').set('Authorization', `Bearer ${aal1}`);
      expect(me.body).toMatchObject({ isMfaRequired: true, isMfaPending: true });
      const blocked = await changePassword(aal1);
      expect(blocked.status).toBe(403);
      expectErrorEnvelope(blocked.body, 'mfa_required');

      expect((await changePassword(await tokenFor(identity, { aal: 'aal2' }))).status).toBe(204);
    });
  });

  describe('POST /api/v1/me/email-change', () => {
    it('asks Supabase to confirm the normalised address and audits the request', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity);
      const response = await request(server())
        .post('/api/v1/me/email-change')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: '  New.Address@Example.TEST ' });
      expect(response.status).toBe(202);
      expect(testApp.supabaseAuth.callsFor(token)).toEqual([
        { operation: 'requestEmailChange', accessToken: token, email: 'new.address@example.test' },
      ]);
      expect((await fixtures.auditEventsFor(identity.userId)).map(({ action }) => action)).toEqual([
        'account.email_change_requested',
      ]);
      expect(testApp.logs()).not.toContain('new.address@example.test');
    });

    it('rejects an invalid address', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const response = await request(server())
        .post('/api/v1/me/email-change')
        .set('Authorization', `Bearer ${await tokenFor(identity)}`)
        .send({ email: 'not-an-email' });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/me/mfa-factors/:factorId', () => {
    const removeFactor = (token: string, factorId: string) =>
      request(server())
        .delete(`/api/v1/me/mfa-factors/${factorId}`)
        .set('Authorization', `Bearer ${token}`);

    it('lets a client remove their only authenticator', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const token = await tokenFor(identity, { aal: 'aal2' });
      const factorId = randomUUID();
      testApp.supabaseAuth.setFactors(token, [{ id: factorId, status: 'verified' }]);

      const response = await removeFactor(token, factorId);

      expect(response.status).toBe(204);
      expect(testApp.supabaseAuth.callsFor(token)).toContainEqual({
        operation: 'deleteMfaFactor',
        accessToken: token,
        factorId,
      });
      const [event] = await fixtures.auditEventsFor(identity.userId);
      expect(event).toMatchObject({ action: 'account.mfa_factor_removed', details: { factorId } });
    });

    it('keeps a practitioner’s last verified authenticator', async () => {
      const identity = await fixtures.createIdentity({ roles: ['practitioner'] });
      const token = await tokenFor(identity, { aal: 'aal2' });
      const factorId = randomUUID();
      testApp.supabaseAuth.setFactors(token, [
        { id: factorId, status: 'verified' },
        { id: randomUUID(), status: 'unverified' },
      ]);
      const response = await removeFactor(token, factorId);
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'mfa_factor_required');
      expect(testApp.supabaseAuth.callsFor(token).map(({ operation }) => operation)).toEqual([
        'listMfaFactors',
      ]);
    });

    it('lets a practitioner remove one of two verified authenticators', async () => {
      const identity = await fixtures.createIdentity({ roles: ['practitioner'] });
      const token = await tokenFor(identity, { aal: 'aal2' });
      const factorId = randomUUID();
      testApp.supabaseAuth.setFactors(token, [
        { id: factorId, status: 'verified' },
        { id: randomUUID(), status: 'verified' },
      ]);
      expect((await removeFactor(token, factorId)).status).toBe(204);
    });

    it('cannot touch another user’s factor (IDOR)', async () => {
      const victim = await fixtures.createIdentity({ roles: ['client'] });
      const victimToken = await tokenFor(victim, { aal: 'aal2' });
      const victimFactorId = randomUUID();
      testApp.supabaseAuth.setFactors(victimToken, [{ id: victimFactorId, status: 'verified' }]);
      const attacker = await fixtures.createIdentity({ roles: ['client'] });
      const attackerToken = await tokenFor(attacker, { aal: 'aal2' });

      const response = await removeFactor(attackerToken, victimFactorId);

      expect(response.status).toBe(404);
      expectErrorEnvelope(response.body, 'not_found');
      expect(testApp.supabaseAuth.callsFor(victimToken)).toEqual([]);
    });

    it('rejects a factor ID that is not a UUID', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      const response = await removeFactor(await tokenFor(identity), 'not-a-uuid');
      expect(response.status).toBe(400);
      expect(errorEnvelopeSchema.parse(response.body).error.code).toBe('validation_error');
    });
  });
});
