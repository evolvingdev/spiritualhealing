import type { ReactNode } from 'react';
import { AppShell } from '@/components/brand/app-shell';

/** Signed-in pages. Each page calls `requireAccount` itself, so it can say where to return. */
export default function SignedInLayout({ children }: { readonly children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
