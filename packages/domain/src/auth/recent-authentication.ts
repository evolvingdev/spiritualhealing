import { elapsedMs, MINUTE_MS } from '../time.js';
import { isMfaRequired, type MfaContext } from './access-policy.js';

/** How long a sign-in counts as "recent" for sensitive actions (changing credentials or MFA). */
export const RECENT_AUTHENTICATION_WINDOW_MS = 5 * MINUTE_MS;

/** One entry of a token's `amr` claim: how the session was authenticated, and when. */
export interface AuthenticationMethod {
  readonly method: string;
  readonly authenticatedAt: Date;
}

/**
 * Supabase `amr` methods that prove the user knew a secret or controlled their inbox or Google
 * account just now. `token_refresh`, `invite` and `email_change` deliberately do not count.
 */
const FIRST_FACTOR_METHODS: ReadonlySet<string> = new Set([
  'password',
  'otp',
  'oauth',
  'recovery',
  'magiclink',
  'email/signup',
]);

const SECOND_FACTOR_METHODS: ReadonlySet<string> = new Set(['totp']);

export interface RecentAuthenticationCheck extends MfaContext {
  readonly methods: readonly AuthenticationMethod[];
  readonly now: Date;
}

/**
 * True when the session signed in within the window. Where MFA is required (privileged roles,
 * or anyone with an authenticator), TOTP must also have been completed within it, so a stolen
 * first factor alone never authorizes a sensitive change.
 */
export function hasRecentAuthentication({
  roles,
  hasVerifiedMfaFactor,
  methods,
  now,
}: RecentAuthenticationCheck): boolean {
  const isRecent = (accepted: ReadonlySet<string>): boolean =>
    methods.some(
      ({ method, authenticatedAt }) =>
        accepted.has(method) && elapsedMs(authenticatedAt, now) < RECENT_AUTHENTICATION_WINDOW_MS,
    );
  if (!isRecent(FIRST_FACTOR_METHODS)) {
    return false;
  }
  return !isMfaRequired({ roles, hasVerifiedMfaFactor }) || isRecent(SECOND_FACTOR_METHODS);
}
