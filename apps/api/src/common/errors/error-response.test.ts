import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { errorEnvelopeSchema } from '@spiritualhealing/shared';
import { describe, expect, it } from 'vitest';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  PasswordRejectedError,
  PolicyVersionOutdatedError,
  RateLimitError,
  ServiceUnavailableError,
} from './app-error.js';
import { buildErrorEnvelope, classifyError, readValidationDetails } from './error-response.js';

function bodyParserError(type: string): Error {
  return Object.assign(new Error('raw body parser detail'), { type });
}

describe('classifyError', () => {
  it.each([
    [new AuthenticationError('invalid_token'), 401, 'authentication_required'],
    [new AuthorizationError('forbidden', 'x'), 403, 'forbidden'],
    [new AuthorizationError('mfa_required', 'x'), 403, 'mfa_required'],
    [new AuthorizationError('reauthentication_required', 'x'), 403, 'reauthentication_required'],
    [new AuthorizationError('policy_acceptance_required', 'x'), 403, 'policy_acceptance_required'],
    [new AuthorizationError('mfa_factor_required', 'x'), 403, 'mfa_factor_required'],
    [new NotFoundError('x'), 404, 'not_found'],
    [new PolicyVersionOutdatedError(), 409, 'policy_version_outdated'],
    [new PasswordRejectedError('x'), 400, 'password_rejected'],
    [new RateLimitError('x'), 429, 'rate_limited'],
    [new ServiceUnavailableError('x'), 503, 'service_unavailable'],
    [new NotFoundException(), 404, 'not_found'],
    [new BadRequestException(), 400, 'validation_error'],
    [new PayloadTooLargeException(), 413, 'payload_too_large'],
    [new ThrottlerException(), 429, 'rate_limited'],
    [new HttpException('teapot', HttpStatus.I_AM_A_TEAPOT), 400, 'validation_error'],
    [new HttpException('bad gateway', HttpStatus.BAD_GATEWAY), 500, 'internal_error'],
    [bodyParserError('entity.parse.failed'), 400, 'validation_error'],
    [bodyParserError('entity.too.large'), 413, 'payload_too_large'],
    [bodyParserError('something.else'), 500, 'internal_error'],
    [new Error('database exploded'), 500, 'internal_error'],
    ['a thrown string', 500, 'internal_error'],
    [undefined, 500, 'internal_error'],
  ])('maps %o to %i %s', (exception, status, code) => {
    expect(classifyError(exception)).toEqual({ status, code });
  });
});

describe('buildErrorEnvelope', () => {
  it('produces a valid envelope with a generic message', () => {
    const envelope = buildErrorEnvelope('internal_error', 'correlation-id');
    expect(errorEnvelopeSchema.parse(envelope)).toEqual(envelope);
    expect(envelope.error.message).toBe('Something went wrong. Please try again.');
  });

  it('never exposes the internal message of the original error', () => {
    const error = new AuthenticationError('inactive_session');
    const { code } = classifyError(error);
    const envelope = buildErrorEnvelope(code, 'correlation-id');
    expect(JSON.stringify(envelope)).not.toContain('inactive_session');
  });
});

describe('readValidationDetails', () => {
  const schema = z.strictObject({ email: z.email() });

  it('lists the failing paths without echoing the submitted values', () => {
    const parsed = schema.safeParse({ email: 'not-an-email-secret-value', extra: true });
    const details = readValidationDetails(new ZodValidationException(parsed.error));
    expect(details?.map(({ path }) => path).sort()).toEqual(['', 'email']);
    expect(JSON.stringify(details)).not.toContain('not-an-email-secret-value');
  });

  it('ignores errors that are not schema validation failures', () => {
    expect(readValidationDetails(new BadRequestException())).toBeUndefined();
  });

  it('adds details to the envelope only when there are some', () => {
    expect(buildErrorEnvelope('validation_error', 'id', []).error).not.toHaveProperty('details');
    expect(
      buildErrorEnvelope('validation_error', 'id', [{ path: 'email', message: 'Invalid' }]).error
        .details,
    ).toEqual([{ path: 'email', message: 'Invalid' }]);
  });
});
