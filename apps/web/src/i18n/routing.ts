import { defineRouting } from 'next-intl/routing';

/** ADR 0015: English and Hindi (India) at launch. English URLs carry no prefix; Hindi is /hi-IN/... */
export const routing = defineRouting({
  locales: ['en-IN', 'hi-IN'],
  defaultLocale: 'en-IN',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
