import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  AuthenticationError,
  AuthorizationError,
  PasswordRejectedError,
  RateLimitError,
  ServiceUnavailableError,
  ValidationError,
} from '../../common/errors/app-error.js';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import type { MfaFactor, SignOutScope, SupabaseAuth } from './supabase-auth.js';

const REQUEST_TIMEOUT_MS = 5_000;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_UNPROCESSABLE_CONTENT = 422;
const HTTP_TOO_MANY_REQUESTS = 429;

/** Supabase Auth error codes we react to; anything else is an unexpected failure. */
const PASSWORD_REJECTION_CODES: ReadonlySet<string> = new Set(['weak_password', 'same_password']);
/** Never revealed to the caller: an email change to a taken address looks like any other. */
const MASKED_EMAIL_CHANGE_CODES: ReadonlySet<string> = new Set(['email_exists']);
const INSUFFICIENT_AAL_CODE = 'insufficient_aal';

const errorBodySchema = z.object({
  error_code: z.string().optional(),
  code: z.unknown().optional(),
});

const userFactorsSchema = z.object({
  factors: z
    .array(z.object({ id: z.uuid(), status: z.enum(['verified', 'unverified']) }))
    .nullish(),
});

interface SupabaseFailure {
  readonly status: number;
  readonly errorCode: string | undefined;
}

class SupabaseRequestError extends Error {
  constructor(readonly failure: SupabaseFailure) {
    super(`Supabase Auth responded ${failure.status} (${failure.errorCode ?? 'no code'})`);
  }
}

/**
 * HTTP adapter for Supabase Auth's user endpoints. Upstream response bodies never reach our
 * clients: failures become typed `AppError`s with generic public messages.
 */
@Injectable()
export class SupabaseAuthClient implements SupabaseAuth {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async updatePassword(accessToken: string, password: string): Promise<void> {
    try {
      await this.request('PUT', '/user', accessToken, { password });
    } catch (error) {
      if (error instanceof SupabaseRequestError) {
        const { errorCode } = error.failure;
        if (errorCode !== undefined && PASSWORD_REJECTION_CODES.has(errorCode)) {
          throw new PasswordRejectedError(`Supabase rejected the password: ${errorCode}`);
        }
      }
      throw this.toAppError(error);
    }
  }

  async requestEmailChange(accessToken: string, email: string): Promise<void> {
    try {
      await this.request('PUT', '/user', accessToken, { email });
    } catch (error) {
      if (error instanceof SupabaseRequestError) {
        const { errorCode } = error.failure;
        if (errorCode !== undefined && MASKED_EMAIL_CHANGE_CODES.has(errorCode)) {
          return;
        }
      }
      throw this.toAppError(error);
    }
  }

  async listMfaFactors(accessToken: string): Promise<MfaFactor[]> {
    let body: unknown;
    try {
      body = await this.request('GET', '/user', accessToken);
    } catch (error) {
      throw this.toAppError(error);
    }
    const parsed = userFactorsSchema.safeParse(body);
    if (!parsed.success) {
      throw new ServiceUnavailableError('Unexpected Supabase user response', {
        cause: parsed.error,
      });
    }
    return parsed.data.factors ?? [];
  }

  async deleteMfaFactor(accessToken: string, factorId: string): Promise<void> {
    try {
      await this.request('DELETE', `/factors/${encodeURIComponent(factorId)}`, accessToken);
    } catch (error) {
      throw this.toAppError(error);
    }
  }

  async signOut(accessToken: string, scope: SignOutScope): Promise<void> {
    try {
      await this.request('POST', `/logout?scope=${scope}`, accessToken);
    } catch (error) {
      // The session is already gone, which is what signing out wants.
      if (error instanceof SupabaseRequestError && isGoneOrUnauthorized(error.failure.status)) {
        return;
      }
      throw this.toAppError(error);
    }
  }

  private async request(
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
    path: string,
    accessToken: string,
    body?: Readonly<Record<string, string>>,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      apikey: this.config.supabase.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${this.config.supabase.authUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new SupabaseRequestError({
        status: response.status,
        errorCode: readErrorCode(payload),
      });
    }
    return payload;
  }

  private toAppError(error: unknown): Error {
    if (!(error instanceof SupabaseRequestError)) {
      return new ServiceUnavailableError('Supabase Auth request failed', { cause: error });
    }
    const { status, errorCode } = error.failure;
    if (errorCode === INSUFFICIENT_AAL_CODE) {
      return new AuthorizationError('mfa_required', 'Supabase requires aal2 for this change');
    }
    if (status === HTTP_UNAUTHORIZED) {
      return new AuthenticationError('invalid_token');
    }
    if (status === HTTP_TOO_MANY_REQUESTS) {
      return new RateLimitError('Supabase Auth rate limit reached');
    }
    if (status === HTTP_BAD_REQUEST || status === HTTP_UNPROCESSABLE_CONTENT) {
      return new ValidationError(error.message);
    }
    return new ServiceUnavailableError(error.message, { cause: error });
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function readErrorCode(payload: unknown): string | undefined {
  const parsed = errorBodySchema.safeParse(payload);
  if (!parsed.success) {
    return undefined;
  }
  if (parsed.data.error_code !== undefined) {
    return parsed.data.error_code;
  }
  return typeof parsed.data.code === 'string' ? parsed.data.code : undefined;
}

function isGoneOrUnauthorized(status: number): boolean {
  return status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN || status === HTTP_NOT_FOUND;
}
