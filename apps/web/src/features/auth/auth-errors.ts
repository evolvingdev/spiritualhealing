import { isAuthError, type AuthError } from '@supabase/supabase-js';
import type { ErrorKey } from '@/lib/forms/action-state';

const RATE_LIMIT_CODES: ReadonlySet<string> = new Set([
  'over_request_rate_limit',
  'over_email_send_rate_limit',
]);
const FIRST_SERVER_ERROR_STATUS = 500;

/**
 * Turns a Supabase Auth error into a generic message key. `fallback` is the one message used for
 * every "not accepted" outcome (wrong password, unknown account, expired code), so the response
 * never reveals whether an account exists (CLAUDE.md, Authentication).
 */
export function errorKeyForAuthError(error: unknown, fallback: ErrorKey): ErrorKey {
  if (!isAuthError(error)) {
    return 'service_unavailable';
  }
  const authError: AuthError = error;
  if (authError.code !== undefined && RATE_LIMIT_CODES.has(authError.code)) {
    return 'rate_limited';
  }
  if (
    authError.name === 'AuthRetryableFetchError' ||
    (authError.status ?? 0) >= FIRST_SERVER_ERROR_STATUS
  ) {
    return 'service_unavailable';
  }
  return fallback;
}

export function isWeakPasswordError(error: unknown): boolean {
  return isAuthError(error) && error.code === 'weak_password';
}

/** Supabase limits emails per address; telling the caller would reveal the address is in use. */
export function isEmailSendLimitError(error: unknown): boolean {
  return isAuthError(error) && error.code === 'over_email_send_rate_limit';
}

/**
 * For flows that must answer identically for every address (sign-up, password reset, sign-in
 * codes): the error worth showing only when the platform itself failed. Anything about the
 * address (already registered, emailed recently) returns null and the flow reports success.
 */
export function platformErrorKey(error: unknown): 'rate_limited' | 'service_unavailable' | null {
  if (isEmailSendLimitError(error)) {
    return null;
  }
  const key = errorKeyForAuthError(error, 'internal_error');
  return key === 'rate_limited' || key === 'service_unavailable' ? key : null;
}
