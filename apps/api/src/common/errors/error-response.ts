import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode, ErrorEnvelope } from '@spiritualhealing/shared';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

/** Safe, generic messages. Clients localise by `code`; these never contain internal detail. */
const PUBLIC_ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  validation_error: 'The request is invalid.',
  authentication_required: 'Please sign in to continue.',
  forbidden: 'You do not have permission to do this.',
  mfa_required: 'Please complete multi-factor authentication to continue.',
  reauthentication_required: 'For your security, please sign in again to continue.',
  policy_acceptance_required: 'Please review and accept the current terms to continue.',
  policy_version_outdated: 'The terms have been updated. Please review them again.',
  mfa_factor_required: 'Your role requires at least one authenticator app.',
  password_rejected: 'Please choose a different password.',
  not_found: 'The requested resource was not found.',
  payload_too_large: 'The request is too large.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  service_unavailable: 'The service is temporarily unavailable. Please try again shortly.',
  internal_error: 'Something went wrong. Please try again.',
};

const ERROR_CODES_BY_STATUS: ReadonlyMap<number, ErrorCode> = new Map<number, ErrorCode>([
  [HttpStatus.BAD_REQUEST, 'validation_error'],
  [HttpStatus.UNAUTHORIZED, 'authentication_required'],
  [HttpStatus.FORBIDDEN, 'forbidden'],
  [HttpStatus.NOT_FOUND, 'not_found'],
  [HttpStatus.PAYLOAD_TOO_LARGE, 'payload_too_large'],
  [HttpStatus.TOO_MANY_REQUESTS, 'rate_limited'],
  [HttpStatus.SERVICE_UNAVAILABLE, 'service_unavailable'],
]);

/** Error `type` values set by Express's body parser (it does not throw HttpExceptions). */
const BODY_PARSER_ERRORS: ReadonlyMap<string, ClassifiedError> = new Map([
  ['entity.parse.failed', { status: HttpStatus.BAD_REQUEST, code: 'validation_error' }],
  ['entity.too.large', { status: HttpStatus.PAYLOAD_TOO_LARGE, code: 'payload_too_large' }],
  ['encoding.unsupported', { status: HttpStatus.BAD_REQUEST, code: 'validation_error' }],
  ['charset.unsupported', { status: HttpStatus.BAD_REQUEST, code: 'validation_error' }],
]);

const FIRST_CLIENT_ERROR_STATUS = 400;
const FIRST_SERVER_ERROR_STATUS = 500;

export function isServerError(status: number): boolean {
  return status >= FIRST_SERVER_ERROR_STATUS;
}

const INTERNAL_ERROR: ClassifiedError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'internal_error',
};

export interface ClassifiedError {
  readonly status: number;
  readonly code: ErrorCode;
}

export function classifyError(exception: unknown): ClassifiedError {
  if (exception instanceof AppError) {
    return { status: exception.status, code: exception.code };
  }
  if (exception instanceof HttpException) {
    return classifyHttpStatus(exception.getStatus());
  }
  const bodyParserType = readBodyParserErrorType(exception);
  if (bodyParserType !== undefined) {
    return BODY_PARSER_ERRORS.get(bodyParserType) ?? INTERNAL_ERROR;
  }
  return INTERNAL_ERROR;
}

export interface ErrorDetail {
  readonly path: string;
  readonly message: string;
}

export function buildErrorEnvelope(
  code: ErrorCode,
  correlationId: string,
  details?: readonly ErrorDetail[],
): ErrorEnvelope {
  const message = PUBLIC_ERROR_MESSAGES[code];
  return details === undefined || details.length === 0
    ? { error: { code, message, correlationId } }
    : { error: { code, message, details: [...details], correlationId } };
}

/**
 * Field-level problems for a failed schema validation, so forms can point at the right field.
 * Only paths and Zod's messages leave, never the submitted values.
 */
export function readValidationDetails(exception: unknown): ErrorDetail[] | undefined {
  if (!(exception instanceof ZodValidationException)) {
    return undefined;
  }
  const zodError = exception.getZodError();
  if (!(zodError instanceof ZodError)) {
    return undefined;
  }
  return zodError.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

function classifyHttpStatus(status: number): ClassifiedError {
  const code = ERROR_CODES_BY_STATUS.get(status);
  if (code !== undefined) {
    return { status, code };
  }
  if (status >= FIRST_CLIENT_ERROR_STATUS && !isServerError(status)) {
    return { status: HttpStatus.BAD_REQUEST, code: 'validation_error' };
  }
  return INTERNAL_ERROR;
}

function readBodyParserErrorType(exception: unknown): string | undefined {
  if (!(exception instanceof Error)) {
    return undefined;
  }
  const type: unknown = Reflect.get(exception, 'type');
  return typeof type === 'string' ? type : undefined;
}
