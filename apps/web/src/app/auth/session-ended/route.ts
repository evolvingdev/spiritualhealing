import type { NextRequest, NextResponse } from 'next/server';
import { localeOf, redirectToPage } from '@/features/auth/route-redirects';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

/**
 * Where pages send a visitor whose session the API no longer accepts (signed out elsewhere,
 * timed out, revoked). Clears the stale cookies, then asks them to sign in again. Someone who
 * was never signed in is simply sent to sign in.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = localeOf(request, request.nextUrl.searchParams.get('locale'));
  const next = toSafeInternalPath(request.nextUrl.searchParams.get('next'));
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  if (data.session === null) {
    return redirectToPage(locale, '/sign-in', { next });
  }
  await supabase.auth.signOut({ scope: 'local' });
  return redirectToPage(locale, '/sign-in', { reason: 'session_ended', next });
}
