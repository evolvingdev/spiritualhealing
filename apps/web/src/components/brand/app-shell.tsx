import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/actions/sign-out';
import { Link } from '@/i18n/navigation';
import { LogoMark } from './logo';

/** Layout for signed-in pages: brand, language, sign out, and the page content. */
export function AppShell({ children }: { readonly children: ReactNode }) {
  const t = useTranslations();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link href="/account" className="flex min-h-touch items-center gap-3 rounded-control">
            <LogoMark className="size-9 text-base" />
            <span className="text-lg font-semibold">{t('Brand.name')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                <LogOut aria-hidden="true" className="size-4" />
                {t('Common.signOut')}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-4xl px-4 py-6 text-sm text-muted-foreground">
        <p>{t('Common.notMedicalAdvice')}</p>
        <p className="mt-2 flex gap-4">
          <Link
            href="/legal/terms"
            className="text-link underline underline-offset-4 hover:no-underline"
          >
            {t('Legal.terms')}
          </Link>
          <Link
            href="/legal/privacy"
            className="text-link underline underline-offset-4 hover:no-underline"
          >
            {t('Legal.privacy')}
          </Link>
        </p>
      </footer>
    </div>
  );
}
