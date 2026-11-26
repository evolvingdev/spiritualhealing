import type { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthAttemptAllowed } from '@/features/auth/auth-attempts';
import { localeOf, redirectToPage } from '@/features/auth/route-redirects';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

const confirmationSchema = z.object({
  token_hash: z.string().min(1).max(512),
  type: z.enum(['email', 'signup', 'recovery', 'email_change']),
});

const DESTINATIONS = {
  email: '/account',
  signup: '/account',
  recovery: '/reset-password',
  email_change: '/account/security',
} as const;

/**
 * Completes the links Supabase emails (sign-up confirmation, password recovery, email change):
 * verifies the one-time token hash and starts the session. The account page then sends a new
 * user through onboarding, and a recovered user to choose a new password.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = localeOf(request);
  const parsed = confirmationSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return redirectToPage(locale, '/sign-in', { error: 'link_invalid' });
  }
  if (!(await isAuthAttemptAllowed('verify-code'))) {
    return redirectToPage(locale, '/sign-in', { error: 'rate_limited' });
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: parsed.data.type,
    token_hash: parsed.data.token_hash,
  });
  if (error !== null) {
    return redirectToPage(locale, '/sign-in', { error: 'link_invalid' });
  }
  const destination = DESTINATIONS[parsed.data.type];
  return parsed.data.type === 'email_change'
    ? redirectToPage(locale, destination, { notice: 'emailConfirmed' })
    : redirectToPage(locale, destination);
}
