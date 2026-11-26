import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/class-names';

type Tone = 'error' | 'success' | 'info';

const TONE_CLASSES: Readonly<Record<Tone, string>> = {
  error: 'border-danger-border bg-danger-surface text-danger',
  success: 'border-success-border bg-success-surface text-success',
  info: 'border-info-border bg-info-surface text-foreground',
};

const TONE_ICONS = { error: CircleAlert, success: CircleCheck, info: Info } as const;

export interface AlertProps {
  readonly tone: Tone;
  readonly children: ReactNode;
  readonly id?: string;
  readonly className?: string;
}

/**
 * Errors are announced immediately (`role="alert"`); success and info politely
 * (`role="status"`). An icon accompanies the colour, so colour is never the only signal.
 */
export function Alert({ tone, children, id, className }: AlertProps) {
  const Icon = TONE_ICONS[tone];
  return (
    <div
      id={id}
      role={tone === 'error' ? 'alert' : 'status'}
      tabIndex={-1}
      className={cn(
        'flex gap-3 rounded-control border px-4 py-3 text-sm',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
