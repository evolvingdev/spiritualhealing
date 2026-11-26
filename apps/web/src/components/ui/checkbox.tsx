'use client';

import { Indicator, Root } from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/class-names';

/** Radix checkbox: keyboard and screen-reader support, and it submits "on" with its form. */
export function Checkbox({ className, ...props }: ComponentProps<typeof Root>) {
  return (
    <Root
      className={cn(
        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-input bg-surface aria-invalid:border-danger data-[state=checked]:border-brand-from data-[state=checked]:bg-brand-from data-[state=checked]:text-brand-foreground',
        className,
      )}
      {...props}
    >
      <Indicator>
        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
      </Indicator>
    </Root>
  );
}
