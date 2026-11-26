import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../time.js';
import type { Role } from './roles.js';
import {
  ACTIVITY_RECORDING_INTERVAL_MS,
  evaluateSession,
  isActivityRecordingDue,
  sessionLimitsFor,
} from './session-policy.js';

const STARTED_AT = new Date('2026-03-29T00:30:00Z');
const after = (ms: number, from: Date = STARTED_AT): Date => new Date(from.getTime() + ms);

describe('sessionLimitsFor', () => {
  it.each<[readonly Role[], number, number]>([
    [[], 7 * DAY_MS, 30 * DAY_MS],
    [['client'], 7 * DAY_MS, 30 * DAY_MS],
    [['practitioner'], 30 * MINUTE_MS, 12 * HOUR_MS],
    [['admin'], 30 * MINUTE_MS, 12 * HOUR_MS],
    [['client', 'practitioner'], 30 * MINUTE_MS, 12 * HOUR_MS],
  ])('roles %j → idle %d ms, lifetime %d ms', (roles, idleTimeoutMs, maxLifetimeMs) => {
    expect(sessionLimitsFor(roles)).toEqual({ idleTimeoutMs, maxLifetimeMs });
  });
});

describe('evaluateSession', () => {
  describe('client', () => {
    const roles: readonly Role[] = ['client'];

    it('is active just inside the idle timeout, measured from sign-in before any activity', () => {
      const now = after(7 * DAY_MS - 1);
      expect(evaluateSession(roles, { startedAt: STARTED_AT, lastActivityAt: null }, now)).toBe(
        'active',
      );
    });

    it('ends exactly at the idle timeout', () => {
      const lastActivityAt = after(DAY_MS);
      const now = after(7 * DAY_MS, lastActivityAt);
      expect(evaluateSession(roles, { startedAt: STARTED_AT, lastActivityAt }, now)).toBe(
        'idle_timeout',
      );
    });

    it('stays active with regular activity until the 30-day maximum', () => {
      const lastActivityAt = after(30 * DAY_MS - HOUR_MS);
      expect(
        evaluateSession(roles, { startedAt: STARTED_AT, lastActivityAt }, after(30 * DAY_MS - 1)),
      ).toBe('active');
      expect(
        evaluateSession(roles, { startedAt: STARTED_AT, lastActivityAt }, after(30 * DAY_MS)),
      ).toBe('lifetime_exceeded');
    });
  });

  describe.each<Role>(['practitioner', 'admin'])('%s', (role) => {
    it('ends after 30 idle minutes', () => {
      const lastActivityAt = after(HOUR_MS);
      const timeline = { startedAt: STARTED_AT, lastActivityAt };
      expect(evaluateSession([role], timeline, after(30 * MINUTE_MS - 1, lastActivityAt))).toBe(
        'active',
      );
      expect(evaluateSession([role], timeline, after(30 * MINUTE_MS, lastActivityAt))).toBe(
        'idle_timeout',
      );
    });

    it('ends 12 hours after sign-in even when active', () => {
      const timeline = { startedAt: STARTED_AT, lastActivityAt: after(12 * HOUR_MS - MINUTE_MS) };
      expect(evaluateSession([role], timeline, after(12 * HOUR_MS))).toBe('lifetime_exceeded');
    });
  });

  it('shortens a long client session as soon as a privileged role is granted', () => {
    const timeline = { startedAt: STARTED_AT, lastActivityAt: after(2 * DAY_MS) };
    const now = after(2 * DAY_MS + MINUTE_MS);
    expect(evaluateSession(['client'], timeline, now)).toBe('active');
    expect(evaluateSession(['client', 'practitioner'], timeline, now)).toBe('lifetime_exceeded');
  });

  it('treats activity recorded slightly in the future (clock skew) as current', () => {
    const now = after(HOUR_MS);
    const timeline = { startedAt: STARTED_AT, lastActivityAt: after(5_000, now) };
    expect(evaluateSession(['admin'], timeline, now)).toBe('active');
  });

  it('is unaffected by a DST change, because all instants are UTC', () => {
    // 2026-03-29 is the EU spring-forward date; the session started 30 minutes before it.
    const lastActivityAt = new Date('2026-03-29T00:45:00Z');
    expect(
      evaluateSession(
        ['admin'],
        { startedAt: STARTED_AT, lastActivityAt },
        new Date('2026-03-29T01:14:59.999Z'),
      ),
    ).toBe('active');
  });
});

describe('isActivityRecordingDue', () => {
  const now = new Date('2026-11-25T12:00:00Z');

  it('is due when nothing has been recorded yet', () => {
    expect(isActivityRecordingDue(null, now)).toBe(true);
  });

  it('is not due within the recording interval', () => {
    expect(isActivityRecordingDue(after(-ACTIVITY_RECORDING_INTERVAL_MS + 1, now), now)).toBe(
      false,
    );
  });

  it('is due once the interval has passed', () => {
    expect(isActivityRecordingDue(after(-ACTIVITY_RECORDING_INTERVAL_MS, now), now)).toBe(true);
  });
});
