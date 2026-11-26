import { errorEnvelopeSchema, type ErrorCode } from '@spiritualhealing/shared';
import { headers } from 'next/headers';
import type { z } from 'zod';
import { getServerEnv } from '@/config/server-env';
import { readClientIp } from '@/lib/security/client-ip';
import { createSupabaseServerClient, getAccessToken } from '@/lib/supabase/server-client';

const REQUEST_TIMEOUT_MS = 10_000;
const API_PATH_PREFIX = '/api/v1';

export type ApiErrorCode = ErrorCode | 'network_error';

export interface ApiFailure {
  readonly ok: false;
  readonly status: number;
  /** A stable API error code, or `network_error` when the API could not be reached. */
  readonly code: ApiErrorCode;
  readonly fieldErrors: Readonly<Record<string, string>>;
}

export type ApiResult<T> = { readonly ok: true; readonly data: T } | ApiFailure;

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiRequest {
  readonly method: Method;
  readonly path: string;
  readonly body?: unknown;
}

/** A request whose response body is validated (CLAUDE.md: validate API data at the boundary). */
export async function queryApi<T>(
  request: ApiRequest & { readonly responseSchema: z.ZodType<T> },
): Promise<ApiResult<T>> {
  const response = await send(request);
  if (!(response instanceof Response)) {
    return response;
  }
  if (!response.ok) {
    return toFailure(response.status, await readJson(response));
  }
  const parsed = request.responseSchema.safeParse(await readJson(response));
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, status: response.status, code: 'internal_error', fieldErrors: {} };
}

/** A request answered with no content (204 / 202). */
export async function commandApi(request: ApiRequest): Promise<ApiResult<null>> {
  const response = await send(request);
  if (!(response instanceof Response)) {
    return response;
  }
  return response.ok
    ? { ok: true, data: null }
    : toFailure(response.status, await readJson(response));
}

/**
 * Calls our API from the Next.js server with the signed-in user's access token. The browser never
 * calls the API itself. The client IP is forwarded for the API's rate limits, and a fresh
 * correlation ID ties both servers' logs together.
 */
async function send(request: ApiRequest): Promise<Response | ApiFailure> {
  const accessToken = await getAccessToken(await createSupabaseServerClient());
  if (accessToken === null) {
    return { ok: false, status: 401, code: 'authentication_required', fieldErrors: {} };
  }
  const requestHeaders = await headers();
  try {
    return await fetch(`${getServerEnv().apiInternalUrl}${API_PATH_PREFIX}${request.path}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'X-Request-Id': crypto.randomUUID(),
        'X-Forwarded-For': readClientIp(requestHeaders),
        ...(request.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: request.body === undefined ? null : JSON.stringify(request.body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: 0, code: 'network_error', fieldErrors: {} };
  }
}

export function toFailure(status: number, body: unknown): ApiFailure {
  const envelope = errorEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return { ok: false, status, code: 'internal_error', fieldErrors: {} };
  }
  const { code, details = [] } = envelope.data.error;
  return {
    ok: false,
    status,
    code,
    fieldErrors: Object.fromEntries(details.map(({ path, message }) => [path, message])),
  };
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
