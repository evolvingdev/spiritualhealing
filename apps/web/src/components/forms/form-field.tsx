'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement, useId } from 'react';
import { Label } from '@/components/ui/label';
import type { FieldErrorKey } from '@/lib/forms/action-state';

export interface FormFieldProps {
  readonly label: string;
  readonly hint?: string | undefined;
  readonly error?: FieldErrorKey | undefined;
  /** The control; it receives `id`, `aria-invalid` and `aria-describedby` from the field. */
  readonly children: ReactElement<{
    id?: string | undefined;
    'aria-invalid'?: boolean | undefined;
    'aria-describedby'?: string | undefined;
  }>;
  readonly trailing?: ReactNode;
}

/** A labelled control whose hint and error are linked to it for screen readers (WCAG 3.3.1). */
export function FormField({ label, hint, error, children, trailing }: FormFieldProps) {
  const t = useTranslations('FieldErrors');
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter((value) => value !== null)
    .join(' ');
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {trailing}
      </div>
      {cloneElement(children, {
        id,
        'aria-invalid': error === undefined ? undefined : true,
        'aria-describedby': describedBy === '' ? undefined : describedBy,
      })}
      {hint === undefined ? null : (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className="text-sm font-medium text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}
