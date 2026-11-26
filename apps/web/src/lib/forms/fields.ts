import { emailSchema, passwordSchema } from '@spiritualhealing/shared';
import { z } from 'zod';

/**
 * Form field schemas. Validation here is for UX; the API and Supabase validate again on the
 * server (CLAUDE.md, Forms). Password and email rules come from the shared contract.
 */
export const emailField = z.string().trim().min(1, { error: 'required' }).pipe(emailSchema);

export const newPasswordField = passwordSchema;

/** Sign-in only checks presence: the password's rules are the account's, checked by Supabase. */
export const existingPasswordField = z.string().min(1, { error: 'required' }).max(1024);

export const oneTimeCodeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'invalid_code' });

export const checkedField = z.literal('on', { error: 'must_accept' });

/** Where to go afterwards; always passed through `toSafeInternalPath` before use. */
export const nextField = z.string().max(512).optional();
