import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import {
  AuthenticationError,
  AuthorizationError,
  PasswordRejectedError,
  RateLimitError,
  ServiceUnavailableError,
  ValidationError,
} from '../../common/errors/app-error.js';
import { loadConfig } from '../../config/app-config.js';
import { SupabaseAuthClient } from './supabase-auth.client.js';

const config = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://unused@localhost/unused',
  SUPABASE_URL: 'https://project.supabase.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-key',
});
const TOKEN = 'user.access.token';

function respondWith(status: number, body?: unknown): MockInstance<typeof fetch> {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

describe('SupabaseAuthClient', () => {
  const client = new SupabaseAuthClient(config);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the user endpoint with the user’s token and the publishable key', async () => {
    const fetchSpy = respondWith(200, {});
    await client.updatePassword(TOKEN, 'a long enough passphrase');

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe('https://project.supabase.test/auth/v1/user');
    expect(init).toMatchObject({
      method: 'PUT',
      redirect: 'error',
      body: JSON.stringify({ password: 'a long enough passphrase' }),
      headers: { apikey: 'sb_publishable_test-key', Authorization: `Bearer ${TOKEN}` },
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [422, { error_code: 'weak_password' }, PasswordRejectedError],
    [422, { error_code: 'same_password' }, PasswordRejectedError],
    [403, { error_code: 'insufficient_aal' }, AuthorizationError],
    [401, { error_code: 'bad_jwt' }, AuthenticationError],
    [429, { error_code: 'over_request_rate_limit' }, RateLimitError],
    [422, { error_code: 'validation_failed' }, ValidationError],
    [500, { message: 'internal detail' }, ServiceUnavailableError],
    [502, undefined, ServiceUnavailableError],
  ])('maps a %i %j to %s', async (status, body, expected) => {
    respondWith(status, body);
    await expect(client.updatePassword(TOKEN, 'a long enough passphrase')).rejects.toBeInstanceOf(
      expected,
    );
  });

  it('reports a network failure or timeout as unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    await expect(client.listMfaFactors(TOKEN)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('treats an email change to a taken address as accepted, so it reveals nothing', async () => {
    respondWith(422, { error_code: 'email_exists' });
    await expect(client.requestEmailChange(TOKEN, 'taken@example.test')).resolves.toBeUndefined();
  });

  it('returns only the factor fields it validates', async () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    respondWith(200, {
      email: 'someone@example.test',
      factors: [{ id, status: 'verified', factor_type: 'totp', friendly_name: 'Phone' }],
    });
    await expect(client.listMfaFactors(TOKEN)).resolves.toEqual([{ id, status: 'verified' }]);
  });

  it('treats a user without factors as having none', async () => {
    respondWith(200, { factors: null });
    await expect(client.listMfaFactors(TOKEN)).resolves.toEqual([]);
  });

  it('rejects a malformed user response instead of trusting it', async () => {
    respondWith(200, { factors: [{ id: 'not-a-uuid', status: 'verified' }] });
    await expect(client.listMfaFactors(TOKEN)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('encodes the factor ID into the path', async () => {
    const fetchSpy = respondWith(200, {});
    await client.deleteMfaFactor(TOKEN, '../admin');
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://project.supabase.test/auth/v1/factors/..%2Fadmin',
    );
  });

  it('treats signing out an already-ended session as done', async () => {
    respondWith(401, { error_code: 'session_not_found' });
    await expect(client.signOut(TOKEN, 'local')).resolves.toBeUndefined();
  });
});
