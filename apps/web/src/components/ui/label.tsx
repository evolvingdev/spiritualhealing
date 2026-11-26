'use client';

import { Root } from '@radix-ui/react-label';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/class-names';

export function Label({ className, ...props }: ComponentProps<typeof Root>) {
  return <Root className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}
