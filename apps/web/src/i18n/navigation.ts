import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Locale-aware replacements for Next's Link, redirect and router hooks. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
