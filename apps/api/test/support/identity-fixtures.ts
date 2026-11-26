import { randomUUID } from 'node:crypto';
import type { Role } from '@spiritualhealing/domain';
import { CURRENT_POLICY_VERSIONS } from '@spiritualhealing/shared';
import postgres, { type Sql } from 'postgres';

export interface TestIdentity {
  readonly userId: string;
  readonly sessionId: string;
  readonly email: string;
}

export interface CreateIdentityOptions {
  readonly roles?: readonly Role[];
  /**
   * Whether the current Terms, Privacy Notice and age attestation are accepted. Defaults to true,
   * like every account that has finished onboarding.
   */
  readonly hasAcceptedPolicies?: boolean;
  /** When the Supabase session started (defaults to now). */
  readonly sessionCreatedAt?: Date;
  /** When set, the Supabase session expires at this time (e.g. in the past). */
  readonly sessionNotAfter?: Date;
}

export interface AuditEventRow {
  readonly action: string;
  readonly actor_user_id: string | null;
  readonly target_user_id: string | null;
  readonly correlation_id: string;
  readonly details: Record<string, string>;
}

/**
 * Arranges synthetic identities directly in the database, as Supabase Auth would, and reads back
 * what the API wrote. Every identity gets fresh random IDs, so tests stay independent without
 * truncating tables. Connects as the superuser: fixtures may do what the API role may not.
 */
export class IdentityFixtures {
  private readonly sql: Sql;

  constructor(fixturesDatabaseUrl: string) {
    this.sql = postgres(fixturesDatabaseUrl, { max: 2, onnotice: () => undefined });
  }

  async createIdentity(options: CreateIdentityOptions = {}): Promise<TestIdentity> {
    const identity = {
      userId: randomUUID(),
      sessionId: randomUUID(),
      email: `user-${randomUUID()}@example.test`,
    };
    await this
      .sql`insert into auth.users (id, email) values (${identity.userId}, ${identity.email})`;
    await this.sql`
      insert into auth.sessions (id, user_id, aal, created_at, not_after)
      values (
        ${identity.sessionId}, ${identity.userId}, 'aal1',
        ${options.sessionCreatedAt ?? new Date()}, ${options.sessionNotAfter ?? null}
      )
    `;
    for (const role of options.roles ?? []) {
      await this.insertRawRole(identity.userId, role);
    }
    if (options.hasAcceptedPolicies ?? true) {
      for (const [policy, version] of Object.entries(CURRENT_POLICY_VERSIONS)) {
        await this.sql`
          insert into app.policy_acceptances (user_id, policy, version)
          values (${identity.userId}, ${policy}, ${version})
        `;
      }
    }
    return identity;
  }

  /** A second Supabase session for an existing user (another device). */
  async createSession(userId: string): Promise<string> {
    const sessionId = randomUUID();
    await this
      .sql`insert into auth.sessions (id, user_id, aal) values (${sessionId}, ${userId}, 'aal1')`;
    return sessionId;
  }

  /** As if the user had finished setting up an authenticator app. */
  async addVerifiedMfaFactor(userId: string): Promise<void> {
    await this.sql`
      insert into auth.mfa_factors (id, user_id, status) values (${randomUUID()}, ${userId}, 'verified')
    `;
  }

  /** What Supabase does on sign-out, password change or admin revocation. */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sql`delete from auth.sessions where id = ${sessionId}`;
  }

  /** What Supabase does when an account is deleted (erasure). */
  async deleteUser(userId: string): Promise<void> {
    await this.sql`delete from auth.users where id = ${userId}`;
  }

  async insertRawRole(userId: string, role: string): Promise<void> {
    await this.sql`insert into app.user_roles (user_id, role) values (${userId}, ${role})`;
  }

  async rolesOf(userId: string): Promise<string[]> {
    const rows = await this.sql<{ role: string }[]>`
      select role from app.user_roles where user_id = ${userId} order by role
    `;
    return rows.map(({ role }) => role);
  }

  async acceptancesOf(userId: string): Promise<{ policy: string; version: string }[]> {
    return this.sql<{ policy: string; version: string }[]>`
      select policy, version from app.policy_acceptances where user_id = ${userId} order by policy
    `;
  }

  /** As if the API had last seen the session at `at`. */
  async recordActivity(sessionId: string, at: Date): Promise<void> {
    await this.sql`
      insert into app.session_activity (session_id, last_activity_at) values (${sessionId}, ${at})
      on conflict (session_id) do update set last_activity_at = excluded.last_activity_at
    `;
  }

  async lastActivityOf(sessionId: string): Promise<Date | null> {
    const rows = await this.sql<{ last_activity_at: Date }[]>`
      select last_activity_at from app.session_activity where session_id = ${sessionId}
    `;
    return rows[0]?.last_activity_at ?? null;
  }

  async auditEventsFor(targetUserId: string): Promise<AuditEventRow[]> {
    return this.sql<AuditEventRow[]>`
      select action, actor_user_id, target_user_id, correlation_id, details
      from app.audit_events where target_user_id = ${targetUserId} order by id
    `;
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}
