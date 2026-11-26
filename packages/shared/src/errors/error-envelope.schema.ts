import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'validation_error',
  'authentication_required',
  'forbidden',
  'mfa_required',
  'reauthentication_required',
  'policy_acceptance_required',
  'policy_version_outdated',
  'mfa_factor_required',
  'password_rejected',
  'not_found',
  'payload_too_large',
  'rate_limited',
  'service_unavailable',
  'internal_error',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorDetailSchema = z.strictObject({
  path: z.string(),
  message: z.string(),
});

export const errorEnvelopeSchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
    correlationId: z.string(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
