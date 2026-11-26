import { meResponseSchema, type MeResponse } from '@spiritualhealing/shared';
import type { Factor } from '@supabase/supabase-js';
import { cache } from 'react';
import { queryApi, type ApiResult } from '@/lib/api/api-client';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

/** The caller as the API sees them. Deduplicated per request (React `cache`), never cached across. */
export const getMe = cache((): Promise<ApiResult<MeResponse>> =>
  queryApi({ method: 'GET', path: '/me', responseSchema: meResponseSchema }),
);

/** The signed-in email, verified with Supabase (not just read from the cookie). */
export const getSignedInEmail = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
});

export const listVerifiedTotpFactors = cache(async (): Promise<Factor[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error !== null) {
    throw new Error('Could not list MFA factors', { cause: error });
  }
  return data.totp;
});
