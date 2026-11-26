import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { getServerEnv } from '@/config/server-env';
import { sessionCookieOptions } from './cookie-options';

export interface RefreshedSession {
  /** Cookies the browser must store (refreshed tokens), to set on the outgoing response. */
  readonly cookies: readonly { name: string; value: string; options: CookieOptions }[];
  /** Supabase's no-store headers, sent with any response that sets auth cookies. */
  readonly headers: Readonly<Record<string, string>>;
}

/**
 * Refreshes the session tokens in the proxy, before rendering. New tokens are written into the
 * request's own cookies too, so the render in this same request uses them: rendering never needs
 * a second refresh, which would replay an already-rotated refresh token.
 */
export async function refreshSession(request: NextRequest): Promise<RefreshedSession> {
  const env = getServerEnv();
  const cookies: { name: string; value: string; options: CookieOptions }[] = [];
  let headers: Record<string, string> = {};
  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookieOptions: sessionCookieOptions(env.isProduction),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, cacheHeaders) => {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          cookies.push(cookie);
        }
        headers = { ...headers, ...cacheHeaders };
      },
    },
  });
  // Verifies the token against the project's signing keys and refreshes it when it has expired.
  await supabase.auth.getClaims();
  return { cookies, headers };
}
