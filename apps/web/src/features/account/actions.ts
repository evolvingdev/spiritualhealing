'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { commandApi } from '@/lib/api/api-client';
import { actionError, errorKeyForApiFailure, type ActionState } from '@/lib/forms/action-state';
import { emailField, newPasswordField } from '@/lib/forms/fields';
import { parseForm, readTextFields } from '@/lib/forms/form-data';

const SECURITY_PATH = '/[locale]/account/security';

const changePasswordSchema = z.object({ password: newPasswordField });
const changeEmailSchema = z.object({ email: emailField });
const removeFactorSchema = z.object({ factorId: z.uuid() });

/** Every credential change goes through the API, which requires a sign-in in the last 5 minutes. */
export async function changePassword(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState<'passwordChanged'>> {
  const parsed = parseForm(changePasswordSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors });
  }
  const result = await commandApi({ method: 'PUT', path: '/me/password', body: parsed.data });
  if (!result.ok) {
    return actionError(errorKeyForApiFailure(result), {
      fieldErrors: result.code === 'password_rejected' ? { password: 'passwordTooWeak' } : {},
    });
  }
  return { status: 'success', message: 'passwordChanged' };
}

export async function requestEmailChange(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState<'emailRequested'>> {
  const email = readTextFields(formData).email ?? '';
  const parsed = parseForm(changeEmailSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors, values: { email } });
  }
  const result = await commandApi({ method: 'POST', path: '/me/email-change', body: parsed.data });
  if (!result.ok) {
    return actionError(errorKeyForApiFailure(result), { values: { email } });
  }
  return { status: 'success', message: 'emailRequested' };
}

export async function removeMfaFactor(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState<'mfaRemoved'>> {
  const parsed = parseForm(removeFactorSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error');
  }
  const result = await commandApi({
    method: 'DELETE',
    path: `/me/mfa-factors/${encodeURIComponent(parsed.data.factorId)}`,
  });
  if (!result.ok) {
    return actionError(errorKeyForApiFailure(result));
  }
  revalidatePath(SECURITY_PATH, 'page');
  return { status: 'success', message: 'mfaRemoved' };
}
