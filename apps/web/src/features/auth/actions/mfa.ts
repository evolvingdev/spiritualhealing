'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { actionError, type ActionState } from '@/lib/forms/action-state';
import { nextField, oneTimeCodeField } from '@/lib/forms/fields';
import { parseForm } from '@/lib/forms/form-data';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { isAuthAttemptAllowed } from '../auth-attempts';
import { errorKeyForAuthError } from '../auth-errors';

const verificationSchema = z.object({
  factorId: z.uuid(),
  code: oneTimeCodeField,
  next: nextField,
});

/**
 * Starts adding an authenticator app. Unfinished earlier attempts are removed first, so stale
 * secrets do not accumulate. The secret is shown once, to this user, and never stored by us.
 */
export async function startTotpEnrollment(): Promise<ActionState<'enrollmentStarted'>> {
  const supabase = await createSupabaseServerClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError !== null) {
    return actionError(errorKeyForAuthError(listError, 'service_unavailable'));
  }
  for (const factor of factors.all) {
    if (factor.factor_type === 'totp' && factor.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error !== null) {
    return actionError(errorKeyForAuthError(error, 'service_unavailable'));
  }
  return {
    status: 'success',
    message: 'enrollmentStarted',
    values: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
  };
}

/**
 * Verifies a code from the authenticator app, which both finishes enrolment and raises this
 * session to aal2 (the level the API requires whenever MFA is required).
 */
export async function verifyTotp(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(verificationSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors });
  }
  if (!(await isAuthAttemptAllowed('verify-mfa', parsed.data.factorId))) {
    return actionError('rate_limited');
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });
  if (error !== null) {
    return actionError(errorKeyForAuthError(error, 'invalid_code'), {
      fieldErrors: { code: 'invalidCode' },
    });
  }
  return redirect({ href: toSafeInternalPath(parsed.data.next), locale: await getLocale() });
}
