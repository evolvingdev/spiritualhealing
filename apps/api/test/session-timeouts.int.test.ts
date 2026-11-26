import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { ServiceUnavailableError } from '../src/common/errors/app-error.js';
import { expectErrorEnvelope } from './support/error-envelope.js';
import { IdentityFixtures, type TestIdentity } from './support/identity-fixtures.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTokenSigner,
  type AccessTokenOptions,
  type TokenSigner,
} from './support/token-signer.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

describe('session timeouts (API, ADR 0022)', () => {
  let signer: TokenSigner;
  let fixtures: IdentityFixtures;
  let testApp: TestApp;

  const server = (): Server => testApp.app.getHttpServer();
  const getMe = async (identity: TestIdentity, options: Partial<AccessTokenOptions> = {}) => {
    const token = await signer.signAccessToken({ ...identity, ...options });
    return {
      token,
      response: await request(server()).get('/api/v1/me').set('Authorization', `Bearer ${token}`),
    };
  };

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

  describe('activity recording', () => {
    it('records activity on the first request and at most once a minute after that', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      await getMe(identity);
      const first = await fixtures.lastActivityOf(identity.sessionId);
      expect(first).not.toBeNull();

      testApp.clock.advanceBy(30_000);
      await getMe(identity);
      expect(await fixtures.lastActivityOf(identity.sessionId)).toEqual(first);

      testApp.clock.advanceBy(31_000);
      await getMe(identity);
      expect((await fixtures.lastActivityOf(identity.sessionId))?.getTime()).toBeGreaterThan(
        first?.getTime() ?? Number.POSITIVE_INFINITY,
      );
    });

    it('removes the activity record with the session (sign-out)', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      await getMe(identity);
      await fixtures.revokeSession(identity.sessionId);
      expect(await fixtures.lastActivityOf(identity.sessionId)).toBeNull();
    });
  });

  describe('client sessions', () => {
    it('stay valid through six idle days and end after seven', async () => {
      const identity = await fixtures.createIdentity({ roles: ['client'] });
      expect((await getMe(identity)).response.status).toBe(200);

      testApp.clock.advanceBy(6 * DAY_MS);
      expect((await getMe(identity)).response.status).toBe(200);

      testApp.clock.advanceBy(7 * DAY_MS);
      const { token, response } = await getMe(identity);
      expect(response.status).toBe(401);
      expectErrorEnvelope(response.body, 'authentication_required');
      expect(testApp.supabaseAuth.callsFor(token)).toContainEqual({
        operation: 'signOut',
        accessToken: token,
        scope: 'local',
      });
      expect(testApp.logs()).toContain('"reason":"idle_timeout"');
    });

    it('end 30 days after sign-in however active they are', async () => {
      const identity = await fixtures.createIdentity({
        roles: ['client'],
        sessionCreatedAt: new Date(Date.now() - 30 * DAY_MS + HOUR_MS),
      });
      await fixtures.recordActivity(identity.sessionId, new Date(Date.now() - DAY_MS));
      expect((await getMe(identity)).response.status).toBe(200);

      testApp.clock.advanceBy(HOUR_MS);
      const { response } = await getMe(identity);
      expect(response.status).toBe(401);
      expect(testApp.logs()).toContain('"reason":"lifetime_exceeded"');
    });
  });

  describe.each(['practitioner', 'admin'] as const)('%s sessions', (role) => {
    it('end after 30 idle minutes', async () => {
      const identity = await fixtures.createIdentity({ roles: [role] });
      expect((await getMe(identity, { aal: 'aal2' })).response.status).toBe(200);

      testApp.clock.advanceBy(29 * MINUTE_MS);
      expect((await getMe(identity, { aal: 'aal2' })).response.status).toBe(200);

      testApp.clock.advanceBy(30 * MINUTE_MS);
      expect((await getMe(identity, { aal: 'aal2' })).response.status).toBe(401);
    });

    it('end 12 hours after sign-in', async () => {
      const identity = await fixtures.createIdentity({
        roles: [role],
        sessionCreatedAt: new Date(Date.now() - 12 * HOUR_MS),
      });
      expect((await getMe(identity, { aal: 'aal2' })).response.status).toBe(401);
    });
  });

  it('applies the shorter limits as soon as a client becomes a practitioner', async () => {
    const identity = await fixtures.createIdentity({
      roles: ['client'],
      sessionCreatedAt: new Date(Date.now() - 2 * DAY_MS),
    });
    expect((await getMe(identity)).response.status).toBe(200);

    await fixtures.insertRawRole(identity.userId, 'practitioner');
    expect((await getMe(identity, { aal: 'aal2' })).response.status).toBe(401);
  });

  it('still rejects a timed-out session when Supabase sign-out fails', async () => {
    const identity = await fixtures.createIdentity({ roles: ['admin'] });
    await getMe(identity, { aal: 'aal2' });
    testApp.clock.advanceBy(HOUR_MS);
    testApp.supabaseAuth.failNextCallWith(new ServiceUnavailableError('Supabase down'));

    const { response } = await getMe(identity, { aal: 'aal2' });
    expect(response.status).toBe(401);
    expectErrorEnvelope(response.body, 'authentication_required');
  });

  it('times out each session separately (another device stays signed in)', async () => {
    const identity = await fixtures.createIdentity({ roles: ['client'] });
    await getMe(identity);
    testApp.clock.advanceBy(6 * DAY_MS);
    const otherSessionId = await fixtures.createSession(identity.userId);
    await getMe({ ...identity, sessionId: otherSessionId });

    testApp.clock.advanceBy(2 * DAY_MS);
    expect((await getMe(identity)).response.status).toBe(401);
    expect((await getMe({ ...identity, sessionId: otherSessionId })).response.status).toBe(200);
  });
});
