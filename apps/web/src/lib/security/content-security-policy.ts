export const NONCE_HEADER = 'x-nonce';

const NONCE_BYTES = 16;

export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  return btoa(String.fromCharCode(...bytes));
}

export interface ContentSecurityPolicyOptions {
  readonly nonce: string;
  readonly isDevelopment: boolean;
  /** Extra navigation targets a form may lead to (the OAuth sign-in hosts). */
  readonly formActionOrigins: readonly string[];
}

/**
 * Nonce-based CSP with no 'unsafe-inline' scripts (CLAUDE.md, Headers). Next.js applies the nonce
 * to its own scripts. Development additionally needs 'unsafe-eval' and WebSockets for hot reload.
 * `style-src-attr 'unsafe-inline'` allows only inline style attributes (used by Radix for
 * positioning), never style or script elements.
 */
export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  formActionOrigins,
}: ContentSecurityPolicyOptions): string {
  const directives: Record<string, readonly string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", `'nonce-${nonce}'`],
    'style-src-attr': ["'unsafe-inline'"],
    // data: only for the TOTP QR code, which Supabase returns as an SVG data URI.
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(isDevelopment ? ['ws:'] : [])],
    'form-action': ["'self'", ...formActionOrigins],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'none'"],
    'object-src': ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (!isDevelopment) {
    policy.push('upgrade-insecure-requests');
  }
  return policy.join('; ');
}
