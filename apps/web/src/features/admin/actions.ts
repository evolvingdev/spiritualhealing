'use server';

import { managedUserResponseSchema, type ManagedUserResponse } from '@spiritualhealing/shared';
import { z } from 'zod';
import { queryApi, type ApiResult } from '@/lib/api/api-client';
import { actionError, errorKeyForApiFailure, type ActionState } from '@/lib/forms/action-state';
import { emailField } from '@/lib/forms/fields';
import { parseForm, readTextFields } from '@/lib/forms/form-data';

const lookupSchema = z.object({ email: emailField });
const roleChangeSchema = z.object({ userId: z.uuid(), change: z.enum(['grant', 'revoke']) });

export type AdminUserState = ActionState<'found' | 'granted' | 'revoked'> & {
  readonly user?: ManagedUserResponse;
};

function withUser(
  message: 'found' | 'granted' | 'revoked',
  result: ApiResult<ManagedUserResponse>,
  email: string,
  previousUser?: ManagedUserResponse,
): AdminUserState {
  if (!result.ok) {
    // Keep showing the account being managed when a change fails.
    const failure = actionError(errorKeyForApiFailure(result), { values: { email } });
    return previousUser === undefined ? failure : { ...failure, user: previousUser };
  }
  return { status: 'success', message, values: { email }, user: result.data };
}

/** The email goes to the API in a POST body, never a URL. The API audits every lookup. */
export async function lookUpUser(
  _previous: AdminUserState,
  formData: FormData,
): Promise<AdminUserState> {
  const email = readTextFields(formData).email ?? '';
  const parsed = parseForm(lookupSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { fieldErrors: parsed.fieldErrors, values: { email } });
  }
  const result = await queryApi({
    method: 'POST',
    path: '/admin/users/lookup',
    body: parsed.data,
    responseSchema: managedUserResponseSchema,
  });
  return withUser('found', result, email);
}

/** Grants or removes the practitioner role; the API checks admin + MFA and audits the change. */
export async function changePractitionerRole(
  previous: AdminUserState,
  formData: FormData,
): Promise<AdminUserState> {
  const email = previous.status === 'idle' ? '' : (previous.values?.email ?? '');
  const parsed = parseForm(roleChangeSchema, formData);
  if (!parsed.success) {
    return actionError('validation_error', { values: { email } });
  }
  const { userId, change } = parsed.data;
  const previousUser = previous.user;
  const result = await queryApi({
    method: change === 'grant' ? 'PUT' : 'DELETE',
    path: `/admin/users/${encodeURIComponent(userId)}/roles/practitioner`,
    responseSchema: managedUserResponseSchema,
  });
  return withUser(change === 'grant' ? 'granted' : 'revoked', result, email, previousUser);
}
