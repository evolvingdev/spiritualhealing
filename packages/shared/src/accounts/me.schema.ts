import { z } from 'zod';
import { roleSchema } from '../auth/role.schema.js';
import { policyKindSchema } from '../policies/policy.schema.js';

/** Response of `GET /api/v1/me`: who the caller is and what they must still do before using the app. */
export const meResponseSchema = z.strictObject({
  userId: z.uuid(),
  roles: z.array(roleSchema),
  /** The caller's roles require MFA (practitioner, admin). */
  isMfaRequired: z.boolean(),
  /** MFA is required but this session has not completed it. */
  isMfaPending: z.boolean(),
  /** Policies whose current version the caller has not accepted; empty once onboarding is done. */
  pendingPolicies: z.array(policyKindSchema),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
