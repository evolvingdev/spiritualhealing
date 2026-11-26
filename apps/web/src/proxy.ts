import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/config/server-env';
import { routing } from '@/i18n/routing';
import {
  buildContentSecurityPolicy,
  createNonce,
  NONCE_HEADER,
} from '@/lib/security/content-security-policy';
import { refreshSession } from '@/lib/supabase/refresh-session';

const handleLocale = createIntlMiddleware(routing);

/** Route handlers that complete Supabase flows; they are not localised pages. */
const AUTH_ROUTE_PREFIX = '/auth/';
const GOOGLE_SIGN_IN_ORIGIN = 'https://accounts.google.com';

/**
 * Runs before every page: refreshes the Supabase session, issues the per-request CSP nonce, and
 * resolves the locale. It is not a security boundary: authorization happens only in the API.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const env = getServerEnv();
  const nonce = createNonce();
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    isDevelopment: !env.isProduction,
    formActionOrigins: env.isGoogleSignInEnabled
      ? [new URL(env.supabaseUrl).origin, GOOGLE_SIGN_IN_ORIGIN]
      : [],
  });

  const session = await refreshSession(request);
  const headers = new Headers(request.headers);
  headers.set(NONCE_HEADER, nonce);
  headers.set('content-security-policy', contentSecurityPolicy);

  const response = request.nextUrl.pathname.startsWith(AUTH_ROUTE_PREFIX)
    ? NextResponse.next({ request: { headers } })
    : handleLocale(new NextRequest(request, { headers }));

  for (const { name, value, options } of session.cookies) {
    response.cookies.set(name, value, options);
  }
  for (const [key, value] of Object.entries(session.headers)) {
    response.headers.set(key, value);
  }
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  // Everything except Next's static assets and files with an extension (icons, manifest).
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
