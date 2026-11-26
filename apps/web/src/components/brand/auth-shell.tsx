import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Card } from '@/components/ui/card';
import { LogoMark } from './logo';

export interface AuthShellProps {
  readonly title: string;
  readonly description?: string | undefined;
  readonly children: ReactNode;
}

/** The Figma sign-in look: soft gradient backdrop, centred white card, brand mark and title. */
export function AuthShell({ title, description, children }: AuthShellProps) {
  const t = useTranslations('Brand');
  return (
    <div className="flex min-h-dvh flex-col bg-linear-to-br from-backdrop-from to-backdrop-to">
      <header className="flex justify-end p-4">
        <LocaleSwitcher />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <div className="w-full max-w-md">
          <Card>
            <div className="mb-6 flex flex-col items-center gap-4 text-center">
              <LogoMark />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('name')}</p>
                <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
                {description === undefined ? null : (
                  <p className="mt-2 text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            {children}
          </Card>
        </div>
      </main>
    </div>
  );
}
