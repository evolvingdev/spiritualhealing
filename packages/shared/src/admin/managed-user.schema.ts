import { z } from 'zod';
import { emailSchema } from '../auth/email.schema.js';
import { roleSchema } from '../auth/role.schema.js';

/** Body of `POST /api/v1/admin/users/lookup`. The email travels in the body, never in a URL. */
export const userLookupRequestSchema = z.strictObject({ email: emailSchema });

export type UserLookupRequest = z.infer<typeof userLookupRequestSchema>;

/** A user as an admin sees them when managing roles: an ID and roles, nothing more. */
export const managedUserResponseSchema = z.strictObject({
  userId: z.uuid(),
  roles: z.array(roleSchema),
});

export type ManagedUserResponse = z.infer<typeof managedUserResponseSchema>;
