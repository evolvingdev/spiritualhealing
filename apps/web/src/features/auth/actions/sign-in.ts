'use server';

import { redirect as redirectExternal } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { getServerEnv } from '@/config/server-env';
import { redirect } from '@/i18n/navigation';
import { actionError, type ActionState } from '@/lib/forms/action-state';
import { emailField, existingPasswordField, nextField, oneTimeCodeField } from '@/lib/forms/fields';
import { parseForm, readTextFields } from '@/lib/forms/form-data';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { isAuthAttemptAllowed } from '../auth-attempts';
import { errorKeyForAuthError, platformErrorKey } from '../auth-errors';

const passwordSignInSchema = z.object({
  email: emailField,
  password: existingPasswordField,
  next: nextField,
});
const codeRequestSchema = z.object({ email: emailField, next: nextField });
const codeVerificationSchema = z.object({
  email: emailField,
  code: oneTimeCodeField,
  next: nextField,
});

/** Re-shown after an error, so the user does not retype it. Never includes secrets. */
function emailValue(formData: FormData): Record<string, string> {
  return { email: readTextFields(formData).email ?? '' };
}

export async function signInWithPassword(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(passwordSignInSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', {
      fieldErrors: parsed.fieldErrors,
      values: emailValue(formData),
    });
  }
  const { email, password, next } = parsed.data;
  if (!(await isAuthAttemptAllowed('sign-in', email))) {
    return actionError('rate_limited', { values: { email } });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error !== null) {
    return actionError(errorKeyForAuthError(error, 'invalid_credentials'), { values: { email } });
  }
  return redirect({ href: toSafeInternalPath(next), locale: await getLocale() });
}

/**
 * Emails a 6-digit code. Unknown addresses get an account created on verification (then
 * onboarding), so known and unknown addresses look identical to the caller.
 */
export async function requestSignInCode(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState<'codeSent'>> {
  const parsed = parseForm(codeRequestSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', {
      fieldErrors: parsed.fieldErrors,
      values: emailValue(formData),
    });
  }
  const { email, next = '' } = parsed.data;
  if (!(await isAuthAttemptAllowed('request-code', email))) {
    return actionError('rate_limited', { values: { email } });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  const platformError = error === null ? null : platformErrorKey(error);
  if (platformError !== null) {
    return actionError(platformError, { values: { email } });
  }
  return { status: 'success', message: 'codeSent', values: { email, next } };
}

export async function verifySignInCode(
  _previous: ActionState<'codeSent'>,
  formData: FormData,
): Promise<ActionState<'codeSent'>> {
  const parsed = parseForm(codeVerificationSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', {
      fieldErrors: parsed.fieldErrors,
      values: emailValue(formData),
    });
  }
  const { email, code, next } = parsed.data;
  if (!(await isAuthAttemptAllowed('verify-code', email))) {
    return actionError('rate_limited', { values: { email } });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error !== null) {
    return actionError(errorKeyForAuthError(error, 'invalid_code'), { values: { email } });
  }
  return redirect({ href: toSafeInternalPath(next), locale: await getLocale() });
}

/**
 * Starts Google sign-in (PKCE: the verifier is kept in an HttpOnly cookie). Only redirects to
 * the Supabase authorize URL for this project, never to a URL from elsewhere.
 */
export async function signInWithGoogle(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const env = getServerEnv();
  if (!env.isGoogleSignInEnabled) {
    return actionError('oauth_unavailable');
  }
  if (!(await isAuthAttemptAllowed('oauth'))) {
    return actionError('rate_limited');
  }
  const next = toSafeInternalPath(readTextFields(formData).next);
  const callback = new URL('/auth/callback', env.siteUrl);
  callback.searchParams.set('next', next);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });
  if (error !== null || new URL(data.url).origin !== new URL(env.supabaseUrl).origin) {
    return actionError('oauth_failed');
  }
  return redirectExternal(data.url);
}
