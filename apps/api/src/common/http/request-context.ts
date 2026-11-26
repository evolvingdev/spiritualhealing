import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isUuid } from '@spiritualhealing/domain';

export const CORRELATION_ID_HEADER = 'x-request-id';

const correlationIds = new WeakMap<IncomingMessage, string>();

/**
 * Returns the request's correlation ID, assigning one on first use. An incoming ID (e.g. from the
 * Next.js server) is reused only if it is a UUID, so callers cannot inject arbitrary text into logs.
 */
export function getOrAssignCorrelationId(
  request: IncomingMessage,
  response: ServerResponse,
): string {
  const existing = correlationIds.get(request);
  if (existing !== undefined) {
    return existing;
  }
  const incoming = request.headers[CORRELATION_ID_HEADER];
  const correlationId = typeof incoming === 'string' && isUuid(incoming) ? incoming : randomUUID();
  correlationIds.set(request, correlationId);
  if (!response.headersSent) {
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
  }
  return correlationId;
}

/** Runs first on every request: assigns the correlation ID and forbids caching by default. */
export function requestContextMiddleware(
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
): void {
  getOrAssignCorrelationId(request, response);
  // API responses carry personal data; nothing may be stored by browsers or shared caches.
  response.setHeader('Cache-Control', 'no-store');
  next();
}
