import { describe, expect, it } from 'vitest';
import { meResponseSchema } from './me.schema.js';

describe('meResponseSchema', () => {
  const valid = {
    userId: '3f2b8c1e-7d4a-4b6e-9c1f-2a5d8e7b9c01',
    roles: ['client'],
    isMfaRequired: false,
    isMfaPending: false,
    pendingPolicies: [],
  };

  it('accepts the allowlisted fields', () => {
    expect(meResponseSchema.parse(valid)).toEqual(valid);
  });

  it('rejects unknown fields so nothing extra can leak into the response', () => {
    expect(() => meResponseSchema.parse({ ...valid, email: 'someone@example.test' })).toThrow();
  });

  it('rejects unknown roles', () => {
    expect(() => meResponseSchema.parse({ ...valid, roles: ['superuser'] })).toThrow();
  });

  it('rejects unknown policies', () => {
    expect(() => meResponseSchema.parse({ ...valid, pendingPolicies: ['marketing'] })).toThrow();
  });
});
