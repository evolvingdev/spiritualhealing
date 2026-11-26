import type { ComponentProps } from 'react';
import { cn } from '@/lib/class-names';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'min-h-touch w-full rounded-control border border-input bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}
