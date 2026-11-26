import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/config/server-env';
import { sessionCookieOptions } from './cookie-options';

/**
 * A Supabase client bound to this request's session cookies, for server components, server
 * actions and route handlers. Create one per request: it carries that request's session.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const env = getServerEnv();
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookieOptions: sessionCookieOptions(env.isProduction),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. The proxy refreshes the session on every
          // request, so a refresh attempted during rendering is safely retried there.
        }
      },
    },
  });
}

/** The current access token, for calls to our API (which verifies it on every request). */
export async function getAccessToken(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
