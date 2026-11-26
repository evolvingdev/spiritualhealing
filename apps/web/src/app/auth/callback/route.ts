import type { NextRequest, NextResponse } from 'next/server';
import { isAuthAttemptAllowed } from '@/features/auth/auth-attempts';
import { localeOf, redirectToPage } from '@/features/auth/route-redirects';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

const MAX_CODE_LENGTH = 512;

/** Completes Google sign-in: exchanges the PKCE code (with the verifier from our cookie). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = localeOf(request);
  const code = request.nextUrl.searchParams.get('code');
  if (code === null || code.length === 0 || code.length > MAX_CODE_LENGTH) {
    return redirectToPage(locale, '/sign-in', { error: 'oauth_failed' });
  }
  if (!(await isAuthAttemptAllowed('oauth'))) {
    return redirectToPage(locale, '/sign-in', { error: 'rate_limited' });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error !== null) {
    return redirectToPage(locale, '/sign-in', { error: 'oauth_failed' });
  }
  return redirectToPage(locale, toSafeInternalPath(request.nextUrl.searchParams.get('next')));
}
