import { sql } from 'drizzle-orm';
import { check, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';
import { appSchema } from './app-schema.js';

export type UserRoleValue = 'client' | 'practitioner' | 'admin';

/**
 * Roles are ours, not Supabase's: never read them from `user_metadata`, which the user can edit
 * (ADR 0006). Classification: personal. Rows are removed by the cascade when the identity is erased.
 */
export const userRoles = appSchema.table(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: text('role').$type<UserRoleValue>().notNull(),
    grantedBy: uuid('granted_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    check('user_roles_role_check', sql`${table.role} in ('client', 'practitioner', 'admin')`),
  ],
);
