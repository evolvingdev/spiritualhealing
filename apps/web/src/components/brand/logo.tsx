import { cn } from '@/lib/class-names';

/** The Spiriteal mark from the Figma reference: a gradient circle with an "S". Decorative. */
export function LogoMark({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-16 items-center justify-center rounded-full bg-linear-to-r from-brand-from to-brand-to text-2xl font-bold text-brand-foreground',
        className,
      )}
    >
      S
    </span>
  );
}
