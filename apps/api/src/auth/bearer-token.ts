/** Upper bound on accepted tokens; Supabase access tokens are far smaller. Stops oversized input early. */
export const MAX_ACCESS_TOKEN_LENGTH = 8192;

/** `Bearer` (any case, per RFC 7235) followed by a JWS in compact serialization. */
const BEARER_TOKEN_PATTERN = /^bearer ([\w-]+\.[\w-]+\.[\w-]+)$/i;

export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined || authorizationHeader.length > MAX_ACCESS_TOKEN_LENGTH) {
    return null;
  }
  return BEARER_TOKEN_PATTERN.exec(authorizationHeader)?.[1] ?? null;
}
