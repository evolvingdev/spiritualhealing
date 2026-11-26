import { z } from 'zod';

/**
 * Server-only configuration, validated on first use; the server fails fast on a missing or invalid
 * value. None of it is `NEXT_PUBLIC_`, so none of it can reach the browser bundle. Error messages
 * name the variable, never its value.
 */
const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** The public origin of this site, used to build redirect URLs for Supabase emails and OAuth. */
    SITE_URL: z.url({ protocol: /^https?$/ }),
    SUPABASE_URL: z.url({ protocol: /^https?$/ }),
    SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .min(1)
      .max(2048)
      .regex(/^[\w.-]+$/),
    /** Where the Next.js server reaches the API (server to server, never from the browser). */
    API_INTERNAL_URL: z.url({ protocol: /^https?$/ }),
    /** Shows "Continue with Google" once a Google OAuth client is configured in Supabase. */
    AUTH_GOOGLE_ENABLED: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }
    for (const key of ['SITE_URL', 'SUPABASE_URL'] as const) {
      if (!env[key].startsWith('https://')) {
        context.addIssue({ code: 'custom', path: [key], message: 'must use https in production' });
      }
    }
  });

export interface ServerEnv {
  readonly isProduction: boolean;
  readonly siteUrl: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly apiInternalUrl: string;
  readonly isGoogleSignInEnabled: boolean;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached !== undefined) {
    return cached;
  }
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new Error(`Invalid web configuration:\n  ${problems.join('\n  ')}`);
  }
  const env = result.data;
  cached = {
    isProduction: env.NODE_ENV === 'production',
    siteUrl: env.SITE_URL.replace(/\/+$/, ''),
    supabaseUrl: env.SUPABASE_URL.replace(/\/+$/, ''),
    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    apiInternalUrl: env.API_INTERNAL_URL.replace(/\/+$/, ''),
    isGoogleSignInEnabled: env.AUTH_GOOGLE_ENABLED === 'true',
  };
  return cached;
}
