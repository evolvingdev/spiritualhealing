import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, createNonce } from './content-security-policy';

const directives = (policy: string): Map<string, string> =>
  new Map(
    policy.split('; ').map((directive) => {
      const [name = '', ...values] = directive.split(' ');
      return [name, values.join(' ')];
    }),
  );

describe('buildContentSecurityPolicy', () => {
  const production = directives(
    buildContentSecurityPolicy({ nonce: 'abc', isDevelopment: false, formActionOrigins: [] }),
  );

  it('allows scripts only with this request’s nonce, never inline or eval', () => {
    expect(production.get('script-src')).toBe("'self' 'nonce-abc' 'strict-dynamic'");
    expect(production.get('script-src')).not.toMatch(/unsafe-(inline|eval)/);
  });

  it('forbids framing, plugins and base-tag hijacking', () => {
    expect(production.get('frame-ancestors')).toBe("'none'");
    expect(production.get('object-src')).toBe("'none'");
    expect(production.get('base-uri')).toBe("'none'");
    expect(production.has('upgrade-insecure-requests')).toBe(true);
  });

  it('adds only the given OAuth hosts as form targets', () => {
    const withGoogle = directives(
      buildContentSecurityPolicy({
        nonce: 'abc',
        isDevelopment: false,
        formActionOrigins: ['https://project.supabase.co', 'https://accounts.google.com'],
      }),
    );
    expect(withGoogle.get('form-action')).toBe(
      "'self' https://project.supabase.co https://accounts.google.com",
    );
  });

  it('relaxes eval and WebSockets for hot reload in development only', () => {
    const development = directives(
      buildContentSecurityPolicy({ nonce: 'abc', isDevelopment: true, formActionOrigins: [] }),
    );
    expect(development.get('script-src')).toContain("'unsafe-eval'");
    expect(development.get('connect-src')).toContain('ws:');
    expect(development.has('upgrade-insecure-requests')).toBe(false);
  });
});

describe('createNonce', () => {
  it('is fresh and unguessable each time', () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
