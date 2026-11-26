import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrateDatabase } from '@spiritualhealing/db';
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

/** Same major version as Supabase's managed Postgres (ADR 0011). */
const POSTGRES_IMAGE = 'postgres:17-alpine';

const dbPackageFile = (path: string): URL =>
  new URL(`../../../../packages/db/${path}`, import.meta.url);

declare module 'vitest' {
  export interface ProvidedContext {
    /** Superuser connection, used only by test fixtures to arrange data. */
    fixturesDatabaseUrl: string;
    /** Least-privilege connection the API uses, exactly as in production. */
    runtimeDatabaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer | undefined;

/**
 * Starts one Postgres for the run and prepares it the way a real environment is prepared:
 * Supabase's auth tables and non-superuser `postgres` role (stubbed), then the role bootstrap and
 * the migrations, both as that `postgres` role (ADR 0022).
 */
export async function setup(project: TestProject): Promise<void> {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const superuserUrl = container.getConnectionUri();
  const adminPassword = randomBytes(16).toString('hex');
  const runtimePassword = randomBytes(16).toString('hex');

  const superuser = postgres(superuserUrl, { max: 1, onnotice: () => undefined });
  try {
    await superuser.unsafe(await readFile(dbPackageFile('test/supabase-auth-stub.sql'), 'utf8'));
    await superuser.unsafe(`ALTER ROLE postgres LOGIN PASSWORD '${adminPassword}'`);
  } finally {
    await superuser.end();
  }

  const adminUrl = urlForRole(superuserUrl, 'postgres', adminPassword);
  const admin = postgres(adminUrl, { max: 1, onnotice: () => undefined });
  try {
    await admin.unsafe(await readFile(dbPackageFile('bootstrap/roles.sql'), 'utf8'));
    await admin.unsafe(`ALTER ROLE app_runtime LOGIN PASSWORD '${runtimePassword}'`);
  } finally {
    await admin.end();
  }

  await migrateDatabase(adminUrl);

  project.provide('fixturesDatabaseUrl', superuserUrl);
  project.provide('runtimeDatabaseUrl', urlForRole(superuserUrl, 'app_runtime', runtimePassword));
}

export async function teardown(): Promise<void> {
  await container?.stop();
}

function urlForRole(baseUrl: string, role: string, password: string): string {
  const url = new URL(baseUrl);
  url.username = role;
  url.password = password;
  return url.toString();
}
