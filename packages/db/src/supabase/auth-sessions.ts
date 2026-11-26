import { pgSchema, uuid } from 'drizzle-orm/pg-core';

/**
 * The part of Supabase's `auth.sessions` our foreign keys reference. Supabase owns the table, so
 * it lives outside `src/schema/` (drizzle-kit generates DDL for every table exported there).
 * `auth.users` comes from `drizzle-orm/supabase` the same way.
 */
export const authSessions = pgSchema('auth').table('sessions', {
  id: uuid('id').primaryKey(),
});
