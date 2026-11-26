import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Prepares the local Supabase database (`pnpm supabase:start`) exactly as a real environment is
 * prepared: the role bootstrap, then our migrations, both as Supabase's `postgres` role (ADR
 * 0022). It runs against the real Supabase `auth` schema, so it proves the migrations work there.
 *
 * Local only: it refuses any host other than this machine. Run with `pnpm db:setup:local`.
 */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '[::1]']);
/** Role passwords are inlined into ALTER ROLE (DDL cannot take parameters), so they are restricted. */
const ROLE_PASSWORD_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const packageFile = (path: string): URL => new URL(`../${path}`, import.meta.url);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} is not set (see packages/db/.env.example)`);
  }
  return value;
}

function requireRolePassword(name: string): string {
  const value = requireEnv(name);
  if (!ROLE_PASSWORD_PATTERN.test(value)) {
    throw new Error(`${name} must be 16-128 characters of letters, digits, "_" or "-"`);
  }
  return value;
}

async function main(): Promise<void> {
  const adminUrl = new URL(requireEnv('LOCAL_ADMIN_DATABASE_URL'));
  if (!LOCAL_HOSTS.has(adminUrl.hostname)) {
    throw new Error(
      `Refusing to run against ${adminUrl.hostname}: this script is for local databases only`,
    );
  }
  const runtimePassword = requireRolePassword('APP_RUNTIME_PASSWORD');

  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => undefined });
  try {
    await admin.unsafe(await readFile(packageFile('bootstrap/roles.sql'), 'utf8'));
    await admin.unsafe(`ALTER ROLE app_runtime LOGIN PASSWORD '${runtimePassword}'`);
    await migrate(drizzle(admin), { migrationsFolder: fileURLToPath(packageFile('migrations/')) });
  } finally {
    await admin.end();
  }
  console.info('Local database ready: roles bootstrapped and migrations applied.');
}

await main();
