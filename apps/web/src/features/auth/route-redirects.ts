import { hasLocale } from 'next-intl';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerEnv } from '@/config/server-env';
import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

/** next-intl remembers the visitor's language in this cookie. */
const LOCALE_COOKIE = 'NEXT_LOCALE';

export function localeOf(request: NextRequest, explicit?: string | null): Locale {
  const candidate = explicit ?? request.cookies.get(LOCALE_COOKIE)?.value;
  return hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
}

/**
 * Redirects to a page of this site in the visitor's language. Always built on SITE_URL, never on
 * the request's Host header, so a forged Host cannot turn this into an open redirect.
 */
export function redirectToPage(
  locale: Locale,
  pathname: string,
  query: Readonly<Record<string, string>> = {},
): NextResponse {
  const path = getPathname({ href: { pathname, query: { ...query } }, locale });
  return NextResponse.redirect(new URL(path, getServerEnv().siteUrl), { status: 303 });
}
