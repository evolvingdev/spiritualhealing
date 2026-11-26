import { describe, expect, it } from 'vitest';
import {
  hasRecentAuthentication,
  RECENT_AUTHENTICATION_WINDOW_MS,
  type AuthenticationMethod,
} from './recent-authentication.js';
import type { Role } from './roles.js';

const NOW = new Date('2026-11-25T12:00:00Z');
const ago = (ms: number): Date => new Date(NOW.getTime() - ms);
const JUST_INSIDE = RECENT_AUTHENTICATION_WINDOW_MS - 1;
const method = (name: string, msAgo: number): AuthenticationMethod => ({
  method: name,
  authenticatedAt: ago(msAgo),
});

const check = (
  roles: readonly Role[],
  methods: readonly AuthenticationMethod[],
  hasVerifiedMfaFactor = false,
): boolean => hasRecentAuthentication({ roles, hasVerifiedMfaFactor, methods, now: NOW });

describe('hasRecentAuthentication', () => {
  describe('client', () => {
    it.each(['password', 'otp', 'oauth', 'recovery', 'magiclink', 'email/signup'])(
      'accepts a %s sign-in inside the window',
      (name) => {
        expect(check(['client'], [method(name, JUST_INSIDE)])).toBe(true);
      },
    );

    it('rejects a sign-in exactly at the end of the window', () => {
      expect(check(['client'], [method('password', RECENT_AUTHENTICATION_WINDOW_MS)])).toBe(false);
    });

    it.each(['token_refresh', 'invite', 'email_change', 'totp', 'anonymous'])(
      'does not count %s as a fresh sign-in',
      (name) => {
        expect(check(['client'], [method(name, 0)])).toBe(false);
      },
    );

    it('rejects a session with no methods', () => {
      expect(check([], [])).toBe(false);
    });

    it('uses the most recent qualifying method', () => {
      expect(check(['client'], [method('password', 60 * 60_000), method('otp', 1_000)])).toBe(true);
    });
  });

  describe.each<Role>(['practitioner', 'admin'])('%s', (role) => {
    it('requires a recent first factor and a recent TOTP', () => {
      expect(check([role], [method('password', 1_000), method('totp', 1_000)])).toBe(true);
    });

    it('rejects a recent first factor with an old TOTP', () => {
      expect(
        check([role], [method('password', 1_000), method('totp', RECENT_AUTHENTICATION_WINDOW_MS)]),
      ).toBe(false);
    });

    it('rejects a recent TOTP alone, on a session signed in long ago', () => {
      expect(check([role], [method('password', 3 * 60 * 60_000), method('totp', 1_000)])).toBe(
        false,
      );
    });
  });

  describe('client with an authenticator', () => {
    it('also needs a recent TOTP, like a privileged role', () => {
      expect(check(['client'], [method('password', 1_000)], true)).toBe(false);
      expect(check(['client'], [method('password', 1_000), method('totp', 1_000)], true)).toBe(
        true,
      );
    });
  });
});
