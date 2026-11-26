import { describe, expect, it } from 'vitest';
import { extractBearerToken, MAX_ACCESS_TOKEN_LENGTH } from './bearer-token.js';

const TOKEN = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl';

describe('extractBearerToken', () => {
  it.each([`Bearer ${TOKEN}`, `bearer ${TOKEN}`, `BEARER ${TOKEN}`])('accepts %s', (header) => {
    expect(extractBearerToken(header)).toBe(TOKEN);
  });

  it.each([
    undefined,
    '',
    'Bearer',
    'Bearer ',
    TOKEN,
    `Basic ${TOKEN}`,
    `Bearer  ${TOKEN}`,
    `Bearer ${TOKEN} extra`,
    `Bearer ${TOKEN}\n`,
    'Bearer not-a-jwt',
    'Bearer a.b',
    "Bearer a.b.c' OR '1'='1",
  ])('rejects %j', (header) => {
    expect(extractBearerToken(header)).toBeNull();
  });

  it('rejects oversized headers before matching', () => {
    const huge = `Bearer ${'a'.repeat(MAX_ACCESS_TOKEN_LENGTH)}.b.c`;
    expect(extractBearerToken(huge)).toBeNull();
  });
});
