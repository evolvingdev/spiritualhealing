import {
  auditEvents,
  type AuditAction,
  type AuditDetails,
  type Database,
} from '@spiritualhealing/db';
import type { UserId } from '@spiritualhealing/domain';

/** The database, or a transaction on it: audit events are written in the same transaction as the change. */
export type DatabaseExecutor = Pick<Database, 'insert'>;

export interface AuditEvent {
  readonly action: AuditAction;
  readonly actorUserId: UserId;
  readonly targetUserId: UserId;
  readonly correlationId: string;
  readonly details?: AuditDetails;
}

/** Appends to the security audit trail (CLAUDE.md, Observability). The runtime role cannot read it. */
export async function recordAuditEvent(
  executor: DatabaseExecutor,
  { action, actorUserId, targetUserId, correlationId, details = {} }: AuditEvent,
): Promise<void> {
  await executor.insert(auditEvents).values({
    action,
    actorUserId,
    targetUserId,
    correlationId,
    details,
  });
}
