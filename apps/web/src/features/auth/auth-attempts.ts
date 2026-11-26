import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { readClientIp } from '@/lib/security/client-ip';
import { RateLimiter, type RateLimit } from '@/lib/security/rate-limiter';

const FIFTEEN_MINUTES_MS = 15 * 60_000;

/** Per client IP: generous enough for a shared office or family connection. */
const PER_IP: RateLimit = { limit: 30, windowMs: FIFTEEN_MINUTES_MS };
/** Per subject (an email address or MFA factor): stops guessing one account's secrets. */
const PER_SUBJECT: RateLimit = { limit: 6, windowMs: FIFTEEN_MINUTES_MS };

const attempts = new RateLimiter();

export type AuthAttempt =
  | 'sign-in'
  | 'sign-up'
  | 'request-code'
  | 'verify-code'
  | 'reset-password'
  | 'verify-mfa'
  | 'oauth';

/** Subjects are hashed so this in-memory table never holds email addresses. */
function subjectKey(subject: string): string {
  return createHash('sha256').update(subject).digest('base64url');
}

/**
 * Counts an authentication attempt against the caller's IP and, when given, its subject.
 * Supabase sees all requests from this server's IP, so these limits are what protects each user.
 */
export async function isAuthAttemptAllowed(
  attempt: AuthAttempt,
  subject?: string,
): Promise<boolean> {
  const ip = readClientIp(await headers());
  const isIpAllowed = attempts.tryConsume(`${attempt}:ip:${ip}`, PER_IP);
  const isSubjectAllowed =
    subject === undefined ||
    attempts.tryConsume(`${attempt}:subject:${subjectKey(subject)}`, PER_SUBJECT);
  return isIpAllowed && isSubjectAllowed;
}
