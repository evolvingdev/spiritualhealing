import type { Messages } from 'next-intl';
import type { ApiErrorCode, ApiFailure } from '@/lib/api/api-client';

export type ErrorKey = keyof Messages['Errors'];
export type FieldErrorKey = keyof Messages['FieldErrors'];

/**
 * What a server action tells its form. Actions return message keys, never text, so every string
 * is translated in the component (ADR 0015). `values` echoes back safe fields (never passwords or
 * codes) so the form keeps the user's input after an error (CLAUDE.md, Forms).
 */
export type ActionState<Success extends string = string> =
  | { readonly status: 'idle' }
  | {
      readonly status: 'success';
      readonly message: Success;
      /** Data the next step of the form needs, e.g. the email a code was sent to. */
      readonly values?: Readonly<Record<string, string>>;
    }
  | {
      readonly status: 'error';
      readonly error: ErrorKey;
      readonly fieldErrors: Readonly<Record<string, FieldErrorKey>>;
      readonly values: Readonly<Record<string, string>>;
    };

export const IDLE: ActionState<never> = { status: 'idle' };

export function actionError(
  error: ErrorKey,
  options: {
    readonly fieldErrors?: Readonly<Record<string, FieldErrorKey>>;
    readonly values?: Readonly<Record<string, string>>;
  } = {},
): ActionState<never> {
  return {
    status: 'error',
    error,
    fieldErrors: options.fieldErrors ?? {},
    values: options.values ?? {},
  };
}

const API_ERROR_KEYS: Readonly<Record<ApiErrorCode, ErrorKey>> = {
  validation_error: 'validation_error',
  authentication_required: 'authentication_required',
  forbidden: 'forbidden',
  mfa_required: 'mfa_required',
  reauthentication_required: 'reauthentication_required',
  policy_acceptance_required: 'policy_acceptance_required',
  policy_version_outdated: 'policy_version_outdated',
  mfa_factor_required: 'mfa_factor_required',
  password_rejected: 'password_rejected',
  not_found: 'not_found',
  payload_too_large: 'payload_too_large',
  rate_limited: 'rate_limited',
  service_unavailable: 'service_unavailable',
  internal_error: 'internal_error',
  network_error: 'network_error',
};

export function errorKeyForApiFailure(failure: ApiFailure): ErrorKey {
  return API_ERROR_KEYS[failure.code];
}
