'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { getServerEnv } from '@/config/server-env';
import { redirect } from '@/i18n/navigation';
import { commandApi } from '@/lib/api/api-client';
import { actionError, errorKeyForApiFailure, type ActionState } from '@/lib/forms/action-state';
import { emailField, newPasswordField } from '@/lib/forms/fields';
import { parseForm, readTextFields } from '@/lib/forms/form-data';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { isAuthAttemptAllowed } from '../auth-attempts';
import { platformErrorKey } from '../auth-errors';

const resetRequestSchema = z.object({ email: emailField });
const newPasswordSchema = z.object({ password: newPasswordField });

/** Always answers the same way, so it never reveals whether an account uses the address. */
export async function requestPasswordReset(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState<'sent'>> {
  const email = readTextFields(formData).email ?? '';
  const parsed = parseForm(resetRequestSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors, values: { email } });
  }
  if (!(await isAuthAttemptAllowed('reset-password', parsed.data.email))) {
    return actionError('rate_limited', { values: { email } });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: new URL('/auth/confirm', getServerEnv().siteUrl).toString(),
  });
  const platformError = error === null ? null : platformErrorKey(error);
  if (platformError !== null) {
    return actionError(platformError, { values: { email } });
  }
  return { status: 'success', message: 'sent' };
}

/**
 * Sets the new password through our API, after the recovery link signed the user in. The API
 * applies the same recent-sign-in, MFA and audit rules as any password change, and signs out the
 * user's other sessions.
 */
export async function completePasswordReset(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(newPasswordSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors });
  }
  const result = await commandApi({ method: 'PUT', path: '/me/password', body: parsed.data });
  if (!result.ok) {
    return actionError(errorKeyForApiFailure(result), {
      fieldErrors: result.code === 'password_rejected' ? { password: 'passwordTooWeak' } : {},
    });
  }
  return redirect({ href: '/account', locale: await getLocale() });
}
