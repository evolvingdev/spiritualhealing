import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { NONCE_HEADER } from '@/lib/security/content-security-policy';
import '../globals.css';

// Self-hosted at build time by next/font: no request to Google ever reveals a visitor's IP.
const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans', display: 'swap' });
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-sans-devanagari',
  display: 'swap',
});

interface LocaleLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#4338ca' };

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: 'Metadata',
  });
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    // Nothing behind sign-in should be indexed; public pages opt back in individually.
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Reading the request makes every page render per request, so each one carries this request's
  // CSP nonce (prerendered HTML could not). Next.js applies the nonce to its own scripts.
  (await headers()).get(NONCE_HEADER);
  const t = await getTranslations('Common');
  return (
    <html lang={locale} className={`${notoSans.variable} ${notoSansDevanagari.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:shadow-card"
        >
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
