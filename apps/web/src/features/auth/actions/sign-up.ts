'use server';

import { z } from 'zod';
import { getServerEnv } from '@/config/server-env';
import { actionError, type ActionState } from '@/lib/forms/action-state';
import { emailField, newPasswordField } from '@/lib/forms/fields';
import { parseForm, readTextFields } from '@/lib/forms/form-data';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { isAuthAttemptAllowed } from '../auth-attempts';
import { isWeakPasswordError, platformErrorKey } from '../auth-errors';

const signUpSchema = z.object({ email: emailField, password: newPasswordField });

/**
 * Creates the identity; Supabase emails a confirmation link. Consent and the age attestation are
 * captured right after confirmation, in onboarding, which every sign-in method shares. Whether
 * the address was new, already registered or recently emailed, the answer is the same.
 */
export async function signUp(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState<'checkInbox'>> {
  const email = readTextFields(formData).email ?? '';
  const parsed = parseForm(signUpSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors, values: { email } });
  }
  if (!(await isAuthAttemptAllowed('sign-up', parsed.data.email))) {
    return actionError('rate_limited', { values: { email } });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: new URL('/auth/confirm', getServerEnv().siteUrl).toString() },
  });
  if (isWeakPasswordError(error)) {
    return actionError('validation_error', {
      fieldErrors: { password: 'passwordTooWeak' },
      values: { email },
    });
  }
  const platformError = error === null ? null : platformErrorKey(error);
  if (platformError !== null) {
    return actionError(platformError, { values: { email } });
  }
  return { status: 'success', message: 'checkInbox' };
}
