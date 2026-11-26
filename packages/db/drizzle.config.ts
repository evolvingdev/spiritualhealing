import { defineConfig } from 'drizzle-kit';

// Only `db:migrate` needs a connection, as Supabase's `postgres` role (ADR 0022).
const migratorUrl = process.env['MIGRATOR_DATABASE_URL'] ?? '';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './migrations',
  // Supabase owns the `auth` schema; drizzle-kit must never generate changes for it.
  schemaFilter: ['app'],
  dbCredentials: { url: migratorUrl },
  strict: true,
  verbose: true,
});
