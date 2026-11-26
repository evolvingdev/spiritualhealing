import { Inject, Injectable } from '@nestjs/common';
import { userRoles, type Database } from '@spiritualhealing/db';
import { isRole, parseUserId, type Role, type UserId } from '@spiritualhealing/domain';
import { and, asc, eq, sql } from 'drizzle-orm';
import { recordAuditEvent, type AuditEvent } from '../audit/audit-log.js';
import { NotFoundError } from '../common/errors/app-error.js';
import { DATABASE } from '../database/database.module.js';
import { PostgresErrorCode, readPostgresCode } from '../database/postgres-error.js';

export type AdminRoleChange = Omit<AuditEvent, 'action' | 'details'> & { readonly role: Role };

@Injectable()
export class AdminUsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Through the SECURITY DEFINER function: the runtime role never reads `auth.users` itself. */
  async findUserIdByEmail(email: string): Promise<UserId | null> {
    const rows = await this.db.execute<{ user_id: string | null }>(
      sql`select app.find_user_id_by_email(${email}) as user_id`,
    );
    const userId = rows[0]?.user_id;
    return userId === undefined || userId === null ? null : parseUserId(userId);
  }

  async findRoles(userId: UserId): Promise<Role[]> {
    const rows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .orderBy(asc(userRoles.role));
    return rows.map(({ role }) => role).filter(isRole);
  }

  async recordAuditEvent(event: AuditEvent): Promise<void> {
    await recordAuditEvent(this.db, event);
  }

  /** Idempotent. Throws `NotFoundError` when the user does not exist. */
  async grantRole({
    role,
    actorUserId,
    targetUserId,
    correlationId,
  }: AdminRoleChange): Promise<void> {
    await this.inTransactionForExistingUser(async (tx) => {
      const granted = await tx
        .insert(userRoles)
        .values({ userId: targetUserId, role, grantedBy: actorUserId })
        .onConflictDoNothing()
        .returning({ role: userRoles.role });
      if (granted.length > 0) {
        await recordAuditEvent(tx, {
          action: 'admin.role_granted',
          actorUserId,
          targetUserId,
          correlationId,
          details: { role },
        });
      }
    });
  }

  /** Idempotent: revoking a role the user (or a non-existent user) lacks changes nothing. */
  async revokeRole({
    role,
    actorUserId,
    targetUserId,
    correlationId,
  }: AdminRoleChange): Promise<void> {
    await this.inTransactionForExistingUser(async (tx) => {
      const revoked = await tx
        .delete(userRoles)
        .where(and(eq(userRoles.userId, targetUserId), eq(userRoles.role, role)))
        .returning({ role: userRoles.role });
      if (revoked.length > 0) {
        await recordAuditEvent(tx, {
          action: 'admin.role_revoked',
          actorUserId,
          targetUserId,
          correlationId,
          details: { role },
        });
      }
    });
  }

  /** A foreign-key violation on `auth.users` means the target user does not exist. */
  private async inTransactionForExistingUser(
    work: Parameters<Database['transaction']>[0],
  ): Promise<void> {
    try {
      await this.db.transaction(work);
    } catch (error) {
      if (readPostgresCode(error) === PostgresErrorCode.foreignKeyViolation) {
        throw new NotFoundError('Target user does not exist');
      }
      throw error;
    }
  }
}
