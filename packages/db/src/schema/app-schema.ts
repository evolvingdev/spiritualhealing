import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * All application tables live in `app`, not `public`, so Supabase's Data API never exposes them
 * even if it is switched back on (ADR 0004).
 */
export const appSchema = pgSchema('app');
