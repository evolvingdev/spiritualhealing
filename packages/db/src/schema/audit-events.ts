import { sql } from 'drizzle-orm';
import { bigint, check, index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';
import { appSchema } from './app-schema.js';

export const AUDIT_ACTIONS = [
  'account.onboarding_completed',
  'account.password_changed',
  'account.email_change_requested',
  'account.mfa_factor_removed',
  'admin.user_looked_up',
  'admin.role_granted',
  'admin.role_revoked',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Identifiers only (role names, factor IDs). Never personal or special-category values. */
export type AuditDetails = Readonly<Record<string, string>>;

/**
 * Append-only security audit trail (CLAUDE.md: admin actions, credential changes, personal-data
 * access). The runtime role may only insert. When an identity is erased its events are kept with
 * the user references set to null, so the trail survives without identifying them.
 */
export const auditEvents = appSchema.table(
  'audit_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    action: text('action').$type<AuditAction>().notNull(),
    actorUserId: uuid('actor_user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    targetUserId: uuid('target_user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    correlationId: uuid('correlation_id').notNull(),
    details: jsonb('details').$type<AuditDetails>().notNull().default({}),
  },
  (table) => [
    index('audit_events_target_user_id_occurred_at_idx').on(table.targetUserId, table.occurredAt),
    index('audit_events_actor_user_id_occurred_at_idx').on(table.actorUserId, table.occurredAt),
    check(
      'audit_events_action_check',
      sql.raw(`action in (${AUDIT_ACTIONS.map((action) => `'${action}'`).join(', ')})`),
    ),
  ],
);
