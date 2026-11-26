import { hasLocale, type Messages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/** Times are shown in India Standard Time until users can choose their own (ADR 0015). */
const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

/**
 * The locale comes from the URL, as resolved by the proxy, unless a caller asked for a specific
 * one. Unknown values (the `[locale]` segment also matches stray paths) fall back to English.
 */
export default getRequestConfig(async (params) => {
  // `requestLocale` is deprecated in favour of `next/root-params`, which Next.js 16 does not
  // support inside Server Actions; every auth form is a Server Action, so it stays for now.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const candidate = params.locale ?? (await params.requestLocale);
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
  // Both catalogues share the English shape, which the AppConfig augmentation type-checks.
  const catalogue = (await import(`../messages/${locale}.json`)) as { default: Messages };
  return { locale, messages: catalogue.default, timeZone: DEFAULT_TIME_ZONE };
});
