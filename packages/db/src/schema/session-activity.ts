import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { appSchema } from './app-schema.js';
import { authSessions } from '../supabase/auth-sessions.js';

/**
 * When each Supabase session last made an API request, so the API can enforce idle timeouts
 * (ADR 0022; the free Supabase plan has none). Written at most once a minute per session.
 * `last_activity_at` is the row's updated timestamp. Classification: personal (activity metadata).
 * Rows disappear with their session (sign-out, expiry, identity deletion) through the cascade.
 */
export const sessionActivity = appSchema.table('session_activity', {
  sessionId: uuid('session_id')
    .primaryKey()
    .references(() => authSessions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull(),
});
