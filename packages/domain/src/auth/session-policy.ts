import { DAY_MS, elapsedMs, HOUR_MS, MINUTE_MS } from '../time.js';
import { isMfaRequiredForRoles } from './access-policy.js';
import type { Role } from './roles.js';

export interface SessionLimits {
  /** A session with no activity for this long ends. */
  readonly idleTimeoutMs: number;
  /** A session ends this long after sign-in, however active it is. */
  readonly maxLifetimeMs: number;
}

const STANDARD_SESSION_LIMITS: SessionLimits = {
  idleTimeoutMs: 7 * DAY_MS,
  maxLifetimeMs: 30 * DAY_MS,
};

/** Practitioners and admins can reach other people's data, so their sessions are short. */
const PRIVILEGED_SESSION_LIMITS: SessionLimits = {
  idleTimeoutMs: 30 * MINUTE_MS,
  maxLifetimeMs: 12 * HOUR_MS,
};

/**
 * Activity is recorded at most this often per session, bounding writes to one per minute. Idle
 * time is therefore measured to within this interval (a session can end up to a minute early).
 */
export const ACTIVITY_RECORDING_INTERVAL_MS = MINUTE_MS;

export type SessionStatus = 'active' | 'idle_timeout' | 'lifetime_exceeded';

export interface SessionTimeline {
  readonly startedAt: Date;
  /** Null until the API has recorded activity for this session. */
  readonly lastActivityAt: Date | null;
}

/** Limits follow the roles held now, so gaining a privileged role shortens a running session. */
export function sessionLimitsFor(roles: readonly Role[]): SessionLimits {
  return isMfaRequiredForRoles(roles) ? PRIVILEGED_SESSION_LIMITS : STANDARD_SESSION_LIMITS;
}

/** Limits are exclusive: a session is over at exactly its idle timeout or maximum lifetime. */
export function evaluateSession(
  roles: readonly Role[],
  { startedAt, lastActivityAt }: SessionTimeline,
  now: Date,
): SessionStatus {
  const limits = sessionLimitsFor(roles);
  if (elapsedMs(startedAt, now) >= limits.maxLifetimeMs) {
    return 'lifetime_exceeded';
  }
  if (elapsedMs(lastActivityAt ?? startedAt, now) >= limits.idleTimeoutMs) {
    return 'idle_timeout';
  }
  return 'active';
}

export function isActivityRecordingDue(lastActivityAt: Date | null, now: Date): boolean {
  return (
    lastActivityAt === null || elapsedMs(lastActivityAt, now) >= ACTIVITY_RECORDING_INTERVAL_MS
  );
}
