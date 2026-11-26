'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Alert } from '@/components/ui/alert';
import type { ActionState } from '@/lib/forms/action-state';

/**
 * The form-level outcome of an action. An error takes focus so keyboard and screen-reader users
 * learn about it at once; field errors are shown next to their fields.
 */
export function FormError({ state }: { readonly state: ActionState }) {
  const t = useTranslations('Errors');
  const ref = useRef<HTMLDivElement>(null);
  const error = state.status === 'error' ? state.error : null;
  useEffect(() => {
    if (error !== null) {
      ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
    }
  }, [error, state]);
  if (error === null) {
    return null;
  }
  return (
    <div ref={ref}>
      <Alert tone="error">{t(error)}</Alert>
    </div>
  );
}
