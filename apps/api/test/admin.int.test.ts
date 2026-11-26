import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { managedUserResponseSchema } from '@spiritualhealing/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { expectErrorEnvelope } from './support/error-envelope.js';
import { IdentityFixtures, type TestIdentity } from './support/identity-fixtures.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import { createTokenSigner, type TokenSigner } from './support/token-signer.js';

describe('admin role management (API)', () => {
  let signer: TokenSigner;
  let fixtures: IdentityFixtures;
  let testApp: TestApp;
  let admin: TestIdentity;
  let adminToken: string;

  const server = (): Server => testApp.app.getHttpServer();
  const asAdmin = (token = adminToken) => ({ Authorization: `Bearer ${token}` });
  const practitionerRoute = (userId: string) => `/api/v1/admin/users/${userId}/roles/practitioner`;

  beforeAll(async () => {
    signer = await createTokenSigner();
    fixtures = new IdentityFixtures(inject('fixturesDatabaseUrl'));
    testApp = await createTestApp({ runtimeDatabaseUrl: inject('runtimeDatabaseUrl'), signer });
    admin = await fixtures.createIdentity({ roles: ['admin'] });
    adminToken = await signer.signAccessToken({ ...admin, aal: 'aal2' });
  });

  afterAll(async () => {
    await testApp.close();
    await fixtures.close();
  });

  describe('POST /api/v1/admin/users/lookup', () => {
    it('finds a user by email, returns only their ID and roles, and audits the lookup', async () => {
      const target = await fixtures.createIdentity({ roles: ['client'] });
      const response = await request(server())
        .post('/api/v1/admin/users/lookup')
        .set(asAdmin())
        .send({ email: target.email.toUpperCase() });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ userId: target.userId, roles: ['client'] });
      expect(managedUserResponseSchema.parse(response.body)).toEqual(response.body);
      const [event] = await fixtures.auditEventsFor(target.userId);
      expect(event).toMatchObject({ action: 'admin.user_looked_up', actor_user_id: admin.userId });
      expect(testApp.logs()).not.toContain(target.email);
    });

    it('returns not found for an unknown email', async () => {
      const response = await request(server())
        .post('/api/v1/admin/users/lookup')
        .set(asAdmin())
        .send({ email: `nobody-${randomUUID()}@example.test` });
      expect(response.status).toBe(404);
      expectErrorEnvelope(response.body, 'not_found');
    });

    it('does not find a deleted user', async () => {
      const target = await fixtures.createIdentity({ roles: ['client'] });
      await fixtures.deleteUser(target.userId);
      const response = await request(server())
        .post('/api/v1/admin/users/lookup')
        .set(asAdmin())
        .send({ email: target.email });
      expect(response.status).toBe(404);
    });
  });

  describe('granting and revoking the practitioner role', () => {
    it('grants idempotently, audits once, and the new practitioner must then complete MFA', async () => {
      const target = await fixtures.createIdentity({ roles: ['client'] });

      const granted = await request(server()).put(practitionerRoute(target.userId)).set(asAdmin());
      expect(granted.status).toBe(200);
      expect(granted.body).toEqual({ userId: target.userId, roles: ['client', 'practitioner'] });

      const repeated = await request(server()).put(practitionerRoute(target.userId)).set(asAdmin());
      expect(repeated.status).toBe(200);
      expect((await fixtures.auditEventsFor(target.userId)).map(({ action }) => action)).toEqual([
        'admin.role_granted',
      ]);

      const targetToken = await signer.signAccessToken({ ...target, aal: 'aal1' });
      const me = await request(server()).get('/api/v1/me').set(asAdmin(targetToken));
      expect(me.body).toMatchObject({ isMfaRequired: true, isMfaPending: true });
    });

    it('revokes, takes effect on the next request, and audits it', async () => {
      const target = await fixtures.createIdentity({ roles: ['client', 'practitioner'] });

      const revoked = await request(server())
        .delete(practitionerRoute(target.userId))
        .set(asAdmin());

      expect(revoked.status).toBe(200);
      expect(revoked.body).toEqual({ userId: target.userId, roles: ['client'] });
      const [event] = await fixtures.auditEventsFor(target.userId);
      expect(event).toMatchObject({
        action: 'admin.role_revoked',
        details: { role: 'practitioner' },
      });
    });

    it('returns not found when granting to a user that does not exist', async () => {
      const response = await request(server()).put(practitionerRoute(randomUUID())).set(asAdmin());
      expect(response.status).toBe(404);
      expectErrorEnvelope(response.body, 'not_found');
    });

    it('rejects a user ID that is not a UUID', async () => {
      const response = await request(server()).put(practitionerRoute('1 OR 1=1')).set(asAdmin());
      expect(response.status).toBe(400);
    });

    it('offers no route to grant the admin role', async () => {
      const target = await fixtures.createIdentity({ roles: ['client'] });
      const response = await request(server())
        .put(`/api/v1/admin/users/${target.userId}/roles/admin`)
        .set(asAdmin());
      expect(response.status).toBe(404);
      expect(await fixtures.rolesOf(target.userId)).toEqual(['client']);
    });
  });

  describe('access control', () => {
    it('requires MFA', async () => {
      const token = await signer.signAccessToken({ ...admin, aal: 'aal1' });
      const response = await request(server())
        .post('/api/v1/admin/users/lookup')
        .set(asAdmin(token))
        .send({ email: admin.email });
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'mfa_required');
    });

    it('requires the admin to have accepted the current policies', async () => {
      const newAdmin = await fixtures.createIdentity({
        roles: ['admin'],
        hasAcceptedPolicies: false,
      });
      const token = await signer.signAccessToken({ ...newAdmin, aal: 'aal2' });
      const response = await request(server())
        .post('/api/v1/admin/users/lookup')
        .set(asAdmin(token))
        .send({ email: admin.email });
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'policy_acceptance_required');
    });

    it.each(['client', 'practitioner'] as const)('forbids a %s', async (role) => {
      const caller = await fixtures.createIdentity({ roles: [role] });
      const target = await fixtures.createIdentity({ roles: ['client'] });
      const token = await signer.signAccessToken({ ...caller, aal: 'aal2' });
      const response = await request(server())
        .put(practitionerRoute(target.userId))
        .set(asAdmin(token));
      expect(response.status).toBe(403);
      expectErrorEnvelope(response.body, 'forbidden');
      expect(await fixtures.rolesOf(target.userId)).toEqual(['client']);
    });

    it('requires authentication', async () => {
      const response = await request(server()).put(practitionerRoute(randomUUID()));
      expect(response.status).toBe(401);
    });
  });

  it('lets Supabase erase a user with roles, acceptances and audit history', async () => {
    const target = await fixtures.createIdentity({ roles: ['client'] });
    await request(server()).put(practitionerRoute(target.userId)).set(asAdmin());
    await fixtures.deleteUser(target.userId);
    expect(await fixtures.rolesOf(target.userId)).toEqual([]);
    expect(await fixtures.acceptancesOf(target.userId)).toEqual([]);
  });
});
