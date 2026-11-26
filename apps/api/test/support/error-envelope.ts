import { errorEnvelopeSchema, type ErrorEnvelope } from '@spiritualhealing/shared';
import { expect } from 'vitest';

/** Asserts a response body is our error envelope with `code`, and leaks nothing internal. */
export function expectErrorEnvelope(body: unknown, code: string): ErrorEnvelope {
  const envelope = errorEnvelopeSchema.parse(body);
  expect(envelope.error.code).toBe(code);
  expect(envelope.error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.stringify(body)).not.toMatch(/stack|at .*\.ts|node_modules/i);
  return envelope;
}
