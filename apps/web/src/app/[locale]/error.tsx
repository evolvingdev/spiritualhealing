'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorPageProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

/**
 * Shown when a page fails to render. Only the opaque digest is shown (as a support reference),
 * never the error message, which may contain internal detail.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations('ErrorPage');
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <Card className="w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description', { reference: error.digest ?? '—' })}
        </p>
        <Button onClick={reset}>{t('retry')}</Button>
      </Card>
    </main>
  );
}
