'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/class-names';

/** Each language is named in its own script, so people can find theirs whatever is showing. */
const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = { 'en-IN': 'English', 'hi-IN': 'हिन्दी' };

export function LocaleSwitcher() {
  const t = useTranslations('Common');
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t('language')} className="flex gap-1 text-sm">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          aria-current={locale === current ? 'true' : undefined}
          className={cn(
            'flex min-h-touch items-center rounded-control px-3',
            locale === current
              ? 'font-semibold text-foreground'
              : 'text-link underline underline-offset-4 hover:no-underline',
          )}
        >
          {LANGUAGE_NAMES[locale]}
        </Link>
      ))}
    </nav>
  );
}
