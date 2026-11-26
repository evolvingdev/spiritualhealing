import type { CookieOptionsWithName } from '@supabase/ssr';

/**
 * Session cookies (CLAUDE.md, Session management): HttpOnly so page scripts can never read the
 * tokens, Secure outside local development, SameSite=Lax, host-only (no Domain) and site-wide.
 * The browser never runs a Supabase client, so nothing needs JavaScript access to them.
 */
export function sessionCookieOptions(isProduction: boolean): CookieOptionsWithName {
  return { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' };
}
