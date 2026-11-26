import { z } from 'zod';
import { emailSchema } from '../auth/email.schema.js';
import { passwordSchema } from '../auth/password.schema.js';

/** Body of `PUT /api/v1/me/password` (also used to finish a password reset). */
export const changePasswordRequestSchema = z.strictObject({ password: passwordSchema });

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

/** Body of `POST /api/v1/me/email-change`. Supabase then confirms the change by email. */
export const changeEmailRequestSchema = z.strictObject({ email: emailSchema });

export type ChangeEmailRequest = z.infer<typeof changeEmailRequestSchema>;

/** Path parameter of `DELETE /api/v1/me/mfa-factors/:factorId`. */
export const mfaFactorIdSchema = z.uuid();
