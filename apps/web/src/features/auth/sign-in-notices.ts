import type { Messages } from 'next-intl';
import type { ErrorKey } from '@/lib/forms/action-state';

type SignInMessageKey = keyof Messages['SignIn'];

/** Why someone is being asked to sign in; only these values are honoured from the URL. */
const REASON_MESSAGES: Readonly<Record<string, SignInMessageKey>> = {
  signed_out: 'reasonSignedOut',
  session_ended: 'reasonSessionEnded',
  reauth: 'reasonReauth',
  password_changed: 'reasonPasswordChanged',
};

/** Errors a route handler may report through the URL (never free text from the URL). */
const LINK_ERRORS = [
  'link_invalid',
  'oauth_failed',
  'rate_limited',
] as const satisfies readonly ErrorKey[];

export function signInReasonMessage(reason: string | undefined): SignInMessageKey | null {
  return reason === undefined ? null : (REASON_MESSAGES[reason] ?? null);
}

export function signInLinkError(error: string | undefined): ErrorKey | null {
  return LINK_ERRORS.find((known) => known === error) ?? null;
}
