import { describe, expect, it } from 'vitest';
import { DEFAULT_SIGNED_IN_PATH, toSafeInternalPath } from './safe-redirect';

describe('toSafeInternalPath', () => {
  it.each([
    '/account',
    '/account/security',
    '/admin/practitioners',
    '/mfa?next=%2Faccount',
    '/onboarding',
  ])('keeps the allowed internal path %s', (path) => {
    expect(toSafeInternalPath(path)).toBe(path);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['an absolute URL', 'https://evil.example/account'],
    ['a protocol-relative URL', '//evil.example/account'],
    ['a backslash trick', '/\\evil.example'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['an encoded newline', '/account\n//evil.example'],
    ['a tab', '/acc\tount'],
    ['a path outside the allowlist', '/api/v1/me'],
    ['a prefix look-alike', '/accounts-and-more'],
    ['a relative path', 'account'],
    ['a path traversal out of the allowlist', '/account/../api'],
    ['an overlong value', `/account/${'a'.repeat(600)}`],
  ])('falls back to the default for %s', (_case, path) => {
    expect(toSafeInternalPath(path)).toBe(DEFAULT_SIGNED_IN_PATH);
  });
});
