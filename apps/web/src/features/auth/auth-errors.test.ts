import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { errorKeyForAuthError, isWeakPasswordError, platformErrorKey } from './auth-errors';

const apiError = (status: number, code: string): AuthApiError =>
  new AuthApiError('upstream detail', status, code);

describe('errorKeyForAuthError', () => {
  it.each([
    ['wrong password', apiError(400, 'invalid_credentials')],
    ['unconfirmed email', apiError(400, 'email_not_confirmed')],
    ['unknown user', apiError(400, 'user_not_found')],
    ['expired code', apiError(403, 'otp_expired')],
  ])('uses the one generic message for a %s, so accounts cannot be probed', (_case, error) => {
    expect(errorKeyForAuthError(error, 'invalid_credentials')).toBe('invalid_credentials');
  });

  it('reports rate limiting', () => {
    expect(errorKeyForAuthError(apiError(429, 'over_request_rate_limit'), 'invalid_code')).toBe(
      'rate_limited',
    );
  });

  it.each([
    ['a network failure', new AuthRetryableFetchError('offline', 0)],
    ['a server error', apiError(500, 'unexpected_failure')],
    ['something that is not an auth error', new Error('boom')],
  ])('reports %s as temporarily unavailable', (_case, error) => {
    expect(errorKeyForAuthError(error, 'invalid_credentials')).toBe('service_unavailable');
  });
});

describe('platformErrorKey', () => {
  it.each([
    ['an existing account', apiError(422, 'user_already_exists')],
    ['the per-address email limit', apiError(429, 'over_email_send_rate_limit')],
  ])('hides %s, so the response is the same for every address', (_case, error) => {
    expect(platformErrorKey(error)).toBeNull();
  });

  it('surfaces a real outage', () => {
    expect(platformErrorKey(apiError(503, 'unexpected_failure'))).toBe('service_unavailable');
  });
});

describe('isWeakPasswordError', () => {
  it('recognises a weak password', () => {
    expect(isWeakPasswordError(apiError(422, 'weak_password'))).toBe(true);
    expect(isWeakPasswordError(apiError(422, 'validation_failed'))).toBe(false);
  });
});
