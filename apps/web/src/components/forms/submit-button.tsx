'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * Disabled while its form is submitting, so a double click cannot send it twice (the API is also
 * idempotent or rate-limited). Announces the pending state to screen readers.
 */
export function SubmitButton({ children, disabled, ...props }: Omit<ButtonProps, 'type'>) {
  const { pending } = useFormStatus();
  const t = useTranslations('Common');
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          <span>{t('pleaseWait')}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
