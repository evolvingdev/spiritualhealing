import { z } from 'zod';
import { policyVersionSchema } from '../policies/policy.schema.js';

/**
 * Body of `POST /api/v1/me/onboarding`: the version of each document the user was shown and
 * accepted, including the "I am 18 or older" attestation. Every policy must be present.
 */
export const completeOnboardingRequestSchema = z.strictObject({
  acceptedPolicyVersions: z.strictObject({
    terms_of_service: policyVersionSchema,
    privacy_notice: policyVersionSchema,
    adult_attestation: policyVersionSchema,
  }),
});

export type CompleteOnboardingRequest = z.infer<typeof completeOnboardingRequestSchema>;
