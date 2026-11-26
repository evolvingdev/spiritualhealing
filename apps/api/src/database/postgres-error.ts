/** SQLSTATE codes the repositories react to. */
export const PostgresErrorCode = {
  foreignKeyViolation: '23503',
} as const;

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

/** The SQLSTATE of a postgres-js error, also when Drizzle wraps it in `cause`. */
export function readPostgresCode(error: unknown): string | undefined {
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    const code: unknown = Reflect.get(current, 'code');
    if (typeof code === 'string' && SQLSTATE_PATTERN.test(code)) {
      return code;
    }
  }
  return undefined;
}
