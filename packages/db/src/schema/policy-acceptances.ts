import { sql } from 'drizzle-orm';
import { check, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';
import { appSchema } from './app-schema.js';

export type PolicyKindValue = 'terms_of_service' | 'privacy_notice' | 'adult_attestation';

/**
 * Proof of which version of each policy a user accepted, and when (ADR 0016: consent records).
 * Append-only: the runtime role may insert and read, never update or delete, so there is no
 * `updated_at`. Classification: personal. Erased by the cascade when the identity is deleted.
 */
export const policyAcceptances = appSchema.table(
  'policy_acceptances',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    policy: text('policy').$type<PolicyKindValue>().notNull(),
    version: text('version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.policy, table.version] }),
    check(
      'policy_acceptances_policy_check',
      sql`${table.policy} in ('terms_of_service', 'privacy_notice', 'adult_attestation')`,
    ),
    check(
      'policy_acceptances_version_check',
      sql`${table.version} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`,
    ),
  ],
);
