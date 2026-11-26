'use server';

import { CURRENT_POLICY_VERSIONS } from '@spiritualhealing/shared';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { commandApi } from '@/lib/api/api-client';
import { actionError, errorKeyForApiFailure, type ActionState } from '@/lib/forms/action-state';
import { checkedField, nextField } from '@/lib/forms/fields';
import { parseForm } from '@/lib/forms/form-data';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';

const onboardingSchema = z.object({
  adult_attestation: checkedField,
  terms_of_service: checkedField,
  privacy_notice: checkedField,
  next: nextField,
});

/**
 * Records the 18+ attestation and acceptance of the current Terms and Privacy Notice. The API
 * stores them with their versions and makes a new account a client (ADR 0022).
 */
export async function completeOnboarding(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(onboardingSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors });
  }
  const result = await commandApi({
    method: 'POST',
    path: '/me/onboarding',
    body: { acceptedPolicyVersions: CURRENT_POLICY_VERSIONS },
  });
  if (!result.ok) {
    return actionError(errorKeyForApiFailure(result));
  }
  return redirect({ href: toSafeInternalPath(parsed.data.next), locale: await getLocale() });
}
