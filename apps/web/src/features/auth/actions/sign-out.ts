'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { readTextFields } from '@/lib/forms/form-data';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export type SignInReason = 'signed_out' | 'reauth' | 'session_ended' | 'password_changed';

async function endSession(scope: 'local' | 'global'): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // Clears the cookies even if Supabase cannot be reached; the session then lapses on its own.
  await supabase.auth.signOut({ scope });
}

export async function signOut(): Promise<never> {
  await endSession('local');
  return redirect({
    href: { pathname: '/sign-in', query: { reason: 'signed_out' satisfies SignInReason } },
    locale: await getLocale(),
  });
}

/** Ends every session of this account, on every device (Supabase revokes all refresh tokens). */
export async function signOutEverywhere(): Promise<never> {
  await endSession('global');
  return redirect({
    href: { pathname: '/sign-in', query: { reason: 'signed_out' satisfies SignInReason } },
    locale: await getLocale(),
  });
}

/**
 * Re-authentication (CLAUDE.md: before sensitive actions): end this session and sign in afresh,
 * which gives the new session recent sign-in timestamps, then come back to `next`.
 */
export async function signInAgain(formData: FormData): Promise<never> {
  const next = toSafeInternalPath(readTextFields(formData).next);
  await endSession('local');
  return redirect({
    href: { pathname: '/sign-in', query: { reason: 'reauth' satisfies SignInReason, next } },
    locale: await getLocale(),
  });
}
