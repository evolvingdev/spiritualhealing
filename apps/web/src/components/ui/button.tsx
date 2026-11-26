import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/class-names';

const buttonVariants = cva(
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-control px-4 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'bg-linear-to-r from-brand-from to-brand-to text-brand-foreground hover:from-brand-from-hover hover:to-brand-to-hover',
        secondary: 'border border-border bg-surface text-foreground hover:bg-muted',
        ghost: 'text-link underline-offset-4 hover:underline',
        danger: 'border border-danger-border bg-surface text-danger hover:bg-danger-surface',
      },
      width: { auto: '', full: 'w-full' },
    },
    defaultVariants: { variant: 'primary', width: 'auto' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child element (e.g. a link) with button styling instead of a <button>. */
    readonly asChild?: boolean;
  };

export function Button({
  className,
  variant,
  width,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, width }), className);
  if (asChild) {
    return <Slot className={classes} {...props} />;
  }
  return <button type={type ?? 'button'} className={classes} {...props} />;
}
