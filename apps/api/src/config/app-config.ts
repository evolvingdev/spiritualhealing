import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
const DEFAULT_PORT = 3001;
const DEFAULT_DATABASE_POOL_MAX = 10;
const MAX_TRUSTED_PROXY_HOPS = 5;
const MAX_PUBLISHABLE_KEY_LENGTH = 2048;

export type LogLevel = (typeof LOG_LEVELS)[number];
export type Environment = 'development' | 'test' | 'production';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65_535).default(DEFAULT_PORT),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(DEFAULT_DATABASE_POOL_MAX),
    SUPABASE_URL: z.url({ protocol: /^https?$/ }),
    // Public by design (it identifies the project, it grants nothing), but kept server-side so the
    // browser never talks to Supabase directly (ADR 0022).
    SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .min(1)
      .max(MAX_PUBLISHABLE_KEY_LENGTH)
      .regex(/^[\w.-]+$/),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(MAX_TRUSTED_PROXY_HOPS).default(0),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production' && !env.SUPABASE_URL.startsWith('https://')) {
      context.addIssue({
        code: 'custom',
        path: ['SUPABASE_URL'],
        message: 'must use https in production',
      });
    }
  });

export interface SupabaseConfig {
  /** Base URL of Supabase Auth (`<project>/auth/v1`), also the access-token issuer. */
  readonly authUrl: string;
  readonly issuer: string;
  readonly jwksUrl: string;
  readonly publishableKey: string;
}

export interface AppConfig {
  readonly environment: Environment;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly database: { readonly url: string; readonly maxConnections: number };
  readonly supabase: SupabaseConfig;
  readonly trustProxyHops: number;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export class ConfigError extends Error {}

/**
 * Validates the environment once at startup and fails fast. Messages name the variable and the
 * problem only, never the value, because values include credentials.
 */
export function loadConfig(env: Readonly<Record<string, string | undefined>>): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new ConfigError(`Invalid configuration:\n  ${problems.join('\n  ')}`);
  }
  const parsed = result.data;
  const authUrl = `${parsed.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;
  return {
    environment: parsed.NODE_ENV,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    database: { url: parsed.DATABASE_URL, maxConnections: parsed.DATABASE_POOL_MAX },
    supabase: {
      authUrl,
      issuer: authUrl,
      jwksUrl: `${authUrl}/.well-known/jwks.json`,
      publishableKey: parsed.SUPABASE_PUBLISHABLE_KEY,
    },
    trustProxyHops: parsed.TRUST_PROXY_HOPS,
  };
}
