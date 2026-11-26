/** Where people land after signing in when no (valid) destination was requested. */
export const DEFAULT_SIGNED_IN_PATH = '/account';

/** Internal destinations a `next` parameter may point to (CLAUDE.md: no open redirects). */
const ALLOWED_PREFIXES: readonly string[] = [
  '/account',
  '/admin',
  '/onboarding',
  '/mfa',
  '/reset-password',
];

const MAX_PATH_LENGTH = 512;
/** Code points below this are control characters (tab, newline, NUL...). */
const FIRST_PRINTABLE_CODE_POINT = 0x20;

/** Backslashes and control characters can make browsers read a path as another host. */
function hasUnsafeCharacter(path: string): boolean {
  for (const character of path) {
    if (character === '\\' || (character.codePointAt(0) ?? 0) < FIRST_PRINTABLE_CODE_POINT) {
      return true;
    }
  }
  return false;
}

/**
 * Returns `candidate` only when it is a same-site path under an allowed prefix; otherwise the
 * default. Rejects absolute and protocol-relative URLs and unsafe characters.
 */
export function toSafeInternalPath(candidate: string | null | undefined): string {
  if (candidate === null || candidate === undefined || candidate.length > MAX_PATH_LENGTH) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  if (!candidate.startsWith('/') || candidate.startsWith('//') || hasUnsafeCharacter(candidate)) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  const url = new URL(candidate, 'https://internal.invalid');
  if (url.origin !== 'https://internal.invalid') {
    return DEFAULT_SIGNED_IN_PATH;
  }
  const isAllowed = ALLOWED_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  return isAllowed ? `${url.pathname}${url.search}` : DEFAULT_SIGNED_IN_PATH;
}
