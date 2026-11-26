import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseOptions {
  readonly url: string;
  readonly maxConnections: number;
  readonly connectTimeoutSeconds: number;
  readonly idleTimeoutSeconds: number;
}

export interface DatabaseHandle {
  readonly db: Database;
  close(): Promise<void>;
}

export function createDatabase(options: DatabaseOptions): DatabaseHandle {
  const client = postgres(options.url, {
    max: options.maxConnections,
    connect_timeout: options.connectTimeoutSeconds,
    idle_timeout: options.idleTimeoutSeconds,
    // Supabase's pooler runs in transaction mode, which cannot hold named prepared statements.
    prepare: false,
  });
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: options.connectTimeoutSeconds }),
  };
}
