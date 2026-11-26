import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../migrations/', import.meta.url));

/**
 * Applies pending migrations as an explicit deploy step. Must run as Supabase's `postgres` role,
 * the only role that can reference the `auth` schema (ADR 0022).
 */
export async function migrateDatabase(migratorUrl: string): Promise<void> {
  const client = postgres(migratorUrl, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}
