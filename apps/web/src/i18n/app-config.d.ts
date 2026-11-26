import type messages from '../messages/en-IN.json';
import type { routing } from './routing';

/** Type-checks every translation key against the English catalogue (next-intl AppConfig). */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
