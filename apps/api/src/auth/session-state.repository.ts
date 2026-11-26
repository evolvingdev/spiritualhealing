import { Inject, Injectable } from '@nestjs/common';
import { sessionActivity, type Database } from '@spiritualhealing/db';
import {
  isPolicyKind,
  isRole,
  type PolicyAcceptance,
  type Role,
  type SessionId,
  type SessionTimeline,
  type UserId,
} from '@spiritualhealing/domain';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DATABASE } from '../database/database.module.js';
import { PostgresErrorCode, readPostgresCode } from '../database/postgres-error.js';

export interface SessionState {
  readonly timeline: SessionTimeline;
  readonly roles: readonly Role[];
  readonly hasVerifiedMfaFactor: boolean;
  readonly acceptedPolicies: readonly PolicyAcceptance[];
}

/**
 * The row comes back as one JSON object: Drizzle leaves timestamps as raw Postgres text, whereas
 * JSON renders them as ISO 8601, which `Date` parses reliably.
 */
const timestampSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const sessionStateSchema = z.object({
  startedAt: timestampSchema,
  lastActivityAt: timestampSchema.nullable(),
  hasVerifiedMfaFactor: z.boolean(),
  roles: z.array(z.string()),
  acceptedPolicies: z.array(z.object({ policy: z.string(), version: z.string() })),
});

@Injectable()
export class SessionStateRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Everything a request needs to be authorized, in one round trip: whether the Supabase session
   * is still live (sign-out and revocation apply immediately, ADR 0006), its timeline for the
   * timeouts, the caller's roles, whether they have an authenticator, and their policy
   * acceptances. Null when the session is not live.
   * The runtime role reads `auth` only through the SECURITY DEFINER `app.get_session_timeline`.
   */
  async findSessionState(sessionId: SessionId, userId: UserId): Promise<SessionState | null> {
    const rows = await this.db.execute<{ state: unknown }>(sql`
      select json_build_object(
        'startedAt', t.started_at,
        'lastActivityAt', t.last_activity_at,
        'hasVerifiedMfaFactor', t.has_verified_mfa_factor,
        'roles', array(
          select r.role from app.user_roles r where r.user_id = ${userId}::uuid order by r.role
        ),
        'acceptedPolicies', coalesce(
          (select json_agg(json_build_object('policy', a.policy, 'version', a.version))
             from app.policy_acceptances a where a.user_id = ${userId}::uuid),
          '[]'::json
        )
      ) as state
      from app.get_session_timeline(${sessionId}::uuid, ${userId}::uuid) as t
    `);
    const [row] = rows;
    if (row === undefined) {
      return null;
    }
    const parsed = sessionStateSchema.parse(row.state);
    return {
      timeline: { startedAt: parsed.startedAt, lastActivityAt: parsed.lastActivityAt },
      roles: parsed.roles.map(toRole),
      hasVerifiedMfaFactor: parsed.hasVerifiedMfaFactor,
      acceptedPolicies: parsed.acceptedPolicies.flatMap(({ policy, version }) =>
        // The CHECK constraint makes unknown policies unreachable; they would grant nothing anyway.
        isPolicyKind(policy) ? [{ policy, version }] : [],
      ),
    };
  }

  /** Records that the session was used at `at`. Never moves the timestamp backwards. */
  async recordActivity(sessionId: SessionId, at: Date): Promise<void> {
    try {
      await this.db
        .insert(sessionActivity)
        .values({ sessionId, lastActivityAt: at })
        .onConflictDoUpdate({
          target: sessionActivity.sessionId,
          set: { lastActivityAt: at },
          setWhere: sql`${sessionActivity.lastActivityAt} < ${at.toISOString()}::timestamptz`,
        });
    } catch (error) {
      // The session was deleted (signed out) between the check and this write: nothing to record.
      if (readPostgresCode(error) === PostgresErrorCode.foreignKeyViolation) {
        return;
      }
      throw error;
    }
  }
}

function toRole(role: string): Role {
  // The CHECK constraint makes this unreachable; failing loudly beats granting an unknown role.
  if (!isRole(role)) {
    throw new Error('user_roles contains a role the domain does not know');
  }
  return role;
}
