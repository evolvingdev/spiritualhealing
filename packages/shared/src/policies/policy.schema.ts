import { z } from 'zod';

export const policyKindSchema = z.enum(['terms_of_service', 'privacy_notice', 'adult_attestation']);

export type PolicyKindDto = z.infer<typeof policyKindSchema>;

/** A policy version is the date its text took effect. */
export const policyVersionSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * The versions in force. Bump one whenever that document's text changes: every account must then
 * accept it again before using the service. The web shows these; the API accepts only these.
 */
export const CURRENT_POLICY_VERSIONS = {
  terms_of_service: '2026-11-25',
  privacy_notice: '2026-11-25',
  adult_attestation: '2026-11-25',
} as const satisfies Readonly<Record<PolicyKindDto, string>>;
