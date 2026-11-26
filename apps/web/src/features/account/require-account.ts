import type { MeResponse } from '@spiritualhealing/shared';
import { redirect as redirectTo } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getMe } from './account-queries';

export interface RequireAccountOptions {
  /** This page's path, to come back to after MFA or onboarding. */
  readonly returnTo: string;
  /** Pages that are part of finishing sign-in (MFA, onboarding) pass these. */
  readonly allowMfaPending?: boolean;
  readonly allowPendingPolicies?: boolean;
}

/**
 * Gate for signed-in pages: sends the visitor to finish whatever sign-in still needs (MFA for
 * privileged roles, then policy acceptance) before showing the page. This is navigation only:
 * the API enforces every rule on each request regardless (ADR 0002: the web is not a boundary).
 */
export async function requireAccount({
  returnTo,
  allowMfaPending = false,
  allowPendingPolicies = false,
}: RequireAccountOptions): Promise<MeResponse> {
  const me = await getMe();
  const locale = await getLocale();
  if (!me.ok) {
    if (me.code === 'authentication_required') {
      // A route handler, because only it can clear the stale session cookies.
      return redirectTo(
        `/auth/session-ended?locale=${locale}&next=${encodeURIComponent(returnTo)}`,
      );
    }
    throw new Error(`Account could not be loaded: ${me.code}`);
  }
  if (me.data.isMfaPending && !allowMfaPending) {
    return redirect({ href: { pathname: '/mfa', query: { next: returnTo } }, locale });
  }
  if (me.data.pendingPolicies.length > 0 && !allowPendingPolicies) {
    return redirect({ href: { pathname: '/onboarding', query: { next: returnTo } }, locale });
  }
  return me.data;
}
