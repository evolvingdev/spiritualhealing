import type { ErrorCode } from '@spiritualhealing/shared';

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVICE_UNAVAILABLE = 503;

/**
 * Base for errors our own code throws on purpose. The message is for logs only; clients get the
 * generic public message for `code` (see `error-response.ts`).
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    internalMessage: string,
    options?: ErrorOptions,
  ) {
    super(internalMessage, options);
    this.name = new.target.name;
  }
}

export type AuthenticationFailureReason =
  | 'missing_or_malformed_token'
  | 'invalid_token'
  | 'inactive_session'
  | 'idle_timeout'
  | 'lifetime_exceeded';

/** Always the same public 401, whatever the reason, so callers cannot probe session state. */
export class AuthenticationError extends AppError {
  constructor(readonly reason: AuthenticationFailureReason) {
    super(HTTP_UNAUTHORIZED, 'authentication_required', `Authentication failed: ${reason}`);
  }
}

export type AuthorizationErrorCode =
  | 'forbidden'
  | 'mfa_required'
  | 'policy_acceptance_required'
  | 'reauthentication_required'
  | 'mfa_factor_required';

export class AuthorizationError extends AppError {
  constructor(code: AuthorizationErrorCode, internalMessage: string) {
    super(HTTP_FORBIDDEN, code, internalMessage);
  }
}

/** Input a downstream service rejected after our own schema accepted it. */
export class ValidationError extends AppError {
  constructor(internalMessage: string) {
    super(HTTP_BAD_REQUEST, 'validation_error', internalMessage);
  }
}

export class NotFoundError extends AppError {
  constructor(internalMessage: string) {
    super(HTTP_NOT_FOUND, 'not_found', internalMessage);
  }
}

/** The client acted on policy text that is no longer current; it must reload and show the new one. */
export class PolicyVersionOutdatedError extends AppError {
  constructor() {
    super(HTTP_CONFLICT, 'policy_version_outdated', 'Submitted policy versions are not current');
  }
}

/** Supabase refused the new password (too weak, or the same as the current one). */
export class PasswordRejectedError extends AppError {
  constructor(internalMessage: string) {
    super(HTTP_BAD_REQUEST, 'password_rejected', internalMessage);
  }
}

export class RateLimitError extends AppError {
  constructor(internalMessage: string) {
    super(HTTP_TOO_MANY_REQUESTS, 'rate_limited', internalMessage);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(internalMessage: string, options?: ErrorOptions) {
    super(HTTP_SERVICE_UNAVAILABLE, 'service_unavailable', internalMessage, options);
  }
}
