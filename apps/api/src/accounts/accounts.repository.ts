import { Inject, Injectable } from '@nestjs/common';
import { policyAcceptances, userRoles, type Database } from '@spiritualhealing/db';
import { POLICY_KINDS, type PolicyVersions, type UserId } from '@spiritualhealing/domain';
import { sql } from 'drizzle-orm';
import { recordAuditEvent, type AuditEvent } from '../audit/audit-log.js';
import { DATABASE } from '../database/database.module.js';

/** Self-registered accounts become clients; other roles are only ever granted by an admin. */
const SELF_REGISTERED_ROLE = 'client';

@Injectable()
export class AccountsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Records the accepted policy versions and, for an account with no role yet, grants `client`,
   * in one transaction, audited when anything changed. Idempotent: a repeat changes nothing.
   */
  async completeOnboarding(
    userId: UserId,
    accepted: PolicyVersions,
    correlationId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const newAcceptances = await tx
        .insert(policyAcceptances)
        .values(POLICY_KINDS.map((policy) => ({ userId, policy, version: accepted[policy] })))
        .onConflictDoNothing()
        .returning({ policy: policyAcceptances.policy });
      const roleGrant = await tx.execute(sql`
        insert into ${userRoles} (user_id, role)
        select ${userId}::uuid, ${SELF_REGISTERED_ROLE}
        where not exists (select 1 from ${userRoles} where user_id = ${userId}::uuid)
        on conflict do nothing
      `);
      if (newAcceptances.length === 0 && roleGrant.count === 0) {
        return;
      }
      await recordAuditEvent(tx, {
        action: 'account.onboarding_completed',
        actorUserId: userId,
        targetUserId: userId,
        correlationId,
        details: { ...accepted },
      });
    });
  }

  async recordAuditEvent(event: AuditEvent): Promise<void> {
    await recordAuditEvent(this.db, event);
  }
}
