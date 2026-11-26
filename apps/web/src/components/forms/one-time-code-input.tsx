import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

/**
 * One field for a 6-digit code: works with the keyboard, paste, screen readers and the
 * platform's "fill code from email/SMS" suggestions, which split boxes often break.
 */
export function OneTimeCodeInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      className="text-center font-mono text-2xl tracking-[0.5em]"
    />
  );
}
